import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";

const CATEGORIES = ["food", "shopping", "transport", "bills", "health", "entertainment", "other"];
const TYPES = ["expense", "income"];

export default function EditTransactionScreen({ route, navigation }) {
  const { transactionId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sender_name: "",
    receiver_name: "",
    amount: "",
    bank_name: "",
    transaction_type: "expense",
    category: "other",
    note: "",
    transaction_date: "",
  });

  useEffect(() => {
    loadTransaction();
  }, []);

  async function loadTransaction() {
    try {
      const res = await axios.get(`${API_BASE_URL}/transactions/${transactionId}`);
      const t = res.data;
      setForm({
        sender_name: t.sender_name || "",
        receiver_name: t.receiver_name || "",
        amount: t.amount != null ? String(t.amount) : "",
        bank_name: t.bank_name || "",
        transaction_type: t.transaction_type || "expense",
        category: t.category || "other",
        note: t.note || "",
        transaction_date: t.transaction_date ? t.transaction_date.slice(0, 10) : "",
      });
    } catch {
      Alert.alert("ข้อผิดพลาด", "โหลดข้อมูลไม่สำเร็จ");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert("ข้อผิดพลาด", "กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }
    try {
      setSaving(true);
      await axios.patch(`${API_BASE_URL}/transactions/${transactionId}`, {
        ...form,
        amount,
      });
      navigation.goBack();
    } catch {
      Alert.alert("ข้อผิดพลาด", "บันทึกไม่สำเร็จ โปรดลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  function set(field) {
    return (value) => setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Field label="ผู้ส่ง" value={form.sender_name} onChangeText={set("sender_name")} />
      <Field label="ผู้รับ" value={form.receiver_name} onChangeText={set("receiver_name")} />
      <Field label="จำนวนเงิน (฿)" value={form.amount} onChangeText={set("amount")} keyboardType="decimal-pad" />
      <Field label="ธนาคาร" value={form.bank_name} onChangeText={set("bank_name")} />
      <Field label="วันที่ (YYYY-MM-DD)" value={form.transaction_date} onChangeText={set("transaction_date")} />
      <Field label="หมายเหตุ" value={form.note} onChangeText={set("note")} multiline />

      <Text style={styles.label}>ประเภท</Text>
      <View style={styles.chipRow}>
        {TYPES.map((t) => (
          <Chip key={t} label={t === "expense" ? "รายจ่าย" : "รายรับ"} active={form.transaction_type === t} onPress={() => set("transaction_type")(t)} />
        ))}
      </View>

      <Text style={styles.label}>หมวดหมู่</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} active={form.category === c} onPress={() => set("category")(c)} />
        ))}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>บันทึก</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, keyboardType, multiline }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || "default"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center" },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, backgroundColor: "#f9fafb" },
  multiline: { height: 72, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#f3f4f6" },
  chipActive: { backgroundColor: "#2d6cdf", borderColor: "#2d6cdf" },
  chipText: { fontSize: 13, color: "#555" },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  saveButton: { backgroundColor: "#2d6cdf", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
