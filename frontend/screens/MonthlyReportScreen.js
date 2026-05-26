import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";
import { exportMonthlyReport } from "../services/pdfExport";

const MONTH_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const MONTH_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function last12Months() {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });
}

export default function MonthlyReportScreen() {
  const { colors, t, language, user } = useApp();
  const months = last12Months();
  const [selectedMonth, setSelectedMonth] = useState(months[0]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => { loadStats(selectedMonth); }, [selectedMonth]);

  async function loadStats(month) {
    setLoading(true);
    setStats(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/transactions`, { params: { page: 1, page_size: 500 } });
      const monthTx = (res.data.results || []).filter((tx) => tx.transaction_date?.startsWith(month));
      const income = monthTx.filter((tx) => tx.transaction_type === "income").reduce((s, tx) => s + (tx.amount || 0), 0);
      const expense = monthTx.filter((tx) => tx.transaction_type !== "income").reduce((s, tx) => s + (tx.amount || 0), 0);
      const byCategory = {};
      monthTx.filter((tx) => tx.transaction_type !== "income").forEach((tx) => {
        byCategory[tx.category || "other"] = (byCategory[tx.category || "other"] || 0) + (tx.amount || 0);
      });
      setStats({ income, expense, net: income - expense, count: monthTx.length, byCategory, transactions: monthTx });
    } catch {
      Alert.alert(t("error"), t("loadFailed"));
    }
    setLoading(false);
  }

  async function handleExport() {
    if (!stats || stats.count === 0) { Alert.alert("", language === "th" ? "ไม่มีรายการในเดือนนี้" : "No transactions this month"); return; }
    setExporting(true);
    try {
      await exportMonthlyReport({ transactions: stats.transactions, month: selectedMonth, language, userName: user?.name ?? null });
    } catch {
      Alert.alert(t("error"), t("exportFail"));
    }
    setExporting(false);
  }

  function monthLabel(m) {
    const [, mm] = m.split("-");
    const names = language === "th" ? MONTH_TH : MONTH_EN;
    return `${names[parseInt(mm) - 1]} ${m.slice(0, 4)}`;
  }

  const s = styles(colors);
  const topCategories = stats ? Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5) : [];
  const maxCat = topCategories[0]?.[1] || 1;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("reportTitle")}</Text>

      {/* Month selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {months.map((m) => (
          <TouchableOpacity
            key={m}
            style={[s.monthChip, selectedMonth === m && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setSelectedMonth(m)}
          >
            <Text style={[s.monthChipText, selectedMonth === m && { color: "#fff" }]}>{monthLabel(m)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
      ) : stats ? (
        <>
          {/* Summary boxes */}
          <View style={s.summaryRow}>
            <View style={[s.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={s.boxLabel}>{t("income")}</Text>
              <Text style={[s.boxValue, { color: colors.success }]}>฿{stats.income.toFixed(0)}</Text>
            </View>
            <View style={[s.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={s.boxLabel}>{t("expense")}</Text>
              <Text style={[s.boxValue, { color: colors.danger }]}>฿{stats.expense.toFixed(0)}</Text>
            </View>
            <View style={[s.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={s.boxLabel}>{t("net")}</Text>
              <Text style={[s.boxValue, { color: stats.net >= 0 ? colors.success : colors.danger }]}>
                {stats.net >= 0 ? "+" : ""}฿{stats.net.toFixed(0)}
              </Text>
            </View>
          </View>

          {/* Category breakdown */}
          {topCategories.length > 0 && (
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={s.cardTitle}>{t("spendingByCategory")}</Text>
              {topCategories.map(([cat, amt]) => (
                <View key={cat} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: "600" }}>{cat}</Text>
                    <Text style={{ fontSize: 13, color: colors.danger }}>฿{amt.toFixed(0)}</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
                    <View style={{ width: `${(amt / maxCat) * 100}%`, height: 6, backgroundColor: colors.danger, borderRadius: 3 }} />
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={{ fontSize: 13, color: colors.subtext, textAlign: "center", marginBottom: 16 }}>
            {stats.count} {language === "th" ? "รายการ" : "transactions"}
          </Text>

          <TouchableOpacity
            style={[s.exportBtn, { backgroundColor: colors.primary }, exporting && { opacity: 0.6 }]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.exportBtnText}>📄  {t("reportGenerate")}</Text>}
          </TouchableOpacity>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 48 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 16 },
  monthChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, marginRight: 8 },
  monthChipText: { fontSize: 13, fontWeight: "600", color: c.text },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  box: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, alignItems: "center" },
  boxLabel: { fontSize: 11, color: c.subtext, marginBottom: 4 },
  boxValue: { fontSize: 16, fontWeight: "800" },
  card: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: c.text, marginBottom: 12 },
  exportBtn: { borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  exportBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
