import React from "react";
import { Text, View, StyleSheet } from "react-native";

const COLORS = {
  food: "#f97316",
  shopping: "#8b5cf6",
  transport: "#14b8a6",
  bills: "#0ea5e9",
  health: "#ec4899",
  entertainment: "#facc15",
  other: "#6b7280",
};

export default function CategoryBadge({ category }) {
  return (
    <View style={[styles.badge, { backgroundColor: COLORS[category] || COLORS.other }]}> 
      <Text style={styles.text}>{category}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  text: { color: "#fff", fontWeight: "700", fontSize: 12, textTransform: "capitalize" },
});
