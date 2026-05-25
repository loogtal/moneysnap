import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useApp } from "../contexts/AppContext";

export default function AiTipCard({ tipText }) {
  const { colors, t } = useApp();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
      <Text style={[styles.heading, { color: colors.primary }]}>{t("aiTips")}</Text>
      <Text style={[styles.tip, { color: colors.text }]}>{tipText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginTop: 20 },
  heading: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  tip: { lineHeight: 22 },
});
