import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useApp } from "../contexts/AppContext";

const COLORS = {
  food: "#f97316", shopping: "#8b5cf6", transport: "#14b8a6",
  bills: "#0ea5e9", health: "#ec4899", entertainment: "#facc15",
  other: "#6b7280",
};

const CAT_KEY = {
  food: "catFood", shopping: "catShopping", transport: "catTransport",
  bills: "catBills", health: "catHealth", entertainment: "catEntertainment",
  other: "catOther",
};

export default function CategoryBadge({ category }) {
  const { t } = useApp();
  const key = category?.toLowerCase() || "other";
  const isStandard = key in COLORS;
  const bgColor = isStandard ? COLORS[key] : "#6366f1";
  const label = isStandard ? t(CAT_KEY[key]) : (category || t("catOther"));
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={styles.text} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  text: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
