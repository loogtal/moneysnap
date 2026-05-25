import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { API_BASE_URL } from "../config";
import CategoryBadge from "../components/CategoryBadge";

const BASE_URL = API_BASE_URL.replace("/api", "");

const LOADING_STAGES = [
  "กำลังส่งรูป...",
  "กำลังวิเคราะห์สลิป...",
  "AI กำลังอ่านข้อมูล...",
  "เกือบเสร็จแล้ว...",
];

export default function ScanScreen({ navigation }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [result, setResult] = useState(null);
  const stageTimer = useRef(null);

  useEffect(() => {
    axios.get(`${BASE_URL}/health`, { timeout: 10000 }).catch(() => {});
  }, []);

  function startStageTimer() {
    let stage = 0;
    stageTimer.current = setInterval(() => {
      stage = Math.min(stage + 1, LOADING_STAGES.length - 1);
      setLoadingStage(stage);
    }, 4000);
  }

  function stopStageTimer() {
    clearInterval(stageTimer.current);
    setLoadingStage(0);
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("ต้องอนุญาตการเข้าถึงรูปภาพ");
    const picker = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5 });
    if (picker.canceled) return;
    const uri = picker.assets[0].uri;
    setImage(uri);
    setResult(null);
    await handleUpload(uri);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert("ต้องอนุญาตการเข้าถึงกล้อง");
    const picker = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (picker.canceled) return;
    const uri = picker.assets[0].uri;
    setImage(uri);
    setResult(null);
    await handleUpload(uri);
  }

  async function handleUpload(uri) {
    try {
      setLoading(true);
      setLoadingStage(0);
      startStageTimer();
      const fileName = uri.split("/").pop();
      const form = new FormData();
      form.append("file", { uri, name: fileName, type: "image/jpeg" });
      const response = await axios.post(`${API_BASE_URL}/slips/scan`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      setResult(response.data);
    } catch (error) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail || error?.message || "";
      let msg = "วิเคราะห์สลิปไม่สำเร็จ โปรดลองอีกครั้ง";
      if (status === 429 || detail.includes("429") || detail.includes("quota")) {
        msg = "AI ถูกใช้งานหนักเกินไป รอ 1 นาทีแล้วลองใหม่";
      } else if (error?.code === "ECONNABORTED" || detail.includes("timeout")) {
        msg = "เซิร์ฟเวอร์ใช้เวลานานเกินไป ลองอีกครั้ง (ครั้งถัดไปจะเร็วกว่านี้)";
      } else if (!status) {
        msg = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ต";
      }
      console.warn(error);
      Alert.alert("เกิดข้อผิดพลาด", msg);
    } finally {
      stopStageTimer();
      setLoading(false);
    }
  }

  function handleEdit() {
    navigation.navigate("EditTransaction", { transactionId: result.id });
    setResult(null);
    setImage(null);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>สแกนสลิปธนาคาร</Text>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.btn} onPress={takePhoto}>
          <Text style={styles.btnText}>ถ่ายรูปสลิป</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={pickImage}>
          <Text style={[styles.btnText, styles.btnTextOutline]}>เลือกจากคลัง</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2d6cdf" />
          <Text style={styles.loadingText}>{LOADING_STAGES[loadingStage]}</Text>
        </View>
      )}

      {image && !loading && <Image source={{ uri: image }} style={styles.image} />}

      {result && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>ผลการสแกน</Text>
            <CategoryBadge category={result.category || "other"} />
          </View>

          <Row label="ผู้ส่ง" value={result.sender_name || "ไม่ระบุ"} />
          <Row label="ผู้รับ" value={result.receiver_name || "ไม่ระบุ"} />
          <Row label="จำนวนเงิน" value={`฿${result.amount?.toFixed(2) ?? "0.00"}`} highlight />
          <Row label="ธนาคาร" value={result.bank_name || "ไม่ระบุ"} />
          <Row label="วันที่" value={result.transaction_date ? result.transaction_date.slice(0, 10) : "ไม่ระบุ"} />
          <Row label="ประเภท" value={result.transaction_type === "income" ? "รายรับ" : "รายจ่าย"} />

          <Text style={styles.hint}>ข้อมูลบันทึกแล้ว — กดแก้ไขหากไม่ถูกต้อง</Text>

          <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
            <Text style={styles.editBtnText}>แก้ไขข้อมูล</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value, highlight }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  buttonGroup: { flexDirection: "row", gap: 12, marginBottom: 20 },
  btn: { flex: 1, backgroundColor: "#2d6cdf", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  btnOutline: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#2d6cdf" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnTextOutline: { color: "#2d6cdf" },
  loadingBox: { alignItems: "center", marginVertical: 24, gap: 10 },
  loadingText: { color: "#555", fontSize: 14 },
  image: { width: "100%", height: 240, borderRadius: 12, marginBottom: 16 },
  card: { backgroundColor: "#f8f9ff", padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "#e0e7ff" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowLabel: { color: "#666", fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: "600", color: "#222" },
  rowValueHighlight: { color: "#2d6cdf", fontSize: 16 },
  hint: { marginTop: 14, color: "#888", fontSize: 12, textAlign: "center" },
  editBtn: { marginTop: 12, backgroundColor: "#f1f5f9", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  editBtnText: { color: "#2d6cdf", fontWeight: "700" },
});
