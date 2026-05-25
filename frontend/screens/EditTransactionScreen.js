import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";

const CATEGORIES = ["food", "shopping", "transport", "bills", "health", "entertainment", "other"];
const TYPES = ["expense", "income"];

export default function EditTransactionScreen({ route, navigation }) {
  const { colors, t } = useApp();
  const { transactionId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sender_name: "", receiver_name: "", amount: "", bank_name: "",
    transaction_type: "expense", category: "other", note: "", transaction_date: "",
  });

  useEffect(() => { loadTx(); }, []);

  async function loadTx() {
    try {
      const res = await axios.get(`${API_BASE_URL}/transactions/${transactionId}`);
      const tx = res.data;
      setForm({
        sender_name: tx.sender_name || "",
        receiver_name: tx.receiver_name || "",
        amount: tx.amount != null ? String(tx.amount) : "",
        bank_name: tx.bank_name || "",
        transaction_type: tx.transaction_type || "expense",
        category: tx.category || "other",
        note: tx.note || "",
        transaction_date: tx.transaction_date ? tx.transaction_date.slice(0, 10) : "",
      });
    } catch {
      Alert.alert(t("error"), t("loadFailed"));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert(t("error"), t("invalidAmount"));
      return;
    }
    setSaving(true);
    try {
      await axios.patch(`${API_BASE_URL}/transactions/${transactionId}`, { ...form, amount });
      navigation.goBack();
    } catch {
      Alert.alert(t("error"), t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function set(field) {
    return (val) => setForm((p) => ({ ...p, [field]: val }));
  }

  const s = styles(colors);

  if (loading) return <ActivityIndicator style={s.center} size="large" color={colors.primary} />;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Field label={t("senderLabel")} value={form.sender_name} onChange={set("sender_name")} colors={colors} />
      <Field label={t("receiverLabel")} value={form.receiver_name} onChange={set("receiver_name")} colors={colors} />
      <Field label={t("amountLabel")} value={form.amount} onChange={set("amount")} keyboard="decimal-pad" colors={colors} />
      <Field label={t("bankLabel")} value={form.bank_name} onChange={set("bank_name")} colors={colors} />
      <Field label={t("dateLabel")} value={form.transaction_date} onChange={set("transaction_date")} colors={colors} />
      <Field label={t("noteLabel")} value={form.note} onChange={set("note")} multiline colors={colors} />

      <Text style={s.label}>{t("typeLabel")}</Text>
      <View style={s.chipRow}>
        {TYPES.map((tp) => (
          <Chip key={tp} label={tp === "expense" ? t("expense") : t("income")} active={form.transaction_type === tp} onPress={() => set("transaction_type")(tp)} colors={colors} />
        ))}
      </View>

      <Text style={s.label}>{t("categoryLabel")}</Text>
      <View style={s.chipRow}>
        {CATEGORIES.map((cat) => (
          <Chip key={cat} label={cat} active={form.category === cat} onPress={() => set("category")(cat)} colors={colors} />
        ))}
      </View>

      <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>{t("save")}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, value, onChange, keyboard, multiline, colors }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.subtext, marginBottom: 6 }}>{label}</Text>
      <TextInput
        style={{
          borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8,
          paddingHorizontal: 12, paddingVertical: 8, fontSize: 15,
          backgroundColor: colors.inputBg, color: colors.text,
          ...(multiline ? { height: 72, textAlignVertical: "top" } : {}),
        }}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard || "default"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        placeholderTextColor={colors.subtext}
      />
    </View>
  );
}

function Chip({ label, active, onPress, colors }) {
  return (
    <TouchableOpacity
      style={{
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.chipBorder,
        backgroundColor: active ? colors.primary : colors.chip,
      }}
      onPress={onPress}
    >
      <Text style={{ fontSize: 13, color: active ? "#fff" : colors.chipText, fontWeight: active ? "700" : "400" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center" },
  label: { fontSize: 14, fontWeight: "600", color: c.subtext, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  saveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
