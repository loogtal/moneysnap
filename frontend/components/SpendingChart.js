import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { VictoryPie } from "victory-native";
import { useApp } from "../contexts/AppContext";

const CAT_KEY = {
  food: "catFood", shopping: "catShopping", transport: "catTransport",
  bills: "catBills", health: "catHealth", entertainment: "catEntertainment",
  other: "catOther",
};

const COLORS = ["#f97316", "#8b5cf6", "#14b8a6", "#0ea5e9", "#ec4899", "#facc15", "#6b7280"];

export default function SpendingChart({ data = [] }) {
  const { colors, t } = useApp();

  const chartData = data
    .map((item) => ({ x: item.category || "other", y: Number(item.total) || 0 }))
    .filter((item) => item.y > 0);

  const total = chartData.reduce((sum, item) => sum + item.y, 0);

  const catLabel = (key) => t(CAT_KEY[key] || "catOther");

  if (chartData.length === 0) {
    return (
      <View style={[s.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[s.emptyText, { color: colors.subtext }]}>{t("noDataMonth")}</Text>
      </View>
    );
  }

  return (
    <View style={[s.wrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[s.title, { color: colors.text }]}>{t("spendingByCategory")}</Text>
      <VictoryPie
        data={chartData}
        colorScale={COLORS}
        innerRadius={60}
        labels={({ datum }) => `${catLabel(datum.x)}\n฿${datum.y.toFixed(0)}`}
        style={{ labels: { fontSize: 11, fill: colors.text, padding: 8 } }}
      />
      <Text style={[s.total, { color: colors.subtext }]}>
        {t("totalLabel")}: ฿{total.toFixed(2)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  total: { marginTop: 12, textAlign: "center", fontWeight: "600" },
  empty: { padding: 24, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  emptyText: {},
});
