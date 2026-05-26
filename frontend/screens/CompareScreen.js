import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";

function buildMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push(d.toISOString().slice(0, 7));
  }
  return opts;
}

const MONTHS = buildMonthOptions();

function pct(a, b) {
  if (b === 0) return null;
  return Math.round(((a - b) / b) * 100);
}

function DiffBadge({ a, b, invertGood = false }) {
  const diff = pct(a, b);
  if (diff === null) return null;
  const up = diff > 0;
  const good = invertGood ? !up : up;
  const color = good ? "#16a34a" : "#ef4444";
  return (
    <Text style={{ fontSize: 11, fontWeight: "700", color, marginLeft: 6 }}>
      {up ? "▲" : "▼"} {Math.abs(diff)}%
    </Text>
  );
}

function CompareRow({ label, valA, valB, colorA, colorB, invertGood }) {
  const { colors } = useApp();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ flex: 1, fontSize: 13, color: colors.subtext }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "700", color: colorA, width: 90, textAlign: "right" }}>฿{valA.toFixed(0)}</Text>
      <View style={{ width: 90, alignItems: "flex-end", flexDirection: "row", justifyContent: "flex-end" }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colorB }}>฿{valB.toFixed(0)}</Text>
        <DiffBadge a={valA} b={valB} invertGood={invertGood} />
      </View>
    </View>
  );
}

export default function CompareScreen() {
  const { colors, t, language } = useApp();
  const [monthA, setMonthA] = useState(MONTHS[0]);
  const [monthB, setMonthB] = useState(MONTHS[1]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function compare() {
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/analysis/monthly`);
      const summary = res.data.summary || [];

      function extract(month) {
        const rows = summary.filter((r) => r.month === month);
        const income = rows.filter((r) => r.transaction_type === "income").reduce((s, r) => s + Number(r.total), 0);
        const expense = rows.filter((r) => r.transaction_type !== "income").reduce((s, r) => s + Number(r.total), 0);
        const byCategory = {};
        rows.filter((r) => r.transaction_type !== "income").forEach((r) => {
          byCategory[r.category] = (byCategory[r.category] || 0) + Number(r.total);
        });
        return { income, expense, net: income - expense, byCategory };
      }

      setResult({ a: extract(monthA), b: extract(monthB) });
    } catch {}
    setLoading(false);
  }

  const dateLocale = language === "th" ? "th-TH" : "en-US";
  function fmt(m) {
    return new Date(m + "-01").toLocaleDateString(dateLocale, { year: "numeric", month: "short" });
  }

  const s = styles(colors);
  const allCats = result ? [...new Set([...Object.keys(result.a.byCategory), ...Object.keys(result.b.byCategory)])] : [];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("compareTitle")}</Text>

      {/* Month A picker */}
      <Text style={s.label}>{t("compareMonth1")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
        {MONTHS.map((m) => (
          <TouchableOpacity
            key={m} onPress={() => setMonthA(m)}
            style={[s.chip, monthA === m && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Text style={[s.chipText, monthA === m && { color: "#fff" }]}>{fmt(m)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Month B picker */}
      <Text style={s.label}>{t("compareMonth2")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
        {MONTHS.map((m) => (
          <TouchableOpacity
            key={m} onPress={() => setMonthB(m)}
            style={[s.chip, monthB === m && { backgroundColor: colors.success, borderColor: colors.success }]}
          >
            <Text style={[s.chipText, monthB === m && { color: "#fff" }]}>{fmt(m)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={s.compareBtn} onPress={compare} disabled={loading}>
        <Text style={s.compareBtnText}>{loading ? "..." : t("compareRun")}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}

      {result && (
        <>
          {/* Headers */}
          <View style={[s.headerRow, { marginTop: 20 }]}>
            <Text style={{ flex: 1 }} />
            <Text style={[s.colHeader, { color: colors.primary }]}>{fmt(monthA)}</Text>
            <Text style={[s.colHeader, { color: colors.success }]}>{fmt(monthB)}</Text>
          </View>

          <View style={s.card}>
            <CompareRow label={t("income")} valA={result.a.income} valB={result.b.income} colorA={colors.success} colorB={colors.success} invertGood={false} />
            <CompareRow label={t("expense")} valA={result.a.expense} valB={result.b.expense} colorA={colors.danger} colorB={colors.danger} invertGood={true} />
            <CompareRow
              label={t("net")}
              valA={result.a.net} valB={result.b.net}
              colorA={result.a.net >= 0 ? colors.success : colors.danger}
              colorB={result.b.net >= 0 ? colors.success : colors.danger}
              invertGood={false}
            />
          </View>

          {allCats.length > 0 && (
            <>
              <Text style={s.subheading}>{t("spendingByCategory")}</Text>
              <View style={s.card}>
                {allCats.map((cat) => (
                  <CompareRow
                    key={cat} label={cat}
                    valA={result.a.byCategory[cat] || 0}
                    valB={result.b.byCategory[cat] || 0}
                    colorA={colors.danger} colorB={colors.danger}
                    invertGood={true}
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", color: c.subtext, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  subheading: { fontSize: 15, fontWeight: "700", color: c.text, marginTop: 20, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
  },
  chipText: { fontSize: 12, fontWeight: "600", color: c.text },
  compareBtn: {
    backgroundColor: c.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center",
  },
  compareBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  headerRow: { flexDirection: "row", marginBottom: 4 },
  colHeader: { width: 90, textAlign: "right", fontSize: 11, fontWeight: "700" },
  card: {
    backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: c.border,
  },
});
