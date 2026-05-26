import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet, Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../contexts/AppContext";

const STORAGE_KEY = "savings_goals";

function ProgressBar({ percent, colors }) {
  const clamped = Math.min(percent, 100);
  const color = percent >= 100 ? colors.success : percent >= 70 ? colors.primary : "#f59e0b";
  return (
    <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: "hidden", marginTop: 8 }}>
      <View style={{ width: `${clamped}%`, height: "100%", backgroundColor: color, borderRadius: 5 }} />
    </View>
  );
}

export default function GoalsScreen() {
  const { colors, t } = useApp();
  const [goals, setGoals] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState({ name: "", target: "", saved: "", deadline: "" });

  useFocusEffect(useCallback(() => { loadGoals(); }, []));

  async function loadGoals() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setGoals(raw ? JSON.parse(raw) : []);
    } catch {}
  }

  async function saveGoals(updated) {
    setGoals(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  }

  function openNew() {
    setEditingGoal(null);
    setForm({ name: "", target: "", saved: "", deadline: "" });
    setModalVisible(true);
  }

  function openEdit(goal) {
    setEditingGoal(goal.id);
    setForm({ name: goal.name, target: String(goal.target), saved: String(goal.saved), deadline: goal.deadline || "" });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { Alert.alert(t("error"), t("goalNameRequired")); return; }
    const target = parseFloat(form.target);
    const saved = parseFloat(form.saved) || 0;
    if (isNaN(target) || target <= 0) { Alert.alert(t("error"), t("invalidAmount")); return; }

    if (editingGoal) {
      await saveGoals(goals.map((g) => g.id === editingGoal ? { ...g, name: form.name.trim(), target, saved, deadline: form.deadline } : g));
    } else {
      const newGoal = { id: Date.now().toString(), name: form.name.trim(), target, saved, deadline: form.deadline, createdAt: new Date().toISOString() };
      await saveGoals([...goals, newGoal]);
    }
    setModalVisible(false);
  }

  async function addSavings(goal) {
    Alert.prompt(
      t("addSavings"),
      `${t("currentSaved")}: ฿${goal.saved.toFixed(0)}`,
      async (text) => {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0) return;
        await saveGoals(goals.map((g) => g.id === goal.id ? { ...g, saved: Math.min(g.saved + amount, g.target) } : g));
      },
      "plain-text",
      "",
      "decimal-pad",
    );
  }

  async function deleteGoal(id) {
    Alert.alert(t("deleteTitle"), t("deleteGoalConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: async () => saveGoals(goals.filter((g) => g.id !== id)) },
    ]);
  }

  const s = styles(colors);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.heading}>{t("goalsTitle")}</Text>
        <Text style={s.subtitle}>{t("goalsSubtitle")}</Text>

        {goals.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🎯</Text>
            <Text style={{ color: colors.subtext, fontSize: 14, textAlign: "center" }}>{t("goalsEmpty")}</Text>
          </View>
        )}

        {goals.map((goal) => {
          const percent = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
          const done = percent >= 100;
          return (
            <View key={goal.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.goalName}>{done ? "✅ " : ""}{goal.name}</Text>
                  {goal.deadline ? <Text style={s.deadline}>🗓 {goal.deadline}</Text> : null}
                </View>
                <Text style={[s.percent, { color: done ? colors.success : colors.primary }]}>
                  {Math.round(percent)}%
                </Text>
              </View>

              <ProgressBar percent={percent} colors={colors} />

              <View style={s.amountRow}>
                <Text style={s.savedAmt}>฿{goal.saved.toFixed(0)} <Text style={{ color: colors.subtext }}>/ ฿{goal.target.toFixed(0)}</Text></Text>
                <Text style={[s.remaining, { color: done ? colors.success : colors.danger }]}>
                  {done ? t("goalAchieved") : `฿${(goal.target - goal.saved).toFixed(0)} ${t("goalLeft")}`}
                </Text>
              </View>

              <View style={s.actions}>
                {!done && (
                  <TouchableOpacity style={s.addBtn} onPress={() => addSavings(goal)}>
                    <Text style={s.addBtnText}>+ {t("addSavings")}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => openEdit(goal)}>
                  <Text style={s.editText}>{t("edit")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteGoal(goal.id)}>
                  <Text style={s.deleteText}>{t("delete")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={[s.fab, { backgroundColor: colors.primary }]} onPress={openNew}>
        <Text style={s.fabText}>+ {t("addGoal")}</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: colors.surface }]}>
            <Text style={s.modalTitle}>{editingGoal ? t("editGoal") : t("addGoal")}</Text>

            <Text style={s.fieldLabel}>{t("goalName")}</Text>
            <TextInput style={s.input} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} placeholder={t("goalNameHint")} placeholderTextColor={colors.subtext} />

            <Text style={s.fieldLabel}>{t("goalTarget")} (฿)</Text>
            <TextInput style={s.input} value={form.target} onChangeText={(v) => setForm((p) => ({ ...p, target: v }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.subtext} />

            <Text style={s.fieldLabel}>{t("currentSaved")} (฿)</Text>
            <TextInput style={s.input} value={form.saved} onChangeText={(v) => setForm((p) => ({ ...p, saved: v }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.subtext} />

            <Text style={s.fieldLabel}>{t("deadline")} (YYYY-MM-DD, {t("optional")})</Text>
            <TextInput style={s.input} value={form.deadline} onChangeText={(v) => setForm((p) => ({ ...p, deadline: v }))} placeholder="2026-12-31" placeholderTextColor={colors.subtext} />

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
  emptyBox: { alignItems: "center", paddingVertical: 48 },
  card: { backgroundColor: c.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  goalName: { fontSize: 16, fontWeight: "700", color: c.text },
  deadline: { fontSize: 12, color: c.subtext, marginTop: 2 },
  percent: { fontSize: 18, fontWeight: "800" },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  savedAmt: { fontSize: 14, fontWeight: "700", color: c.text },
  remaining: { fontSize: 12, fontWeight: "600" },
  actions: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 },
  addBtn: { flex: 1, backgroundColor: c.primary, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  editText: { color: c.primary, fontWeight: "600", fontSize: 13 },
  deleteText: { color: c.danger, fontWeight: "600", fontSize: 13 },
  fab: { position: "absolute", bottom: 24, right: 20, left: 20, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: c.text, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: c.subtext, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: c.inputBg, color: c.text, marginBottom: 14 },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
});
