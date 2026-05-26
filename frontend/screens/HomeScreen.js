import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Image, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "../config";
import SpendingChart from "../components/SpendingChart";
import SlipCard from "../components/SlipCard";
import { useApp } from "../contexts/AppContext";

function Avatar({ uri, name, size, colors }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.primary, justifyContent: "center", alignItems: "center",
    }}>
      <Text style={{ color: "#fff", fontSize: size * 0.45, fontWeight: "700" }}>{initial}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors, t, user, privacyMode, togglePrivacy } = useApp();
  const [summary, setSummary] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayIncome, setTodayIncome] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);


  useEffect(() => {
    axios.get(`${API_BASE_URL.replace("/api", "")}/health`, { timeout: 10000 }).catch(() => {});
    loadData();
    checkBudgetAlert();
  }, []);

  async function loadData() {
    try {
      const [s, tx] = await Promise.all([
        axios.get(`${API_BASE_URL}/analysis/monthly`),
        axios.get(`${API_BASE_URL}/transactions`, { params: { page_size: 50 } }),
      ]);
      setSummary(s.data.summary || []);
      const all = tx.data.results || [];
      setRecent(all.slice(0, 5));
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayTxs = all.filter((tx) => tx.transaction_date?.slice(0, 10) === todayStr);
      setTodayIncome(todayTxs.filter((tx) => tx.transaction_type === "income").reduce((s, tx) => s + (tx.amount || 0), 0));
      setTodayExpense(todayTxs.filter((tx) => tx.transaction_type !== "income").reduce((s, tx) => s + (tx.amount || 0), 0));
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function checkBudgetAlert() {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const last = await AsyncStorage.getItem("last_budget_month").catch(() => null);
      if (last === currentMonth) return;
      await AsyncStorage.setItem("last_budget_month", currentMonth).catch(() => {});
      if (!last) return;

      const prevDate = new Date();
      prevDate.setMonth(prevDate.getMonth() - 1);
      const prevMonth = prevDate.toISOString().slice(0, 7);

      const [analysisRes, budgetsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/analysis/monthly`),
        axios.get(`${API_BASE_URL}/budgets`),
      ]);
      const budgets = budgetsRes.data || [];
      if (budgets.length === 0) return;

      const prevRows = (analysisRes.data.summary || []).filter((r) => r.month === prevMonth && r.transaction_type !== "income");
      const byCategory = {};
      prevRows.forEach((r) => { byCategory[r.category] = (byCategory[r.category] || 0) + r.total; });

      const lines = budgets.map((b) => {
        const spent = byCategory[b.category] || 0;
        const over = spent > b.amount;
        return `${b.category}: ฿${spent.toFixed(0)} / ฿${b.amount.toFixed(0)} ${over ? t("budgetAlertOver") : t("budgetAlertOk")}`;
      });
      if (lines.length > 0) {
        Alert.alert(t("budgetAlertTitle"), lines.join("\n"));
      }
    } catch {}
  }

  const thisMonth = summary.filter((item) => item.month === new Date().toISOString().slice(0, 7));
  const monthIncome = thisMonth.filter((r) => r.transaction_type === "income").reduce((s, r) => s + Number(r.total), 0);
  const monthExpense = thisMonth.filter((r) => r.transaction_type !== "income").reduce((s, r) => s + Number(r.total), 0);
  const monthNet = monthIncome - monthExpense;
  const s = styles(colors);

  const firstName = user?.name?.split(" ")[0] ?? "";
  const isGuest = !user || user.provider === "guest";

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Greeting row */}
      <View style={s.greetRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.greetText}>
            {t("greeting")}{firstName ? `, ${firstName}` : ""} 👋
          </Text>
          <Text style={s.greetSub}>{t("thisMonth")}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={togglePrivacy} style={{ padding: 6 }}>
            <Text style={{ fontSize: 20 }}>{privacyMode ? "🙈" : "👁"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
            <Avatar
              uri={isGuest ? null : user?.picture}
              name={user?.name ?? t("guest")}
              size={44}
              colors={colors}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Today overview */}
      {!loading && (todayIncome > 0 || todayExpense > 0) && (
        <View style={[s.todayCard, { backgroundColor: colors.primary }]}>
          <Text style={s.todayLabel}>{t("todayOverview")}</Text>
          <View style={s.todayRow}>
            {todayIncome > 0 && <Text style={s.todayNum}>{privacyMode ? "+฿••••" : `+฿${todayIncome.toFixed(0)}`}</Text>}
            {todayExpense > 0 && <Text style={[s.todayNum, { opacity: 0.8 }]}>{privacyMode ? "-฿••••" : `-฿${todayExpense.toFixed(0)}`}</Text>}
          </View>
        </View>
      )}

      {/* Monthly summary card */}
      {!loading && (monthIncome > 0 || monthExpense > 0) && (
        <View style={s.summaryCard}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t("income")}</Text>
            <Text style={[s.summaryValue, { color: colors.success }]}>{privacyMode ? "฿••••" : `฿${monthIncome.toFixed(0)}`}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t("expense")}</Text>
            <Text style={[s.summaryValue, { color: colors.danger }]}>{privacyMode ? "฿••••" : `฿${monthExpense.toFixed(0)}`}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t("net")}</Text>
            <Text style={[s.summaryValue, { color: monthNet >= 0 ? colors.success : colors.danger }]}>
              {privacyMode ? "฿••••" : `${monthNet >= 0 ? "+" : ""}฿${monthNet.toFixed(0)}`}
            </Text>
          </View>
        </View>
      )}

      <View style={s.grid}>
        {[
          { label: t("quickAdd"), icon: "✍️", screen: "QuickAdd" },
          { label: t("scan"), icon: "📷", screen: "Scan" },
          { label: t("transactions"), icon: "📋", screen: "Transactions" },
          { label: t("analysis"), icon: "📊", screen: "Analysis" },
          { label: t("budget"), icon: "💰", screen: "Budget" },
          { label: t("importCSV"), icon: "📥", screen: "Import" },
          { label: t("goals"), icon: "🎯", screen: "Goals" },
          { label: t("recurring"), icon: "🔄", screen: "Recurring" },
          { label: t("debts"), icon: "🤝", screen: "Debts" },
          { label: t("calendar"), icon: "📅", screen: "Calendar" },
          { label: t("chat"), icon: "🤖", screen: "Chat" },
          { label: t("accounts"), icon: "🏦", screen: "Accounts" },
          { label: t("report"), icon: "📊", screen: "MonthlyReport" },
          { label: t("merchants"), icon: "🏪", screen: "Merchants" },
          { label: t("health"), icon: "💪", screen: "Health" },
          { label: t("forecast"), icon: "🔮", screen: "Forecast" },
          { label: t("compare"), icon: "⚖️", screen: "Compare" },
        ].map(({ label, icon, screen }) => (
          <TouchableOpacity
            key={screen}
            style={s.gridBtn}
            onPress={() => navigation.navigate(screen)}
          >
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
  greetRow: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 20,
  },
  greetText: { fontSize: 22, fontWeight: "800", color: c.text },
  greetSub: { fontSize: 13, color: c.subtext, marginTop: 2 },
  subheading: { fontSize: 18, fontWeight: "600", color: c.text, marginTop: 24, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  gridBtn: {
    width: "31%", backgroundColor: c.surface, borderRadius: 12, paddingVertical: 14,
    alignItems: "center", borderWidth: 1, borderColor: c.border,
  },
  gridIcon: { fontSize: 26, marginBottom: 6 },
  gridLabel: { fontSize: 12, fontWeight: "600", color: c.text, textAlign: "center" },
  loader: { marginTop: 40 },
  empty: { color: c.subtext, fontSize: 15, marginTop: 12 },
  summaryCard: {
    flexDirection: "row", backgroundColor: c.surface, borderRadius: 14,
    borderWidth: 1, borderColor: c.border, marginBottom: 16, padding: 14,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 11, color: c.subtext, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: "800" },
  summaryDivider: { width: 1, backgroundColor: c.border, marginVertical: 4 },
  todayCard: { borderRadius: 12, padding: 14, marginBottom: 12 },
  todayLabel: { fontSize: 11, fontWeight: "700", color: "#ffffff99", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  todayRow: { flexDirection: "row", gap: 16 },
  todayNum: { fontSize: 20, fontWeight: "800", color: "#fff" },
});
