import React from "react";
import { View, Text, StyleSheet } from "react-native";
import CategoryBadge from "./CategoryBadge";

export default function SlipCard({ transaction }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{transaction.receiver_name || "รายการไม่ระบุ"}</Text>
        <Text style={styles.amount}>฿{transaction.amount?.toFixed(2) || "0.00"}</Text>
      </View>
      <Text style={styles.subtitle}>{transaction.bank_name || "ธนาคารไม่ระบุ"}</Text>
      <View style={styles.meta}>
        <Text style={styles.date}>{transaction.transaction_date?.slice(0, 10) || "ไม่ระบุวันที่"}</Text>
        <CategoryBadge category={transaction.category || "other"} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#f7f7fa", padding: 14, borderRadius: 12, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  title: { fontSize: 16, fontWeight: "700" },
  amount: { fontSize: 16, fontWeight: "700", color: "#2d6cdf" },
  subtitle: { color: "#666" },
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  date: { color: "#555" },
});
