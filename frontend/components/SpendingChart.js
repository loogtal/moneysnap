import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { VictoryPie } from "victory-native";

export default function SpendingChart({ data = [] }) {
  const chartData = data.map((item) => ({ x: item.category || "อื่นๆ", y: item.total || 0 }));
  const total = chartData.reduce((sum, item) => sum + item.y, 0);

  if (chartData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>ไม่มีข้อมูลเดือนนี้</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>การใช้จ่ายตามหมวด</Text>
      <VictoryPie
        data={chartData}
        colorScale={["#f97316", "#8b5cf6", "#14b8a6", "#0ea5e9", "#ec4899", "#facc15", "#6b7280"]}
        innerRadius={60}
        labels={({ datum }) => `${datum.x}\n฿${datum.y.toFixed(0)}`}
        style={{ labels: { fontSize: 11, fill: "#333", padding: 8 } }}
      />
      <Text style={styles.total}>รวม: ฿{total.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 20, elevation: 2 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  total: { marginTop: 12, textAlign: "center", color: "#444", fontWeight: "600" },
  emptyContainer: { padding: 24, borderRadius: 14, backgroundColor: "#f3f4f6", alignItems: "center" },
  emptyText: { color: "#777" },
});
