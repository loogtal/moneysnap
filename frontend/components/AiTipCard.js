import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function AiTipCard({ tipText }) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>คำแนะนำ AI</Text>
      <Text style={styles.tip}>{tipText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#eef2ff", borderRadius: 14, padding: 16, marginTop: 20 },
  heading: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  tip: { color: "#334155", lineHeight: 22 },
});
