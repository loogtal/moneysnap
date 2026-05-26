import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";

const CAT_ICONS = {
  food: "🍔", shopping: "🛍️", transport: "🚗",
  bills: "💡", health: "🏥", entertainment: "🎬", other: "📦",
};

function ProgressBar({ percent, colors }) {
  const clamped = Math.min(percent, 100);
  const barColor =
    percent >= 90 ? colors.danger :
    percent >= 70 ? "#f59e0b" :
    colors.success;
  return (
    <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
      <View style={{ width: `${clamped}%`, height: "100%", backgroundColor: barColor, borderRadius: 4 }} />
    </View>
  );
}

export default function BudgetScreen() {
  const { colors, t } = useApp();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { loadBudgets(); }, []));

  async function loadBudgets() {
    try {
      const res = await axios.get(`${API_BASE_URL}/budgets`);
      setBudgets(res.data.budgets || []);
    } catch {
      Alert.alert(t("error"), t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item) {
    setEditing(item.category);
    setInputValue(item.budget != null ? String(item.budget) : "");
  }

  function cancelEdit() {
    setEditing(null);
    setInputValue("");
  }

  async function saveBudget(category) {
    const amount = parseFloat(inputValue);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t("error"), t("invalidAmount"));
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}/budgets/${category}`, { amount });
      await loadBudgets();
      setEditing(null);
      setInputValue("");
    } catch {
      Alert.alert(t("error"), t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteBudget(category) {
    try {
      await axios.delete(`${API_BASE_URL}/budgets/${category}`);
      setBudgets((prev) => prev.map((b) => b.category === category ? { ...b, budget: null, percent: 0 } : b));
    } catch {
      Alert.alert(t("error"), t("deleteFailed"));
    }
  }

  const s = styles(colors);

  if (loading) {
    return <ActivityIndicator style={s.center} size="large" color={colors.primary} />;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("budgetTitle")}</Text>
      <Text style={s.subtitle}>{t("budgetSubtitle")}</Text>

      {budgets.map((item) => {
        const isEditing = editing === item.category;
        const hasBudget = item.budget != null;
        const catKey = `cat${item.category.charAt(0).toUpperCase()}${item.category.slice(1)}`;

        return (
          <View key={item.category} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.catIcon}>{CAT_ICONS[item.category] ?? "📦"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.catName}>{t(catKey)}</Text>
                <Text style={s.spentText}>
                  {t("spent")}: ฿{item.spent.toFixed(0)}
                  {hasBudget ? ` / ฿${item.budget.toFixed(0)}` : ""}
                </Text>
              </View>
              {hasBudget && (
                <Text style={[
                  s.percentBadge,
                  { color: item.percent >= 90 ? colors.danger : item.percent >= 70 ? "#f59e0b" : colors.success }
                ]}>
                  {item.percent}%
                </Text>
              )}
            </View>

            {hasBudget && <ProgressBar percent={item.percent} colors={colors} />}

            {isEditing ? (
              <View style={s.editRow}>
                <TextInput
                  style={s.input}
                  value={inputValue}
                  onChangeText={setInputValue}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={colors.subtext}
                  autoFocus
                />
                <TouchableOpacity
                  style={[s.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={() => saveBudget(item.category)}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.saveBtnText}>{t("save")}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={cancelEdit}>
                  <Text style={s.cancelBtnText}>{t("cancel")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.actionRow}>
                <TouchableOpacity style={s.editBtn} onPress={() => startEdit(item)}>
                  <Text style={s.editBtnText}>{hasBudget ? t("edit") : t("setBudget")}</Text>
                </TouchableOpacity>
                {hasBudget && (
                  <TouchableOpacity onPress={() => deleteBudget(item.category)}>
                    <Text style={s.deleteBtnText}>{t("delete")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center" },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: c.subtext, marginBottom: 16 },
  card: {
    backgroundColor: c.card, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: c.border,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  catIcon: { fontSize: 22 },
  catName: { fontSize: 15, fontWeight: "700", color: c.text },
  spentText: { fontSize: 12, color: c.subtext, marginTop: 2 },
  percentBadge: { fontSize: 13, fontWeight: "700" },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  input: {
    flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: c.inputBorder,
    backgroundColor: c.inputBg, paddingHorizontal: 10, fontSize: 14, color: c.text,
  },
  saveBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: c.primary, alignItems: "center", justifyContent: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  cancelBtn: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: c.border,
  },
  cancelBtnText: { color: c.subtext, fontSize: 13 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 10, justifyContent: "flex-end" },
  editBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: c.primary },
  editBtnText: { color: c.primary, fontWeight: "600", fontSize: 13 },
  deleteBtnText: { color: c.danger, fontWeight: "600", fontSize: 13, paddingVertical: 6 },
});
