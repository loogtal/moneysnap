import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useApp } from "../contexts/AppContext";

const NUMPAD = [["1","2","3"],["4","5","6"],["7","8","9"],["","0","⌫"]];

export default function PinLockScreen({ onUnlock }) {
  const { colors, t, pinCode } = useApp();
  const [input, setInput] = useState("");

  function press(key) {
    if (key === "⌫") {
      setInput((p) => p.slice(0, -1));
      return;
    }
    if (input.length >= 4) return;
    const next = input + key;
    setInput(next);
    if (next.length === 4) {
      if (next === pinCode) {
        onUnlock();
      } else {
        setTimeout(() => {
          Alert.alert("", t("pinWrong"));
          setInput("");
        }, 80);
      }
    }
  }

  return (
    <View style={[s.overlay, { backgroundColor: colors.bg }]}>
      <Text style={{ fontSize: 44, marginBottom: 12 }}>🔐</Text>
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 28 }}>
        {t("pinEnter")}
      </Text>
      <View style={s.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[s.dot, { backgroundColor: input.length > i ? colors.primary : colors.border }]}
          />
        ))}
      </View>
      <View style={s.numpad}>
        {NUMPAD.map((row, ri) => (
          <View key={ri} style={s.row}>
            {row.map((key, ki) =>
              key === "" ? (
                <View key={ki} style={s.keyPlaceholder} />
              ) : (
                <TouchableOpacity
                  key={ki}
                  style={[s.key, { backgroundColor: key === "⌫" ? colors.chip : colors.surface, borderColor: colors.border }]}
                  onPress={() => press(key)}
                >
                  <Text style={{ fontSize: 22, fontWeight: "600", color: colors.text }}>{key}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  dots: { flexDirection: "row", gap: 14, marginBottom: 36 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  numpad: { gap: 12 },
  row: { flexDirection: "row", gap: 16 },
  key: { width: 76, height: 56, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  keyPlaceholder: { width: 76, height: 56 },
});
