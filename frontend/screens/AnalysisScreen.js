import React, { useEffect, useState } from "react";
import { View, Text, Button, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import AiTipCard from "../components/AiTipCard";
import SpendingChart from "../components/SpendingChart";

export default function AnalysisScreen() {
  const [summary, setSummary] = useState([]);
  const [tips, setTips] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysis();
  }, []);

  async function loadAnalysis() {
    try {
      const month = new Date().toISOString().slice(0, 7);
      const response = await axios.get(`${API_BASE_URL}/analysis/monthly`);
      setSummary(response.data.summary || []);
      const aiRes = await axios.post(`${API_BASE_URL}/analysis/ai-tips`, { month });
      setTips(aiRes.data.tips || "");
    } catch (error) {
      console.warn(error);
    } finally {
      setLoading(false);
    }
  }

  const thisMonth = summary.filter((item) => item.month === new Date().toISOString().slice(0, 7));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>วิเคราะห์การใช้จ่าย</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <>
          <SpendingChart data={thisMonth} />
          <AiTipCard tipText={tips || "ไม่มีคำแนะนำเพิ่มเติมในขณะนี้"} />
          <Button title="รีเฟรช" onPress={loadAnalysis} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
});
