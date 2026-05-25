import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import SpendingChart from "../components/SpendingChart";
import SlipCard from "../components/SlipCard";
import { useApp } from "../contexts/AppContext";

export default function HomeScreen({ navigation }) {
  const { colors, t } = useApp();
  const [summary, setSummary] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE_URL.replace("/api", "")}/health`, { timeout: 10000 }).catch(() => {});
    loadData();
  }, []);

  async function loadData() {
    try {
      const [s, tx] = await Promise.all([
        axios.get(`${API_BASE_URL}/analysis/monthly`),
        axios.get(`${API_BASE_URL}/transactions`, { params: { page_size: 5 } }),
      ]);
      setSummary(s.data.summary || []);
      setRecent(tx.data.results || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const thisMonth = summary.filter((item) => item.month === new Date().toISOString().slice(0, 7));
  const s = styles(colors);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("thisMonth")}</Text>

      <View style={s.grid}>
        {[
          { label: t("scan"), icon: "📷", screen: "Scan" },
          { label: t("transactions"), icon: "📋", screen: "Transactions" },
          { label: t("analysis"), icon: "📊", screen: "Analysis" },
          { label: t("importCSV"), icon: "📥", screen: "Import" },
        ].map(({ label, icon, screen }) => (
          <TouchableOpacity key={screen} style={s.gridBtn} onPress={() => navigation.navigate(screen)}>
            <Text style={s.gridIcon}>{icon}</Text>
            <Text style={s.gridLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={s.loader} />
      ) : (
        <>
          <SpendingChart data={thisMonth} />
          <Text style={s.subheading}>{t("recentTx")}</Text>
          {recent.length === 0 ? (
            <Text style={s.empty}>{t("noTransactions")}</Text>
          ) : (
            recent.map((item) => <SlipCard key={item.id} transaction={item} />)
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 16 },
  subheading: { fontSize: 18, fontWeight: "600", color: c.text, marginTop: 24, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  gridBtn: {
    width: "47%", backgroundColor: c.surface, borderRadius: 12, paddingVertical: 16,
    alignItems: "center", borderWidth: 1, borderColor: c.border,
  },
  gridIcon: { fontSize: 28, marginBottom: 6 },
  gridLabel: { fontSize: 13, fontWeight: "600", color: c.text },
  loader: { marginTop: 40 },
  empty: { color: c.subtext, fontSize: 15, marginTop: 12 },
});
