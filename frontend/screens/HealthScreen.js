import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";

function ScoreCircle({ score, colors }) {
  const color = score >= 80 ? colors.success : score >= 50 ? "#f59e0b" : colors.danger;
  return (
    <View style={{ alignItems: "center", marginVertical: 24 }}>
      <View style={{
        width: 130, height: 130, borderRadius: 65,
        borderWidth: 8, borderColor: color,
        justifyContent: "center", alignItems: "center",
        backgroundColor: color + "18",
      }}>
        <Text style={{ fontSize: 44, fontWeight: "900", color }}>{score}</Text>
        <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>/100</Text>
      </View>
    </View>
  );
}

function ComponentBar({ label, value, max, color, colors }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ fontSize: 13, color: colors.text, fontWeight: "600" }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: "700", color }}>{value}/{max}</Text>
      </View>
      <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: 8, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

export default function HealthScreen() {
  const { colors, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const month = new Date().toISOString().slice(0, 7);
      const [analysisRes, budgetsRes, goalsRaw] = await Promise.all([
        axios.get(`${API_BASE_URL}/analysis/monthly`),
        axios.get(`${API_BASE_URL}/budgets`),
        AsyncStorage.getItem("savings_goals").catch(() => null),
      ]);

      const summary = analysisRes.data.summary || [];
      const thisMonth = summary.filter((r) => r.month === month);
      const income = thisMonth.filter((r) => r.transaction_type === "income").reduce((s, r) => s + Number(r.total), 0);
      const expense = thisMonth.filter((r) => r.transaction_type !== "income").reduce((s, r) => s + Number(r.total), 0);

      // Savings score (0-40)
      let savingsScore = 0;
      if (income > 0) {
        const savingsRate = Math.max(0, (income - expense) / income);
        savingsScore = Math.min(40, Math.round(savingsRate * 100));
      }

      // Budget score (0-30)
      const budgets = budgetsRes.data || [];
      let budgetScore = 0;
      if (budgets.length > 0) {
        const byCategory = {};
        thisMonth.filter((r) => r.transaction_type !== "income").forEach((r) => {
          byCategory[r.category] = (byCategory[r.category] || 0) + Number(r.total);
        });
        const withinBudget = budgets.filter((b) => (byCategory[b.category] || 0) <= b.amount).length;
        budgetScore = Math.round((withinBudget / budgets.length) * 30);
      } else {
        budgetScore = 15; // neutral if no budgets set
      }

      // Goals score (0-30)
      let goalsScore = 0;
      try {
        const goals = JSON.parse(goalsRaw || "[]");
        if (goals.length > 0) {
          goalsScore += 15;
          const hasGoodProgress = goals.some((g) => g.target > 0 && (g.saved || 0) / g.target >= 0.5);
          if (hasGoodProgress) goalsScore += 15;
        }
      } catch {}

      const total = savingsScore + budgetScore + goalsScore;

      setData({
        total, savingsScore, budgetScore, goalsScore,
        income, expense, hasBudgets: budgets.length > 0,
      });
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

  if (!data || (data.income === 0 && data.expense === 0)) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center", padding: 32 }]}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>📊</Text>
        <Text style={{ color: colors.subtext, fontSize: 15, textAlign: "center" }}>{t("healthNoData")}</Text>
      </View>
    );
  }

  const score = data.total;
  const tip = score >= 80 ? t("healthTipGreat") : score >= 60 ? t("healthTipGood") : score >= 40 ? t("healthTipFair") : t("healthTipPoor");
  const tipColor = score >= 80 ? colors.success : score >= 60 ? "#f59e0b" : score >= 40 ? "#f59e0b" : colors.danger;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("healthTitle")}</Text>

      <ScoreCircle score={score} colors={colors} />

      <View style={s.tipBox}>
        <Text style={[s.tipText, { color: tipColor }]}>{tip}</Text>
      </View>

      <View style={s.section}>
        <ComponentBar label={t("healthSavings")} value={data.savingsScore} max={40} color={colors.success} colors={colors} />
        <ComponentBar label={t("healthBudget")} value={data.budgetScore} max={30} color={colors.primary} colors={colors} />
        <ComponentBar label={t("healthGoals")} value={data.goalsScore} max={30} color="#f59e0b" colors={colors} />
      </View>

      <View style={s.summaryCard}>
        <View style={s.sumRow}>
          <Text style={s.sumLabel}>{t("income")}</Text>
          <Text style={[s.sumValue, { color: colors.success }]}>฿{data.income.toFixed(0)}</Text>
        </View>
        <View style={s.sumRow}>
          <Text style={s.sumLabel}>{t("expense")}</Text>
          <Text style={[s.sumValue, { color: colors.danger }]}>฿{data.expense.toFixed(0)}</Text>
        </View>
        <View style={s.sumRow}>
          <Text style={s.sumLabel}>{t("net")}</Text>
          <Text style={[s.sumValue, { color: data.income - data.expense >= 0 ? colors.success : colors.danger }]}>
            ฿{(data.income - data.expense).toFixed(0)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 4 },
  tipBox: {
    backgroundColor: c.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: c.border, marginBottom: 20, alignItems: "center",
  },
  tipText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  section: {
    backgroundColor: c.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: c.border, marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: c.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: c.border,
  },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  sumLabel: { fontSize: 13, color: c.subtext },
  sumValue: { fontSize: 14, fontWeight: "700" },
});
