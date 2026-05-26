import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";

const CATEGORIES = ["food", "shopping", "transport", "bills", "health", "entertainment", "other"];

const CAT_ICONS = {
  food: "🍜", shopping: "🛍️", transport: "🚗",
  bills: "💡", health: "🏥", entertainment: "🎬", other: "📌",
};

export default function QuickAddScreen({ navigation }) {
  const { colors, t } = useApp();
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [receiver, setReceiver] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const s = styles(colors);

  async function save() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return Alert.alert(t("error"), t("invalidAmount"));
    setSaving(true);
    try {
      await axios.post(`${API_BASE_URL}/transactions`, {
        amount: amt,
        transaction_type: type,
        category: type === "income" ? "other" : category,
        receiver_name: receiver.trim() || null,
        transaction_date: date,
        note: note.trim() || null,
      });
      navigation.goBack();
    } catch {
      Alert.alert(t("error"), t("saveFailed"));
    }
    setSaving(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.heading}>{t("quickAddTitle")}</Text>

        {/* Income / Expense toggle */}
        <View style={s.typeRow}>
          {["expense", "income"].map((tp) => (
            <TouchableOpacity
              key={tp}
              style={[s.typeBtn, type === tp && { backgroundColor: tp === "income" ? colors.success : colors.danger }]}
              onPress={() => setType(tp)}
            >
              <Text style={[s.typeBtnText, type === tp && { color: "#fff" }]}>
                {tp === "income" ? t("income") : t("expense")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <Text style={s.label}>{t("quickAddAmount")}</Text>
        <TextInput
          style={s.amountInput}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.subtext}
        />

        {/* Category (only for expense) */}
        {type === "expense" && (
          <>
            <Text style={s.label}>{t("categoryLabel")}</Text>
            <View style={s.catGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.catChip, category === cat && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={s.catIcon}>{CAT_ICONS[cat]}</Text>
                  <Text style={[s.catLabel, category === cat && { color: "#fff" }]}>{t(`cat${cat.charAt(0).toUpperCase() + cat.slice(1)}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Receiver */}
        <Text style={s.label}>{t("receiverLabel")}</Text>
        <TextInput
          style={s.input}
          value={receiver}
          onChangeText={setReceiver}
          placeholder={t("quickAddReceiver")}
          placeholderTextColor={colors.subtext}
        />

        {/* Date */}
        <Text style={s.label}>{t("dateLabel")}</Text>
        <TextInput
          style={s.input}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.subtext}
        />

        {/* Note */}
        <Text style={s.label}>{t("noteLabel")}</Text>
        <TextInput
          style={[s.input, { minHeight: 56, textAlignVertical: "top" }]}
          value={note}
          onChangeText={setNote}
          placeholder={t("quickAddNotePlaceholder")}
          placeholderTextColor={colors.subtext}
          multiline
        />

        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: type === "income" ? colors.success : colors.primary }]}
          onPress={save}
          disabled={saving}
        >
          <Text style={s.saveBtnText}>{saving ? "..." : `${t("save")} ${amount ? "฿" + parseFloat(amount || 0).toFixed(2) : ""}`}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 20 },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5,
    borderColor: c.border, alignItems: "center",
  },
  typeBtnText: { fontSize: 15, fontWeight: "700", color: c.text },
  label: { fontSize: 13, fontWeight: "600", color: c.subtext, marginBottom: 6, marginTop: 12 },
  amountInput: {
    fontSize: 32, fontWeight: "900", color: c.text, textAlign: "center",
    backgroundColor: c.surface, borderRadius: 12, paddingVertical: 16,
    borderWidth: 1, borderColor: c.border, marginBottom: 4,
  },
  input: {
    backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: c.text,
  },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface,
  },
  catIcon: { fontSize: 14 },
  catLabel: { fontSize: 12, fontWeight: "600", color: c.text },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
