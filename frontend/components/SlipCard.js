import React from "react";
import { View, Text, StyleSheet } from "react-native";
import CategoryBadge from "./CategoryBadge";
import { useApp } from "../contexts/AppContext";

export default function SlipCard({ transaction }) {
  const { colors, t, privacyMode } = useApp();
  const isIncome = transaction.transaction_type === "income";
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.text }]}>{transaction.receiver_name || t("unknownTx")}</Text>
        <Text style={[styles.amount, { color: isIncome ? colors.success : colors.danger }]}>
          {isIncome ? "+" : "-"}{privacyMode ? "฿••••" : `฿${transaction.amount?.toFixed(2) || "0.00"}`}
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.subtext }]}>{transaction.bank_name || t("unknownBank")}</Text>
      <View style={styles.meta}>
        <Text style={[styles.date, { color: colors.subtext }]}>{transaction.transaction_date?.slice(0, 10) || t("noDate")}</Text>
        <CategoryBadge category={transaction.category || "other"} />
      </View>
      {transaction.tags && transaction.tags.length > 0 && (
        <View style={styles.tagRow}>
          {transaction.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "55" }]}>
              <Text style={{ fontSize: 10, color: colors.primary, fontWeight: "600" }}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 12, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  title: { fontSize: 16, fontWeight: "700" },
  amount: { fontSize: 16, fontWeight: "700" },
  subtitle: {},
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  date: {},
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
});
