import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ScrollView, Alert,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import AiTipCard from "../components/AiTipCard";
import SpendingChart from "../components/SpendingChart";
import { useApp } from "../contexts/AppContext";
import { exportMonthlyReport } from "../services/pdfExport";

export default function AnalysisScreen({ navigation }) {
  const { colors, t, language, user } = useApp();
  const [summary, setSummary] = useState([]);
  const [tips, setTips] = useState("");
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingTips, setLoadingTips] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    loadChart();
    loadTips();
  }, []);

  async function loadChart() {
    try {
      const res = await axios.get(`${API_BASE_URL}/analysis/monthly`);
      setSummary(res.data.summary || []);
    } catch {
    } finally {
      setLoadingChart(false);
    }
  }

  async function loadTips() {
    try {
      const month = new Date().toISOString().slice(0, 7);
      const res = await axios.post(`${API_BASE_URL}/analysis/ai-tips`, { month });
      setTips(res.data.tips || "");
    } catch {
    } finally {
      setLoadingTips(false);
    }
  }

  async function handleExportPDF() {
    setExportingPDF(true);
    try {
      const month = new Date().toISOString().slice(0, 7);
      const res = await axios.get(`${API_BASE_URL}/transactions`, { params: { page: 1, page_size: 500 } });
      const monthTx = (res.data.results || []).filter((tx) => tx.transaction_date?.startsWith(month));
      await exportMonthlyReport({ transactions: monthTx, month, language, userName: user?.name ?? null });
    } catch {
      Alert.alert(t("error"), t("exportFail"));
    } finally {
      setExportingPDF(false);
    }
  }

  async function refresh() {
    setLoadingChart(true);
    setLoadingTips(true);
    setSummary([]);
    setTips("");
    const month = new Date().toISOString().slice(0, 7);
    await axios.delete(`${API_BASE_URL}/analysis/ai-tips/${month}`).catch(() => {});
    loadChart();
    loadTips();
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonth = summary.filter((item) => item.month === currentMonth);

  // Build last 6 months trend data
  const trendMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toISOString().slice(0, 7);
  });

  const trendData = trendMonths.map((m) => {
    const rows = summary.filter((r) => r.month === m);
    const income = rows.filter((r) => r.transaction_type === "income").reduce((s, r) => s + r.total, 0);
    const expense = rows.filter((r) => r.transaction_type !== "income").reduce((s, r) => s + r.total, 0);
    return { month: m.slice(5), income, expense };
  });

  const s = styles(colors);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("analysisTitle")}</Text>

      {loadingChart ? (
        <ActivityIndicator size="large" color={colors.primary} style={s.loader} />
      ) : (
        <>
          <SpendingChart data={thisMonth} />

          {/* 6-month trend */}
          <Text style={s.sectionTitle}>{t("trend6months")}</Text>
          <View style={s.trendCard}>
            {trendData.map((row) => {
              const max = Math.max(...trendData.map((r) => Math.max(r.income, r.expense)), 1);
              return (
                <View key={row.month} style={s.trendCol}>
                  <View style={s.barGroup}>
                    <View style={[s.bar, { height: Math.max((row.income / max) * 80, 2), backgroundColor: colors.success }]} />
                    <View style={[s.bar, { height: Math.max((row.expense / max) * 80, 2), backgroundColor: colors.danger }]} />
                  </View>
                  <Text style={s.trendLabel}>{row.month}</Text>
                </View>
              );
            })}
          </View>
          <View style={s.legend}>
            <View style={[s.dot, { backgroundColor: colors.success }]} />
            <Text style={s.legendText}>{t("income")}</Text>
            <View style={[s.dot, { backgroundColor: colors.danger, marginLeft: 12 }]} />
            <Text style={s.legendText}>{t("expense")}</Text>
          </View>
        </>
      )}

      {loadingTips ? (
        <View style={s.tipsRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={s.tipsText}>{t("aiAnalyzing")}</Text>
        </View>
      ) : (
        <AiTipCard tipText={tips || t("noTips")} />
      )}

      <View style={s.actionRow}>
        <TouchableOpacity style={s.refreshBtn} onPress={refresh}>
          <Text style={s.refreshText}>{t("refresh")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.budgetBtn} onPress={() => navigation.navigate("Budget")}>
          <Text style={s.budgetBtnText}>💰 {t("budget")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.exportBtn, exportingPDF && { opacity: 0.6 }]}
          onPress={handleExportPDF}
          disabled={exportingPDF}
        >
          {exportingPDF
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={s.exportText}>📄</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: c.text, marginTop: 20, marginBottom: 10 },
  loader: { marginVertical: 40 },
  trendCard: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    backgroundColor: c.surface, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: c.border, height: 120,
  },
  trendCol: { flex: 1, alignItems: "center" },
  barGroup: { flexDirection: "row", gap: 2, alignItems: "flex-end", height: 80 },
  bar: { width: 8, borderRadius: 4 },
  trendLabel: { fontSize: 10, color: c.subtext, marginTop: 4 },
  legend: { flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: c.subtext, marginLeft: 4 },
  tipsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16 },
  tipsText: { color: c.subtext, fontSize: 14 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 20, justifyContent: "center" },
  refreshBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: c.primary },
  refreshText: { color: c.primary, fontWeight: "600" },
  budgetBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: c.primary },
  budgetBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  exportBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  exportText: { fontSize: 16 },
});
