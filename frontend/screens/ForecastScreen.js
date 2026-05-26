import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";

function StatBox({ label, value, color, colors }) {
  return (
    <View style={{
      flex: 1, backgroundColor: colors.surface, borderRadius: 12,
      padding: 14, alignItems: "center", borderWidth: 1, borderColor: colors.border,
    }}>
      <Text style={{ fontSize: 11, color: colors.subtext, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: "800", color: color || colors.text }}>{value}</Text>
    </View>
  );
}

function ProgressBar({ current, projected, income, colors }) {
  const cap = Math.max(income, projected, current, 1);
  const spentPct = Math.min(100, Math.round((current / cap) * 100));
  const projPct = Math.min(100, Math.round((projected / cap) * 100));
  const incomePct = Math.min(100, Math.round((income / cap) * 100));

  return (
    <View style={{ marginVertical: 16 }}>
      <View style={{ height: 14, backgroundColor: colors.border, borderRadius: 7, overflow: "hidden", marginBottom: 6 }}>
        <View style={{ position: "absolute", width: `${projPct}%`, height: 14, backgroundColor: projected > income ? colors.danger + "55" : colors.success + "55", borderRadius: 7 }} />
        <View style={{ position: "absolute", width: `${spentPct}%`, height: 14, backgroundColor: projected > income ? colors.danger : colors.primary, borderRadius: 7 }} />
        {income > 0 && (
          <View style={{ position: "absolute", left: `${incomePct}%`, width: 2, height: 14, backgroundColor: colors.success }} />
        )}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 10, color: colors.subtext }}>฿0</Text>
        {income > 0 && <Text style={{ fontSize: 10, color: colors.success }}>Income ฿{income.toFixed(0)}</Text>}
        <Text style={{ fontSize: 10, color: colors.subtext }}>฿{Math.round(cap).toFixed(0)}</Text>
      </View>
    </View>
  );
}

export default function ForecastScreen() {
  const { colors, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const now = new Date();
      const month = now.toISOString().slice(0, 7);
      const dayElapsed = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysLeft = daysInMonth - dayElapsed;

      const [txRes, analysisRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/transactions`, { params: { page_size: 500 } }),
        axios.get(`${API_BASE_URL}/analysis/monthly`),
      ]);

      const thisMonthTxs = (txRes.data.results || []).filter(
        (tx) => tx.transaction_date?.slice(0, 7) === month
      );
      const expense = thisMonthTxs
        .filter((tx) => tx.transaction_type !== "income")
        .reduce((s, tx) => s + (tx.amount || 0), 0);
      const income = thisMonthTxs
        .filter((tx) => tx.transaction_type === "income")
        .reduce((s, tx) => s + (tx.amount || 0), 0);

      const dailyAvg = dayElapsed > 0 ? expense / dayElapsed : 0;
      const projected = dailyAvg * daysInMonth;
      const diff = income - projected;

      setData({ expense, income, dailyAvg, projected, diff, dayElapsed, daysInMonth, daysLeft });
    } catch {}
    setLoading(false);
  }

  const s = styles(colors);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data || data.expense === 0) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center", padding: 32 }]}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>📈</Text>
        <Text style={{ color: colors.subtext, fontSize: 15, textAlign: "center" }}>{t("forecastNoData")}</Text>
      </View>
    );
  }

  const overBudget = data.income > 0 && data.projected > data.income;
  const statusColor = overBudget ? colors.danger : colors.success;
  const statusMsg = overBudget ? t("forecastOverBudget") : t("forecastOnTrack");

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("forecastScreenTitle")}</Text>
      <Text style={s.sub}>
        {t("date")} {data.dayElapsed} {t("forecastDayOf")} {data.daysInMonth} · {data.daysLeft} {t("forecastDaysLeft")}
      </Text>

      <ProgressBar
        current={data.expense}
        projected={data.projected}
        income={data.income}
        colors={colors}
      />

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <StatBox label={t("forecastThisMonth")} value={`฿${data.expense.toFixed(0)}`} color={colors.danger} colors={colors} />
        <StatBox label={t("forecastDailyAvg")} value={`฿${data.dailyAvg.toFixed(0)}`} color={colors.text} colors={colors} />
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <StatBox label={t("forecastProjected")} value={`฿${data.projected.toFixed(0)}`} color={overBudget ? colors.danger : colors.primary} colors={colors} />
        {data.income > 0 && (
          <StatBox label={t("forecastIncome")} value={`฿${data.income.toFixed(0)}`} color={colors.success} colors={colors} />
        )}
      </View>

      <View style={[s.statusBox, { borderColor: statusColor, backgroundColor: statusColor + "14" }]}>
        <Text style={[s.statusText, { color: statusColor }]}>{statusMsg}</Text>
        {data.income > 0 && (
          <Text style={[s.statusSub, { color: statusColor }]}>
            {overBudget ? t("forecastDeficit") : t("forecastSurplus")}: ฿{Math.abs(data.diff).toFixed(0)}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 4 },
  sub: { fontSize: 12, color: c.subtext, marginBottom: 8 },
  statusBox: {
    borderRadius: 12, padding: 16, borderWidth: 1.5, alignItems: "center",
  },
  statusText: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  statusSub: { fontSize: 13, marginTop: 4, fontWeight: "600" },
});
