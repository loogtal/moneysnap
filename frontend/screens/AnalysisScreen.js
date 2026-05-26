import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Alert } from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import AiTipCard from "../components/AiTipCard";
import SpendingChart from "../components/SpendingChart";
import { useApp } from "../contexts/AppContext";
import { exportMonthlyReport } from "../services/pdfExport";

export default function AnalysisScreen() {
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
      const res = await axios.get(`${API_BASE_URL}/transactions`, {
        params: { page: 1, page_size: 500 },
      });
      const allTx = res.data.results || [];
      const monthTx = allTx.filter((tx) => tx.transaction_date?.startsWith(month));
      await exportMonthlyReport({
        transactions: monthTx,
        month,
        language,
        userName: user?.name ?? null,
      });
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

  const thisMonth = summary.filter((item) => item.month === new Date().toISOString().slice(0, 7));
  const s = styles(colors);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("analysisTitle")}</Text>

      {loadingChart ? (
        <ActivityIndicator size="large" color={colors.primary} style={s.loader} />
      ) : (
        <SpendingChart data={thisMonth} />
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
        <TouchableOpacity
          style={[s.exportBtn, exportingPDF && { opacity: 0.6 }]}
          onPress={handleExportPDF}
          disabled={exportingPDF}
        >
          {exportingPDF ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={s.exportText}>📄 {t("exportPDF")}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 16 },
  loader: { marginVertical: 40 },
  tipsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16 },
  tipsText: { color: c.subtext, fontSize: 14 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 20, justifyContent: "center" },
  refreshBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: c.primary },
  refreshText: { color: c.primary, fontWeight: "600" },
  exportBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, minWidth: 52, alignItems: "center", justifyContent: "center" },
  exportText: { color: c.text, fontWeight: "600", fontSize: 13 },
});
