import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Alert, StyleSheet, Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../contexts/AppContext";

const DEBT_KEY = "debts";

function ProgressBar({ paid, total, colors }) {
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
  return (
    <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden", marginTop: 6 }}>
      <View style={{ width: `${pct}%`, height: "100%", backgroundColor: pct >= 100 ? colors.success : colors.primary, borderRadius: 3 }} />
    </View>
  );
}

export default function DebtScreen() {
  const { colors, t } = useApp();
  const [debts, setDebts] = useState([]);
  const [tab, setTab] = useState("lent");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ type: "lent", person: "", amount: "", paid: "", dueDate: "", note: "" });
  const [payModal, setPayModal] = useState(false);
  const [payDebtId, setPayDebtId] = useState(null);
  const [payInput, setPayInput] = useState("");

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const raw = await AsyncStorage.getItem(DEBT_KEY);
      setDebts(raw ? JSON.parse(raw) : []);
    } catch {}
  }

  async function saveDebts(updated) {
    setDebts(updated);
    await AsyncStorage.setItem(DEBT_KEY, JSON.stringify(updated)).catch(() => {});
  }

  function openNew() {
    setEditingId(null);
    setForm({ type: tab, person: "", amount: "", paid: "0", dueDate: "", note: "" });
    setModalVisible(true);
  }

  function openEdit(debt) {
    setEditingId(debt.id);
    setForm({ type: debt.type, person: debt.person, amount: String(debt.amount), paid: String(debt.paid), dueDate: debt.dueDate || "", note: debt.note || "" });
    setModalVisible(true);
  }

  async function handleSave() {
    const person = form.person.trim();
    if (!person) { Alert.alert(t("error"), t("personNameRequired")); return; }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { Alert.alert(t("error"), t("invalidAmount")); return; }
    const paid = parseFloat(form.paid) || 0;

    if (editingId) {
      await saveDebts(debts.map((d) => d.id === editingId ? { ...d, person, amount, paid, dueDate: form.dueDate, note: form.note, type: form.type } : d));
    } else {
      await saveDebts([...debts, { id: Date.now().toString(), type: form.type, person, amount, paid, dueDate: form.dueDate, note: form.note, createdAt: new Date().toISOString() }]);
    }
    setModalVisible(false);
  }

  function openPay(debt) {
    setPayDebtId(debt.id);
    setPayInput("");
    setPayModal(true);
  }

  async function confirmPay() {
    const amount = parseFloat(payInput);
    if (isNaN(amount) || amount <= 0) { Alert.alert(t("error"), t("invalidAmount")); return; }
    await saveDebts(debts.map((d) => d.id === payDebtId ? { ...d, paid: Math.min(d.paid + amount, d.amount) } : d));
    setPayModal(false);
  }

  async function deleteDebt(id) {
    Alert.alert(t("deleteTitle"), t("deleteDebtConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => saveDebts(debts.filter((d) => d.id !== id)) },
    ]);
  }

  const filtered = debts.filter((d) => d.type === tab);
  const totalLent = debts.filter((d) => d.type === "lent").reduce((s, d) => s + (d.amount - d.paid), 0);
  const totalBorrowed = debts.filter((d) => d.type === "borrowed").reduce((s, d) => s + (d.amount - d.paid), 0);
  const s = styles(colors);

  return (
    <View style={s.container}>
      {/* Summary row */}
      <View style={s.summaryRow}>
        <View style={[s.summaryBox, { backgroundColor: colors.surface }]}>
          <Text style={s.summaryLabel}>{t("totalLent")}</Text>
          <Text style={[s.summaryVal, { color: colors.success }]}>฿{totalLent.toFixed(0)}</Text>
        </View>
        <View style={[s.summaryBox, { backgroundColor: colors.surface }]}>
          <Text style={s.summaryLabel}>{t("totalBorrowed")}</Text>
          <Text style={[s.summaryVal, { color: colors.danger }]}>฿{totalBorrowed.toFixed(0)}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {["lent", "borrowed"].map((tp) => (
          <TouchableOpacity key={tp} style={[s.tab, tab === tp && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setTab(tp)}>
            <Text style={[s.tabText, tab === tp && { color: "#fff" }]}>{tp === "lent" ? t("lent") : t("borrowed")}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {filtered.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>{tab === "lent" ? "🤝" : "💸"}</Text>
            <Text style={{ color: colors.subtext, fontSize: 14, textAlign: "center" }}>{t("debtEmpty")}</Text>
          </View>
        )}

        {filtered.map((debt) => {
          const remaining = debt.amount - debt.paid;
          const done = remaining <= 0;
          return (
            <View key={debt.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.personName}>{debt.person}</Text>
                  {debt.dueDate ? <Text style={s.meta}>🗓 {debt.dueDate}</Text> : null}
                  {debt.note ? <Text style={s.meta}>📝 {debt.note}</Text> : null}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[s.debtAmount, { color: done ? colors.success : (tab === "lent" ? colors.success : colors.danger) }]}>
                    ฿{debt.amount.toFixed(0)}
                  </Text>
                  {!done && <Text style={{ fontSize: 11, color: colors.subtext }}>คงเหลือ ฿{remaining.toFixed(0)}</Text>}
                  {done && <Text style={{ fontSize: 11, color: colors.success, fontWeight: "700" }}>{t("debtPaid")}</Text>}
                </View>
              </View>

              <ProgressBar paid={debt.paid} total={debt.amount} colors={colors} />

              {!done && (
                <View style={s.actions}>
                  <TouchableOpacity style={[s.payBtn, { backgroundColor: colors.primary }]} onPress={() => openPay(debt)}>
                    <Text style={s.payBtnText}>+ {t("addPayment")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openEdit(debt)}>
                    <Text style={s.editText}>{t("edit")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteDebt(debt.id)}>
                    <Text style={s.deleteText}>{t("delete")}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {done && (
                <View style={s.actions}>
                  <TouchableOpacity onPress={() => deleteDebt(debt.id)}>
                    <Text style={s.deleteText}>{t("delete")}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={[s.fab, { backgroundColor: colors.primary }]} onPress={openNew}>
        <Text style={s.fabText}>+ {t("addDebt")}</Text>
      </TouchableOpacity>

      {/* Add Payment Modal */}
      <Modal visible={payModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: colors.surface }]}>
            <Text style={s.modalTitle}>{t("addPayment")}</Text>
            <Text style={s.fieldLabel}>{t("amount")} (฿)</Text>
            <TextInput style={s.input} value={payInput} onChangeText={setPayInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.subtext} autoFocus />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setPayModal(false)}>
                <Text style={{ color: colors.subtext, fontWeight: "600" }}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={confirmPay}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>{t("save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: colors.surface }]}>
            <Text style={s.modalTitle}>{editingId ? t("editDebt") : t("addDebt")}</Text>

            {/* Type selector */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {["lent", "borrowed"].map((tp) => (
                <TouchableOpacity key={tp}
                  style={[s.typeBtn, form.type === tp && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setForm((p) => ({ ...p, type: tp }))}>
                  <Text style={[{ fontSize: 13, fontWeight: "600", color: colors.chipText }, form.type === tp && { color: "#fff" }]}>
                    {tp === "lent" ? t("lent") : t("borrowed")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>{t("personName")}</Text>
            <TextInput style={s.input} value={form.person} onChangeText={(v) => setForm((p) => ({ ...p, person: v }))} placeholder={t("personNameHint")} placeholderTextColor={colors.subtext} />

            <Text style={s.fieldLabel}>{t("amount")} (฿)</Text>
            <TextInput style={s.input} value={form.amount} onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.subtext} />

            <Text style={s.fieldLabel}>{t("paidAmount")} (฿)</Text>
            <TextInput style={s.input} value={form.paid} onChangeText={(v) => setForm((p) => ({ ...p, paid: v }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.subtext} />

            <Text style={s.fieldLabel}>{t("dueDate")} (YYYY-MM-DD, {t("optional")})</Text>
            <TextInput style={s.input} value={form.dueDate} onChangeText={(v) => setForm((p) => ({ ...p, dueDate: v }))} placeholder="2026-12-31" placeholderTextColor={colors.subtext} />

            <Text style={s.fieldLabel}>{t("noteLabel")} ({t("optional")})</Text>
            <TextInput style={s.input} value={form.note} onChangeText={(v) => setForm((p) => ({ ...p, note: v }))} placeholder="" placeholderTextColor={colors.subtext} />

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
  summaryRow: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 0 },
  summaryBox: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 12, alignItems: "center" },
  summaryLabel: { fontSize: 11, color: c.subtext, marginBottom: 4 },
  summaryVal: { fontSize: 18, fontWeight: "800" },
  tabs: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: "center" },
  tabText: { fontSize: 13, fontWeight: "700", color: c.text },
  emptyBox: { alignItems: "center", paddingVertical: 48 },
  card: { backgroundColor: c.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  personName: { fontSize: 16, fontWeight: "700", color: c.text },
  meta: { fontSize: 12, color: c.subtext, marginTop: 2 },
  debtAmount: { fontSize: 17, fontWeight: "800" },
  actions: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
  payBtn: { flex: 1, borderRadius: 8, paddingVertical: 7, alignItems: "center" },
  payBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  editText: { color: c.primary, fontWeight: "600", fontSize: 13 },
  deleteText: { color: c.danger, fontWeight: "600", fontSize: 13 },
  fab: { position: "absolute", bottom: 24, right: 20, left: 20, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: c.text, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: c.subtext, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: c.inputBg, color: c.text, marginBottom: 14 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.chipBorder, backgroundColor: c.chip, alignItems: "center" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
});
