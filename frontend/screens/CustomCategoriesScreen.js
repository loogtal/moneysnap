import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Alert, StyleSheet, Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../contexts/AppContext";

export const CUSTOM_CATS_KEY = "custom_categories";

const DEFAULT_CATS = [
  { key: "food", emoji: "🍔" },
  { key: "shopping", emoji: "🛍️" },
  { key: "transport", emoji: "🚗" },
  { key: "bills", emoji: "💡" },
  { key: "health", emoji: "🏥" },
  { key: "entertainment", emoji: "🎬" },
  { key: "other", emoji: "📦" },
];

const EMOJI_OPTIONS = ["🐶","✈️","🏋️","🎓","💼","🏠","🎮","🍺","☕","🎁","💄","🌿","📚","🚴","🛒"];

export default function CustomCategoriesScreen() {
  const { colors, t } = useApp();
  const [customCats, setCustomCats] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("🏷️");

  useFocusEffect(useCallback(() => { loadCats(); }, []));

  async function loadCats() {
    try {
      const raw = await AsyncStorage.getItem(CUSTOM_CATS_KEY);
      setCustomCats(raw ? JSON.parse(raw) : []);
    } catch {}
  }

  async function saveCats(updated) {
    setCustomCats(updated);
    await AsyncStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(updated)).catch(() => {});
  }

  function openAdd() {
    setCatName("");
    setCatEmoji("🏷️");
    setModalVisible(true);
  }

  async function handleAdd() {
    const name = catName.trim();
    if (!name) { Alert.alert(t("error"), t("catNameRequired")); return; }
    const newCat = { id: Date.now().toString(), name, emoji: catEmoji, createdAt: new Date().toISOString() };
    await saveCats([...customCats, newCat]);
    setModalVisible(false);
  }

  async function deleteCustomCat(id) {
    Alert.alert(t("deleteTitle"), t("deleteCatConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: async () => saveCats(customCats.filter((c) => c.id !== id)) },
    ]);
  }

  const s = styles(colors);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.heading}>{t("customCatsTitle")}</Text>
        <Text style={s.subtitle}>{t("customCatsSubtitle")}</Text>

        <Text style={s.sectionLabel}>หมวดหมู่มาตรฐาน</Text>
        <View style={s.defaultGrid}>
          {DEFAULT_CATS.map((cat) => {
            const catKey = `cat${cat.key.charAt(0).toUpperCase()}${cat.key.slice(1)}`;
            return (
              <View key={cat.key} style={s.defaultChip}>
                <Text style={s.chipEmoji}>{cat.emoji}</Text>
                <Text style={s.chipName}>{t(catKey)}</Text>
              </View>
            );
          })}
        </View>

        {customCats.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>{t("customCats")}</Text>
            {customCats.map((cat) => (
              <View key={cat.id} style={s.customRow}>
                <Text style={s.rowEmoji}>{cat.emoji}</Text>
                <Text style={s.rowName}>{cat.name}</Text>
                <TouchableOpacity onPress={() => deleteCustomCat(cat.id)}>
                  <Text style={s.deleteText}>{t("delete")}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={[s.fab, { backgroundColor: colors.primary }]} onPress={openAdd}>
        <Text style={s.fabText}>+ {t("addCategory")}</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: colors.surface }]}>
            <Text style={s.modalTitle}>{t("addCategory")}</Text>

            <Text style={s.fieldLabel}>{t("goalName").replace("เป้าหมาย", "หมวดหมู่").replace("Goal ", "")}</Text>
            <TextInput
              style={s.input}
              value={catName}
              onChangeText={setCatName}
              placeholder={t("catNameHint")}
              placeholderTextColor={colors.subtext}
              autoFocus
            />

            <Text style={s.fieldLabel}>ไอคอน</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {["🏷️", ...EMOJI_OPTIONS].map((em) => (
                  <TouchableOpacity
                    key={em}
                    onPress={() => setCatEmoji(em)}
                    style={[s.emojiBtn, catEmoji === em && { borderColor: colors.primary, backgroundColor: colors.chip }]}
                  >
                    <Text style={{ fontSize: 22 }}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={{ color: colors.subtext, fontWeight: "600" }}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd}>
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
  sectionLabel: { fontSize: 12, fontWeight: "700", color: c.sectionLabel, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  defaultGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  defaultChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  chipEmoji: { fontSize: 16 },
  chipName: { fontSize: 13, color: c.text, fontWeight: "600" },
  customRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border,
    padding: 14, marginBottom: 8,
  },
  rowEmoji: { fontSize: 20, marginRight: 10 },
  rowName: { flex: 1, fontSize: 15, fontWeight: "600", color: c.text },
  deleteText: { color: c.danger, fontWeight: "600", fontSize: 13 },
  fab: { position: "absolute", bottom: 24, right: 20, left: 20, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: c.text, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: c.subtext, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: c.inputBg, color: c.text, marginBottom: 14 },
  emojiBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
});
