import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Button, ActivityIndicator, StyleSheet } from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import SpendingChart from "../components/SpendingChart";
import SlipCard from "../components/SlipCard";

export default function HomeScreen({ navigation }) {
  const [summary, setSummary] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE_URL.replace("/api", "")}/health`).catch(() => {});
    loadSummary();
  }, []);

  async function loadSummary() {
    try {
      const [summaryRes, txRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/analysis/monthly`),
        axios.get(`${API_BASE_URL}/transactions`, { params: { page_size: 5 } }),
      ]);
      setSummary(summaryRes.data.summary || []);
      setRecent(txRes.data.results || []);
    } catch (error) {
      console.warn(error);
    } finally {
      setLoading(false);
    }
  }

  const thisMonth = summary.filter((item) => item.month === new Date().toISOString().slice(0, 7));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>ภาพรวมเดือนนี้</Text>
      <View style={styles.buttons}>
        <Button title="สแกนสลิป" onPress={() => navigation.navigate("Scan")} />
        <Button title="ธุรกรรม" onPress={() => navigation.navigate("Transactions")} />
        <Button title="วิเคราะห์" onPress={() => navigation.navigate("Analysis")} />
        <Button title="นำเข้า CSV" onPress={() => navigation.navigate("Import")} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loading} />
      ) : (
        <>
          <SpendingChart data={thisMonth} />
          <Text style={styles.subheading}>ธุรกรรมล่าสุด</Text>
          {recent.length === 0 ? (
            <Text style={styles.empty}>ยังไม่มีธุรกรรม</Text>
          ) : (
            recent.map((item) => <SlipCard key={item.id} transaction={item} />)
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16 },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  subheading: { fontSize: 18, fontWeight: "600", marginTop: 24, marginBottom: 12 },
  buttons: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  loading: { marginTop: 32 },
  empty: { color: "#666", fontSize: 16, marginTop: 12 },
});
