import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Alert, StyleSheet, Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../contexts/AppContext";

export const RECURRING_KEY = "recurring_subs";

const EMOJI_LIST = ["💳","📱","🏠","🚗","💪","🎬","🎮","📚","☁️","🔒","🍕","✈️","🐶","💊","🎵","📺","⚡","💧","🌐","🏋️"];
const CATEGORIES = ["food","shopping","transport","bills","health","entertainment","other"];

function getNextDue(day) {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
  if (thisMonth >= now) return thisMonth;
  return new Date(now.getFullYear(), now.getMonth() + 1, day);
}

function daysUntil(date) {
  const diff = Math.ceil((date - new Date()) / 86400000);
  return diff;
}

export default function RecurringScreen() {
  const { colors, t } = useApp();
  const [items, setItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", amount: "", dayOfMonth: "1", emoji: "💳", category: "bills" });

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const raw = await AsyncStorage.getItem(RECURRING_KEY);
      setItems(raw ? JSON.parse(raw) : []);
    } catch {}
  }

  async function saveItems(updated) {
    setItems(updated);
    await AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(updated)).catch(() => {});
  }

  function openNew() {
    setEditingId(null);
    setForm({ name: "", amount: "", dayOfMonth: "1", emoji: "💳", category: "bills" });
    setModalVisible(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({ name: item.name, amount: String(item.amount), dayOfMonth: String(item.dayOfMonth), emoji: item.emoji, category: item.category });
    setModalVisible(true);
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) { Alert.alert(t("error"), t("recurringNameRequired")); return; }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { Alert.alert(t("error"), t("invalidAmount")); return; }
    const day = parseInt(form.dayOfMonth) || 1;
    const clamped = Math.min(Math.max(day, 1), 28);

    if (editingId) {
      await saveItems(items.map((i) => i.id === editingId ? { ...i, name, amount, dayOfMonth: clamped, emoji: form.emoji, category: form.category } : i));
    } else {
      await saveItems([...items, { id: Date.now().toString(), name, amount, dayOfMonth: clamped, emoji: form.emoji, category: form.category }]);
    }
    setModalVisible(false);
  }

  async function deleteItem(id) {
    Alert.alert(t("deleteTitle"), t("deleteRecurringConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => saveItems(items.filter((i) => i.id !== id)) },
    ]);
  }

  const totalMonthly = items.reduce((s, i) => s + i.amount, 0);
  const s = styles(colors);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.heading}>{t("recurringTitle")}</Text>
        <Text style={s.subtitle}>{t("recurringSubtitle")}</Text>

        {items.length > 0 && (
          <View style={s.totalCard}>
            <Text style={s.totalLabel}>{t("totalMonthly")}</Text>
            <Text style={[s.totalValue, { color: colors.danger }]}>฿{totalMonthly.toFixed(0)}</Text>
          </View>
        )}

        {items.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>💳</Text>
            <Text style={{ color: colors.subtext, fontSize: 14, textAlign: "center" }}>{t("recurringEmpty")}</Text>
          </View>
        )}

        {items.map((item) => {
          const nextDue = getNextDue(item.dayOfMonth);
          const days = daysUntil(nextDue);
          const urgent = days <= 3;
          return (
            <View key={item.id} style={s.card}>
              <View style={s.cardRow}>
                <Text style={s.emoji}>{item.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{item.name}</Text>
                  <Text style={s.dueLine}>
                    🗓 {t("dayOfMonth")} {item.dayOfMonth} — {days <= 0 ? t("dueToday") : `${days} ${t("daysLeft")}`}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[s.amount, { color: colors.danger }]}>฿{item.amount.toFixed(0)}</Text>
                  {urgent && <Text style={{ fontSize: 11, color: colors.danger, fontWeight: "700" }}>⚠️ ใกล้ครบ</Text>}
                </View>
              </View>
              <View style={s.actions}>
                <TouchableOpacity onPress={() => openEdit(item)}>
                  <Text style={s.editText}>{t("edit")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteItem(item.id)}>
                  <Text style={s.deleteText}>{t("delete")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={[s.fab, { backgroundColor: colors.primary }]} onPress={openNew}>
        <Text style={s.fabText}>+ {t("addRecurring")}</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: colors.surface }]}>
            <Text style={s.modalTitle}>{editingId ? t("editRecurring") : t("addRecurring")}</Text>

            <Text style={s.fieldLabel}>{t("recurringName")}</Text>
            <TextInput style={s.input} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} placeholder={t("recurringNameHint")} placeholderTextColor={colors.subtext} />

            <Text style={s.fieldLabel}>{t("amount")} (฿)</Text>
            <TextInput style={s.input} value={form.amount} onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.subtext} />

            <Text style={s.fieldLabel}>{t("recurringDay")} (1-28)</Text>
            <TextInput style={s.input} value={form.dayOfMonth} onChangeText={(v) => setForm((p) => ({ ...p, dayOfMonth: v }))} keyboardType="number-pad" placeholder="1" placeholderTextColor={colors.subtext} />

            <Text style={s.fieldLabel}>{t("icon")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {EMOJI_LIST.map((em) => (
                  <TouchableOpacity key={em} onPress={() => setForm((p) => ({ ...p, emoji: em }))}
                    style={[s.emojiBtn, form.emoji === em && { borderColor: colors.primary, backgroundColor: colors.chip }]}>
                    <Text style={{ fontSize: 20 }}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={{ color: colors.subtext, fontWeight: "600" }}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>{t("save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 100 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: c.subtext, marginBottom: 16 },
  totalCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14,
  },
  totalLabel: { fontSize: 13, fontWeight: "600", color: c.subtext },
  totalValue: { fontSize: 20, fontWeight: "800" },
  emptyBox: { alignItems: "center", paddingVertical: 48 },
  card: { backgroundColor: c.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  emoji: { fontSize: 28 },
  itemName: { fontSize: 15, fontWeight: "700", color: c.text },
  dueLine: { fontSize: 12, color: c.subtext, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 16, justifyContent: "flex-end", marginTop: 10, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
  editText: { color: c.primary, fontWeight: "600", fontSize: 13 },
  deleteText: { color: c.danger, fontWeight: "600", fontSize: 13 },
  fab: { position: "absolute", bottom: 24, right: 20, left: 20, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: c.text, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: c.subtext, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: c.inputBg, color: c.text, marginBottom: 14 },
  emojiBtn: { width: 40, height: 40, borderRadius: 8, borderWidth: 1.5, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
});
