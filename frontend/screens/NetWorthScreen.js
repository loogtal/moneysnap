import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Alert, StyleSheet, Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../contexts/AppContext";

const NW_KEY = "net_worth_items";

const ASSET_TYPES = [
  { key: "bank", emoji: "🏦", labelTh: "เงินฝากธนาคาร", labelEn: "Bank Account" },
  { key: "stock", emoji: "📈", labelTh: "หุ้น/กองทุน", labelEn: "Stocks/Funds" },
  { key: "property", emoji: "🏠", labelTh: "อสังหาริมทรัพย์", labelEn: "Property" },
  { key: "vehicle", emoji: "🚗", labelTh: "ยานพาหนะ", labelEn: "Vehicle" },
  { key: "crypto", emoji: "₿", labelTh: "คริปโต", labelEn: "Crypto" },
  { key: "other_asset", emoji: "💎", labelTh: "อื่นๆ", labelEn: "Other" },
];

const LIAB_TYPES = [
  { key: "home_loan", emoji: "🏠", labelTh: "สินเชื่อบ้าน", labelEn: "Home Loan" },
  { key: "car_loan", emoji: "🚗", labelTh: "สินเชื่อรถ", labelEn: "Car Loan" },
  { key: "credit_card", emoji: "💳", labelTh: "บัตรเครดิต", labelEn: "Credit Card" },
  { key: "personal_loan", emoji: "💸", labelTh: "สินเชื่อส่วนบุคคล", labelEn: "Personal Loan" },
  { key: "other_liab", emoji: "📋", labelTh: "หนี้อื่นๆ", labelEn: "Other Debt" },
];

function typeLabel(type, language) {
  const found = [...ASSET_TYPES, ...LIAB_TYPES].find((t) => t.key === type);
  if (!found) return type;
  return `${found.emoji} ${language === "en" ? found.labelEn : found.labelTh}`;
}

export default function NetWorthScreen() {
  const { colors, t, language } = useApp();
  const [items, setItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ category: "asset", type: "bank", name: "", amount: "" });
  const s = styles(colors);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const raw = await AsyncStorage.getItem(NW_KEY);
      setItems(raw ? JSON.parse(raw) : []);
    } catch {}
  }

  async function saveItems(updated) {
    setItems(updated);
    await AsyncStorage.setItem(NW_KEY, JSON.stringify(updated)).catch(() => {});
  }

  function openNew(category = "asset") {
    setEditingId(null);
    setForm({ category, type: category === "asset" ? "bank" : "home_loan", name: "", amount: "" });
    setModalVisible(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({ category: item.category, type: item.type, name: item.name, amount: String(item.amount) });
    setModalVisible(true);
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) { Alert.alert(t("error"), t("goalNameRequired")); return; }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 0) { Alert.alert(t("error"), t("invalidAmount")); return; }
    if (editingId) {
      await saveItems(items.map((i) => i.id === editingId ? { ...i, name, amount, type: form.type, category: form.category } : i));
    } else {
      await saveItems([...items, { id: Date.now().toString(), category: form.category, type: form.type, name, amount }]);
    }
    setModalVisible(false);
  }

  async function deleteItem(id) {
    Alert.alert(t("deleteTitle"), t("deleteGoalConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => saveItems(items.filter((i) => i.id !== id)) },
    ]);
  }

  const assets = items.filter((i) => i.category === "asset");
  const liabilities = items.filter((i) => i.category === "liability");
  const totalAssets = assets.reduce((s, i) => s + i.amount, 0);
  const totalLiab = liabilities.reduce((s, i) => s + i.amount, 0);
  const netWorth = totalAssets - totalLiab;

  const typeOptions = form.category === "asset" ? ASSET_TYPES : LIAB_TYPES;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.heading}>{t("netWorthTitle")}</Text>
        <Text style={s.subtitle}>{t("netWorthSubtitle")}</Text>

        {/* Net Worth Card */}
        <View style={s.nwCard}>
          <Text style={s.nwLabel}>{t("netWorth")}</Text>
          <Text style={[s.nwValue, { color: netWorth >= 0 ? colors.success : colors.danger }]}>
            {netWorth >= 0 ? "" : "-"}฿{Math.abs(netWorth).toLocaleString("th-TH")}
          </Text>
          <View style={s.nwRow}>
            <View style={{ alignItems: "center" }}>
              <Text style={[s.nwSub, { color: colors.success }]}>฿{totalAssets.toLocaleString("th-TH")}</Text>
              <Text style={s.nwSubLabel}>{t("assets")}</Text>
            </View>
            <Text style={{ color: colors.border, fontSize: 20 }}>—</Text>
            <View style={{ alignItems: "center" }}>
              <Text style={[s.nwSub, { color: colors.danger }]}>฿{totalLiab.toLocaleString("th-TH")}</Text>
              <Text style={s.nwSubLabel}>{t("liabilities")}</Text>
            </View>
          </View>
        </View>

        {/* Assets */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>{t("assets")}</Text>
          <TouchableOpacity onPress={() => openNew("asset")} style={[s.addMini, { borderColor: colors.primary }]}>
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>+ {t("add")}</Text>
          </TouchableOpacity>
        </View>
        {assets.length === 0 && <Text style={s.emptyLine}>{t("nwEmptyAssets")}</Text>}
        {assets.map((item) => (
          <View key={item.id} style={s.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.itemType}>{typeLabel(item.type, language)}</Text>
              <Text style={s.itemName}>{item.name}</Text>
            </View>
            <Text style={[s.itemAmount, { color: colors.success }]}>฿{item.amount.toLocaleString("th-TH")}</Text>
            <TouchableOpacity onPress={() => openEdit(item)} style={s.editBtn}>
              <Text style={{ color: colors.primary, fontSize: 13 }}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteItem(item.id)}>
              <Text style={{ color: colors.danger, fontSize: 13 }}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Liabilities */}
        <View style={[s.sectionHeader, { marginTop: 20 }]}>
          <Text style={s.sectionLabel}>{t("liabilities")}</Text>
          <TouchableOpacity onPress={() => openNew("liability")} style={[s.addMini, { borderColor: colors.danger }]}>
            <Text style={{ color: colors.danger, fontWeight: "700", fontSize: 13 }}>+ {t("add")}</Text>
          </TouchableOpacity>
        </View>
        {liabilities.length === 0 && <Text style={s.emptyLine}>{t("nwEmptyLiab")}</Text>}
        {liabilities.map((item) => (
          <View key={item.id} style={s.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.itemType}>{typeLabel(item.type, language)}</Text>
              <Text style={s.itemName}>{item.name}</Text>
            </View>
            <Text style={[s.itemAmount, { color: colors.danger }]}>฿{item.amount.toLocaleString("th-TH")}</Text>
            <TouchableOpacity onPress={() => openEdit(item)} style={s.editBtn}>
              <Text style={{ color: colors.primary, fontSize: 13 }}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteItem(item.id)}>
              <Text style={{ color: colors.danger, fontSize: 13 }}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: colors.surface }]}>
            <Text style={s.modalTitle}>{editingId ? t("edit") : t("add")} {form.category === "asset" ? t("assets") : t("liabilities")}</Text>

            <Text style={s.fieldLabel}>{t("type")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {typeOptions.map((opt) => (
                  <TouchableOpacity key={opt.key} onPress={() => setForm((p) => ({ ...p, type: opt.key }))}
                    style={[s.typeChip, form.type === opt.key && { borderColor: colors.primary, backgroundColor: colors.chip }]}>
                    <Text style={{ fontSize: 18 }}>{opt.emoji}</Text>
                    <Text style={{ fontSize: 11, color: colors.text, marginTop: 2 }}>{language === "en" ? opt.labelEn : opt.labelTh}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.fieldLabel}>{t("goalName")}</Text>
            <TextInput style={s.input} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} placeholder={language === "en" ? "e.g. SCB Savings" : "เช่น บัญชีออมทรัพย์ SCB"} placeholderTextColor={colors.subtext} />

            <Text style={s.fieldLabel}>{t("amount")} (฿)</Text>
            <TextInput style={s.input} value={form.amount} onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.subtext} />

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
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: c.subtext, marginBottom: 16 },
  nwCard: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 20, alignItems: "center", marginBottom: 24 },
  nwLabel: { fontSize: 13, color: c.subtext, marginBottom: 8, fontWeight: "600" },
  nwValue: { fontSize: 36, fontWeight: "900", marginBottom: 16 },
  nwRow: { flexDirection: "row", gap: 24, alignItems: "center" },
  nwSub: { fontSize: 18, fontWeight: "800" },
  nwSubLabel: { fontSize: 11, color: c.subtext, marginTop: 2 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: c.sectionLabel, textTransform: "uppercase", letterSpacing: 0.8 },
  addMini: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  emptyLine: { fontSize: 13, color: c.subtext, marginBottom: 8, paddingLeft: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 12, marginBottom: 8, gap: 8 },
  itemType: { fontSize: 12, color: c.subtext },
  itemName: { fontSize: 14, fontWeight: "700", color: c.text },
  itemAmount: { fontSize: 15, fontWeight: "800" },
  editBtn: { padding: 2 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: c.text, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: c.subtext, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: c.inputBg, color: c.text, marginBottom: 14 },
  typeChip: { borderWidth: 1.5, borderColor: c.border, borderRadius: 10, padding: 8, alignItems: "center", minWidth: 64 },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
});
