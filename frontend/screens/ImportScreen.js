import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import { API_BASE_URL } from "../config";

const BANKS = [
  { name: "KBank (กสิกรไทย)", color: "#00A850" },
  { name: "SCB (ไทยพาณิชย์)", color: "#4B0082" },
  { name: "Bangkok Bank (BBL)", color: "#003087" },
  { name: "KTB (กรุงไทย)", color: "#009FDA" },
  { name: "TTB (ทหารไทยธนชาต)", color: "#F37021" },
];

export default function ImportScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function pickAndImport() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "text/comma-separated-values",
        copyToCacheDirectory: true,
      });

      if (picked.canceled) return;

      const asset = picked.assets[0];
      if (!asset.name.toLowerCase().endsWith(".csv")) {
        return Alert.alert("ไฟล์ไม่ถูกต้อง", "กรุณาเลือกไฟล์ .csv จากแอปธนาคาร");
      }

      setLoading(true);
      setResult(null);

      const form = new FormData();
      form.append("file", {
        uri: asset.uri,
        name: asset.name,
        type: "text/csv",
      });

      const response = await axios.post(`${API_BASE_URL}/transactions/import-csv`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(response.data);
    } catch (error) {
      const msg = error?.response?.data?.detail || "เกิดข้อผิดพลาด โปรดลองอีกครั้ง";
      Alert.alert("นำเข้าไม่สำเร็จ", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>นำเข้า Statement ธนาคาร</Text>
      <Text style={styles.subtitle}>
        ดาวน์โหลดไฟล์ CSV จากแอปธนาคาร แล้วนำเข้าระบบเพื่อวิเคราะห์การใช้จ่ายอัตโนมัติ
      </Text>

      <View style={styles.bankList}>
        <Text style={styles.sectionLabel}>ธนาคารที่รองรับ</Text>
        {BANKS.map((b) => (
          <View key={b.name} style={styles.bankRow}>
            <View style={[styles.bankDot, { backgroundColor: b.color }]} />
            <Text style={styles.bankName}>{b.name}</Text>
          </View>
        ))}
      </View>

      <View style={styles.steps}>
        <Text style={styles.sectionLabel}>วิธีดาวน์โหลด Statement</Text>
        <Step n="1" text="เปิดแอปธนาคาร → ไปที่ประวัติธุรกรรม" />
        <Step n="2" text="เลือกช่วงเวลาที่ต้องการ" />
        <Step n="3" text="กดส่งออก / Export → เลือก CSV หรือ Excel" />
        <Step n="4" text="กลับมาที่นี่แล้วกดปุ่มด้านล่าง" />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2d6cdf" />
          <Text style={styles.loadingText}>กำลังวิเคราะห์ข้อมูล...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.importBtn} onPress={pickAndImport}>
          <Text style={styles.importBtnText}>เลือกไฟล์ CSV</Text>
        </TouchableOpacity>
      )}

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultIcon}>✓</Text>
          <Text style={styles.resultTitle}>นำเข้าสำเร็จ!</Text>
          <Text style={styles.resultDetail}>
            เพิ่ม {result.imported} รายการ{result.bank ? ` จาก ${result.bank}` : ""}
          </Text>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => navigation.navigate("Transactions")}
          >
            <Text style={styles.viewBtnText}>ดูธุรกรรมทั้งหมด</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Step({ n, text }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingBottom: 48 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#555", lineHeight: 22, marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 10 },
  bankList: { backgroundColor: "#f8f9ff", borderRadius: 12, padding: 16, marginBottom: 24 },
  bankRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  bankDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  bankName: { fontSize: 14, color: "#333" },
  steps: { marginBottom: 28 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#2d6cdf", alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 1 },
  stepNumText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepText: { flex: 1, fontSize: 14, color: "#333", lineHeight: 22 },
  importBtn: { backgroundColor: "#2d6cdf", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  importBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  loadingBox: { alignItems: "center", paddingVertical: 24, gap: 12 },
  loadingText: { color: "#555", fontSize: 14 },
  resultCard: { marginTop: 24, backgroundColor: "#f0fdf4", borderRadius: 14, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#bbf7d0" },
  resultIcon: { fontSize: 40, marginBottom: 8 },
  resultTitle: { fontSize: 18, fontWeight: "700", color: "#15803d", marginBottom: 4 },
  resultDetail: { fontSize: 14, color: "#555", marginBottom: 16 },
  viewBtn: { backgroundColor: "#15803d", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 },
  viewBtnText: { color: "#fff", fontWeight: "700" },
});
