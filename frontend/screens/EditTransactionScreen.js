import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";
import { CUSTOM_CATS_KEY } from "./CustomCategoriesScreen";

const CATEGORIES = ["food", "shopping", "transport", "bills", "health", "entertainment", "other"];
const CAT_KEY = {
  food: "catFood", shopping: "catShopping", transport: "catTransport",
  bills: "catBills", health: "catHealth", entertainment: "catEntertainment",
  other: "catOther",
};
const TYPES = ["expense", "income"];

export default function EditTransactionScreen({ route, navigation }) {
  const { colors, t } = useApp();
  const { transactionId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customCats, setCustomCats] = useState([]);
  const [form, setForm] = useState({
    sender_name: "", receiver_name: "", amount: "", bank_name: "",
    transaction_type: "expense", category: "other", note: "", transaction_date: "",
  });
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    loadTx();
    AsyncStorage.getItem(CUSTOM_CATS_KEY).then((raw) => {
      if (raw) setCustomCats(JSON.parse(raw));
    }).catch(() => {});
  }, []);

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
      setTags(tx.tags || []);
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
      await axios.patch(`${API_BASE_URL}/transactions/${transactionId}`, { ...form, amount, tags });
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
          <Chip key={cat} label={t(CAT_KEY[cat])} active={form.category === cat} onPress={() => set("category")(cat)} colors={colors} />
        ))}
        {customCats.map((cat) => (
          <Chip key={cat.id} label={`${cat.emoji} ${cat.name}`} active={form.category === cat.name} onPress={() => set("category")(cat.name)} colors={colors} />
        ))}
      </View>

      <Text style={s.label}>{t("tagsLabel")}</Text>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <TextInput
          style={[s.tagInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, flex: 1 }]}
          value={tagInput}
          onChangeText={setTagInput}
          placeholder={t("tagHint")}
          placeholderTextColor={colors.subtext}
          onSubmitEditing={() => {
            const v = tagInput.trim().replace(/^#/, "");
            if (v && !tags.includes(v)) setTags((p) => [...p, v]);
            setTagInput("");
          }}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}
          onPress={() => {
            const v = tagInput.trim().replace(/^#/, "");
            if (v && !tags.includes(v)) setTags((p) => [...p, v]);
            setTagInput("");
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>+</Text>
        </TouchableOpacity>
      </View>
      {tags.length > 0 && (
        <View style={s.chipRow}>
          {tags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, backgroundColor: colors.primary + "22", borderWidth: 1, borderColor: colors.primary, flexDirection: "row", alignItems: "center", gap: 4 }}
              onPress={() => setTags((p) => p.filter((t) => t !== tag))}
            >
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>#{tag}</Text>
              <Text style={{ fontSize: 12, color: colors.primary }}>✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
  tagInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
});
