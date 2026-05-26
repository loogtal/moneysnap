import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ScrollView, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";

const BANKS = [
  { id: "kbank",  nameTh: "KBank (กสิกรไทย)",       nameEn: "KBank (Kasikorn)",        color: "#00A850", emoji: "🟢" },
  { id: "scb",    nameTh: "SCB (ไทยพาณิชย์)",        nameEn: "SCB (Siam Commercial)",   color: "#4B0082", emoji: "🟣" },
  { id: "bbl",    nameTh: "BBL (กรุงเทพ)",            nameEn: "Bangkok Bank",            color: "#003087", emoji: "🔵" },
  { id: "ktb",    nameTh: "KTB (กรุงไทย)",            nameEn: "Krungthai Bank",          color: "#009FDA", emoji: "🔵" },
  { id: "bay",    nameTh: "BAY (กรุงศรี อยุธยา)",     nameEn: "Bank of Ayudhya",         color: "#FDB93E", emoji: "🟡" },
  { id: "ttb",    nameTh: "TTB (ทหารไทยธนชาต)",       nameEn: "TTB Bank",                color: "#F37021", emoji: "🟠" },
  { id: "cimb",   nameTh: "CIMB Thai",                nameEn: "CIMB Thai",               color: "#D22630", emoji: "🔴" },
  { id: "uob",    nameTh: "UOB (ยูโอบี)",              nameEn: "UOB Thailand",            color: "#1D2D80", emoji: "🔵" },
  { id: "gsb",    nameTh: "ออมสิน",                   nameEn: "GSB (Gov. Savings Bank)", color: "#E91E8C", emoji: "🩷" },
];

const BANK_STEPS = {
  kbank: {
    th: ["เปิด KBank App → กด 'บัญชี'", "กด 'ดูรายการเดินบัญชี'", "เลือกช่วงวันที่", "กด 'ส่งออก' → เลือก CSV"],
    en: ["Open KBank App → tap 'Account'", "Tap 'Statement'", "Select date range", "Tap 'Export' → choose CSV"],
  },
  scb: {
    th: ["เปิด SCB Easy → กด 'บัญชี'", "กด 'รายการเดินบัญชี'", "เลือกช่วงเวลา", "กด 'ดาวน์โหลด' → CSV"],
    en: ["Open SCB Easy → tap 'Account'", "Tap 'Transaction History'", "Select date range", "Tap 'Download' → CSV"],
  },
  default: {
    th: ["เปิดแอปธนาคาร → ไปที่ประวัติธุรกรรม", "เลือกช่วงเวลาที่ต้องการ", "กดส่งออก / Export → เลือก CSV", "กลับมาที่นี่แล้วกดปุ่มด้านล่าง"],
    en: ["Open bank app → go to Transaction History", "Select the date range", "Tap Export → select CSV", "Return here and tap the button below"],
  },
};

export default function ImportScreen({ navigation }) {
  const { colors, t, language } = useApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);

  const lang = language === "th" ? "th" : "en";

  const steps = selectedBank
    ? (BANK_STEPS[selectedBank.id] ?? BANK_STEPS.default)[lang]
    : BANK_STEPS.default[lang];

  async function pickAndImport() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["text/comma-separated-values", "text/csv", "application/csv", "*/*"],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      if (!asset.name.toLowerCase().endsWith(".csv")) {
        return Alert.alert(t("error"), t("wrongFile"));
      }
      setLoading(true);
      setResult(null);
      const form = new FormData();
      form.append("file", { uri: asset.uri, name: asset.name, type: "text/csv" });
      const res = await axios.post(`${API_BASE_URL}/transactions/import-csv`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      AsyncStorage.setItem("imported_once", "true").catch(() => {});
    } catch (err) {
      const msg = err?.response?.data?.detail || t("importFail");
      Alert.alert(t("importFail"), msg);
    } finally {
      setLoading(false);
    }
  }

  const s = styles(colors);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("importTitle")}</Text>
      <Text style={s.subtitle}>{t("importDesc")}</Text>

      {/* PromptPay note */}
      <View style={[s.promptPayBox, { borderColor: colors.primary + "55", backgroundColor: colors.primary + "0e" }]}>
        <Text style={s.promptPayIcon}>📲</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.promptPayTitle, { color: colors.primary }]}>{lang === "th" ? "สลิป PromptPay / QR" : "PromptPay / QR Slips"}</Text>
          <Text style={[s.promptPayText, { color: colors.subtext }]}>
            {lang === "th"
              ? "ใช้แท็บ สแกนสลิป เพื่อสแกนสลิปโอนเงิน PromptPay, QR Payment และสลิปธนาคารทุกชนิดด้วย AI"
              : "Use the Scan tab to scan PromptPay transfer slips, QR payments, and any bank slip with AI."}
          </Text>
        </View>
      </View>

      {/* Bank picker */}
      <Text style={s.sectionLabel}>{t("supportedBanks")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {BANKS.map((b) => {
          const active = selectedBank?.id === b.id;
          return (
            <TouchableOpacity
              key={b.id}
              style={[s.bankChip, active && { backgroundColor: b.color, borderColor: b.color }]}
              onPress={() => setSelectedBank(active ? null : b)}
            >
              <Text style={s.bankEmoji}>{b.emoji}</Text>
              <Text style={[s.bankChipText, active && { color: "#fff" }]}>{lang === "th" ? b.nameTh : b.nameEn}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Steps */}
      <View style={s.stepsWrap}>
        <Text style={s.sectionLabel}>{t("howTo")}{selectedBank ? ` — ${lang === "th" ? selectedBank.nameTh : selectedBank.nameEn}` : ""}</Text>
        {steps.map((step, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 1 }}>
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 14, color: colors.text, lineHeight: 22 }}>{step}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>{t("importing")}</Text>
        </View>
      ) : (
        <TouchableOpacity style={[s.importBtn, { backgroundColor: colors.primary }]} onPress={pickAndImport}>
          <Text style={s.importBtnText}>📂  {t("chooseFile")}</Text>
        </TouchableOpacity>
      )}

      {result && (
        <View style={s.resultCard}>
          <Text style={s.resultIcon}>✅</Text>
          <Text style={s.resultTitle}>{t("importSuccess")}</Text>
          <Text style={s.resultDetail}>
            {lang === "en"
              ? `Added ${result.imported} ${t("importedItems")}${result.bank ? ` from ${result.bank}` : ""}`
              : `เพิ่ม ${result.imported} รายการ${result.bank ? ` จาก ${result.bank}` : ""}`}
          </Text>
          <TouchableOpacity style={[s.viewBtn, { backgroundColor: colors.success }]} onPress={() => navigation.navigate("Transactions")}>
            <Text style={s.viewBtnText}>{t("viewAll")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 20, paddingBottom: 48 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: c.subtext, lineHeight: 22, marginBottom: 20 },
  promptPayBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 24,
  },
  promptPayIcon: { fontSize: 22, marginTop: 2 },
  promptPayTitle: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  promptPayText: { fontSize: 13, lineHeight: 20 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: c.sectionLabel, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  bankChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface,
  },
  bankEmoji: { fontSize: 14 },
  bankChipText: { fontSize: 13, fontWeight: "600", color: c.text },
  stepsWrap: { marginBottom: 28 },
  loadingBox: { alignItems: "center", paddingVertical: 24, gap: 12 },
  loadingText: { color: c.subtext, fontSize: 14 },
  importBtn: { borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  importBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resultCard: { marginTop: 24, backgroundColor: c.surface, borderRadius: 14, padding: 24, alignItems: "center", borderWidth: 1, borderColor: c.border },
  resultIcon: { fontSize: 40, marginBottom: 8 },
  resultTitle: { fontSize: 18, fontWeight: "700", color: c.success, marginBottom: 4 },
  resultDetail: { fontSize: 14, color: c.subtext, marginBottom: 16 },
  viewBtn: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 },
  viewBtnText: { color: "#fff", fontWeight: "700" },
});
