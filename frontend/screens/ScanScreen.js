import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Image, Alert, ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { API_BASE_URL } from "../config";
import CategoryBadge from "../components/CategoryBadge";
import { useApp } from "../contexts/AppContext";

const BASE_URL = API_BASE_URL.replace("/api", "");

export default function ScanScreen({ navigation }) {
  const { colors, t } = useApp();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState(null);
  const timer = useRef(null);

  const STAGES = [t("stage0"), t("stage1"), t("stage2"), t("stage3")];

  useEffect(() => {
    axios.get(`${BASE_URL}/health`, { timeout: 10000 }).catch(() => {});
    return () => clearInterval(timer.current);
  }, []);

  function startTimer() {
    let i = 0;
    timer.current = setInterval(() => {
      i = Math.min(i + 1, STAGES.length - 1);
      setStage(i);
    }, 4000);
  }

  function stopTimer() {
    clearInterval(timer.current);
    setStage(0);
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert(t("error"), t("needLibrary"));
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5 });
    if (res.canceled) return;
    upload(res.assets[0].uri);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert(t("error"), t("needCamera"));
    const res = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (res.canceled) return;
    upload(res.assets[0].uri);
  }

  async function upload(uri) {
    setImage(uri);
    setResult(null);
    setLoading(true);
    startTimer();
    try {
      const form = new FormData();
      form.append("file", { uri, name: uri.split("/").pop(), type: "image/jpeg" });
      const res = await axios.post(`${API_BASE_URL}/slips/scan`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      setResult(res.data);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail ?? err?.message ?? "";
      let msg;
      if (status === 429 || detail.includes("429") || detail.includes("quota") || detail.includes("โควต้า")) {
        msg = t("rateLimited");
      } else if (err?.code === "ECONNABORTED" || detail.includes("timeout")) {
        msg = t("timeoutError");
      } else if (!status) {
        msg = t("noConnection");
      } else {
        msg = detail || t("scanFailed");
      }
      console.warn("Scan error", status, detail);
      Alert.alert(t("scanFailed"), msg);
    } finally {
      stopTimer();
      setLoading(false);
    }
  }

  const s = styles(colors);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("scanSlip")}</Text>

      <View style={s.btnRow}>
        <TouchableOpacity style={s.btn} onPress={takePhoto}>
          <Text style={s.btnText}>📷  {t("takePhoto")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={pickImage}>
          <Text style={[s.btnText, { color: colors.primary }]}>🖼️  {t("fromLibrary")}</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>{STAGES[stage]}</Text>
        </View>
      )}

      {image && !loading && <Image source={{ uri: image }} style={s.image} />}

      {result && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>{t("scanResult")}</Text>
            <CategoryBadge category={result.category || "other"} />
          </View>
          <Row label={t("sender")} value={result.sender_name || t("unspecified")} colors={colors} />
          <Row label={t("receiver")} value={result.receiver_name || t("unspecified")} colors={colors} />
          <Row label={t("amount")} value={`฿${result.amount?.toFixed(2) ?? "0.00"}`} colors={colors} highlight />
          <Row label={t("bank")} value={result.bank_name || t("unspecified")} colors={colors} />
          <Row label={t("date")} value={result.transaction_date ? result.transaction_date.slice(0, 10) : t("unspecified")} colors={colors} />
          <Row label={t("type")} value={result.transaction_type === "income" ? t("income") : t("expense")} colors={colors} />
          <Text style={s.hint}>{t("savedHint")}</Text>
          <TouchableOpacity style={s.editBtn} onPress={() => { navigation.navigate("EditTransaction", { transactionId: result.id }); setResult(null); setImage(null); }}>
            <Text style={s.editBtnText}>{t("editData")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value, highlight, colors }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ color: colors.subtext, fontSize: 14 }}>{label}</Text>
      <Text style={{ fontSize: highlight ? 16 : 14, fontWeight: "600", color: highlight ? colors.primary : colors.text }}>{value}</Text>
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 20 },
  btnRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  btn: { flex: 1, backgroundColor: c.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  btnOutline: { backgroundColor: c.bg, borderWidth: 1.5, borderColor: c.primary },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  loadingBox: { alignItems: "center", marginVertical: 24, gap: 10 },
  loadingText: { color: c.subtext, fontSize: 14 },
  image: { width: "100%", height: 240, borderRadius: 12, marginBottom: 16 },
  card: { backgroundColor: c.surface, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: c.text },
  hint: { marginTop: 14, color: c.subtext, fontSize: 12, textAlign: "center" },
  editBtn: { marginTop: 12, backgroundColor: c.chip, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  editBtnText: { color: c.primary, fontWeight: "700" },
});
