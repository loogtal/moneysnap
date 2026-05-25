import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import AiTipCard from "../components/AiTipCard";
import SpendingChart from "../components/SpendingChart";

export default function AnalysisScreen() {
  const [summary, setSummary] = useState([]);
  const [tips, setTips] = useState("");
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingTips, setLoadingTips] = useState(true);

  useEffect(() => {
    loadChart();
    loadTips();
  }, []);

  async function loadChart() {
    try {
      const response = await axios.get(`${API_BASE_URL}/analysis/monthly`);
      setSummary(response.data.summary || []);
    } catch (error) {
      console.warn(error);
    } finally {
      setLoadingChart(false);
    }
  }

  async function loadTips() {
    try {
      const month = new Date().toISOString().slice(0, 7);
      const aiRes = await axios.post(`${API_BASE_URL}/analysis/ai-tips`, { month });
      setTips(aiRes.data.tips || "");
    } catch (error) {
      console.warn(error);
    } finally {
      setLoadingTips(false);
    }
  }

  function handleRefresh() {
    setLoadingChart(true);
    setLoadingTips(true);
    setSummary([]);
    setTips("");
    loadChart();
    loadTips();
  }

  const thisMonth = summary.filter((item) => item.month === new Date().toISOString().slice(0, 7));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>วิเคราะห์การใช้จ่าย</Text>

      {loadingChart ? (
        <ActivityIndicator size="large" style={styles.chartLoader} />
      ) : (
        <SpendingChart data={thisMonth} />
      )}

      {loadingTips ? (
        <View style={styles.tipsLoader}>
          <ActivityIndicator size="small" color="#2d6cdf" />
          <Text style={styles.tipsLoaderText}>กำลังวิเคราะห์ด้วย AI...</Text>
        </View>
      ) : (
        <AiTipCard tipText={tips || "ไม่มีคำแนะนำเพิ่มเติมในขณะนี้"} />
      )}

      <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
        <Text style={styles.refreshText}>รีเฟรช</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  chartLoader: { marginVertical: 40 },
  tipsLoader: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16, paddingHorizontal: 4 },
  tipsLoaderText: { color: "#888", fontSize: 14 },
  refreshBtn: { marginTop: 20, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 28, borderRadius: 8, borderWidth: 1, borderColor: "#2d6cdf" },
  refreshText: { color: "#2d6cdf", fontWeight: "600" },
});
