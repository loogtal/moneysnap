import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ScrollView, Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";

const BANKS = [
  { name: "KBank (กสิกรไทย)", color: "#00A850" },
  { name: "SCB (ไทยพาณิชย์)", color: "#4B0082" },
  { name: "Bangkok Bank (BBL)", color: "#003087" },
  { name: "KTB (กรุงไทย)", color: "#009FDA" },
  { name: "TTB (ทหารไทยธนชาต)", color: "#F37021" },
];

export default function ImportScreen({ navigation }) {
  const { colors, t } = useApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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

      <View style={s.section}>
        <Text style={s.sectionLabel}>{t("supportedBanks")}</Text>
        {BANKS.map((b) => (
          <View key={b.name} style={s.bankRow}>
            <View style={[s.dot, { backgroundColor: b.color }]} />
            <Text style={s.bankName}>{b.name}</Text>
          </View>
        ))}
      </View>

      <View style={s.stepsWrap}>
        <Text style={s.sectionLabel}>{t("howTo")}</Text>
        <Step n="1" text="เปิดแอปธนาคาร → ไปที่ประวัติธุรกรรม" colors={colors} />
        <Step n="2" text="เลือกช่วงเวลาที่ต้องการ" colors={colors} />
        <Step n="3" text="กดส่งออก / Export → เลือก CSV" colors={colors} />
        <Step n="4" text="กลับมาที่นี่แล้วกดปุ่มด้านล่าง" colors={colors} />
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
            เพิ่ม {result.imported} รายการ{result.bank ? ` จาก ${result.bank}` : ""}
          </Text>
          <TouchableOpacity style={[s.viewBtn, { backgroundColor: colors.success }]} onPress={() => navigation.navigate("Transactions")}>
            <Text style={s.viewBtnText}>{t("viewAll")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Step({ n, text, colors }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 1 }}>
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{n}</Text>
      </View>
      <Text style={{ flex: 1, fontSize: 14, color: colors.text, lineHeight: 22 }}>{text}</Text>
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 20, paddingBottom: 48 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: c.subtext, lineHeight: 22, marginBottom: 24 },
  section: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: c.border },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: c.sectionLabel, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  bankRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  bankName: { fontSize: 14, color: c.text },
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
