import React, { useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useApp } from "../contexts/AppContext";

const TIPS = [0, 10, 15, 20];

export default function BillSplitScreen() {
  const { colors, t } = useApp();
  const [total, setTotal] = useState("");
  const [people, setPeople] = useState("2");
  const [tip, setTip] = useState(0);
  const [names, setNames] = useState(["", ""]);
  const [customAmounts, setCustomAmounts] = useState({});

  const totalNum = parseFloat(total) || 0;
  const tipAmount = totalNum * (tip / 100);
  const grandTotal = totalNum + tipAmount;
  const numPeople = Math.max(parseInt(people) || 2, 2);

  function updatePeople(val) {
    const n = Math.max(parseInt(val) || 2, 2);
    setPeople(String(n));
    setNames((prev) => {
      const arr = [...prev];
      while (arr.length < n) arr.push("");
      return arr.slice(0, n);
    });
    setCustomAmounts({});
  }

  const totalCustom = Object.values(customAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const unevenCount = Object.keys(customAmounts).filter((k) => customAmounts[k] !== "").length;
  const evenShare = unevenCount === numPeople ? 0 : (grandTotal - totalCustom) / (numPeople - unevenCount);

  function getShare(i) {
    const custom = customAmounts[i];
    if (custom !== undefined && custom !== "") return parseFloat(custom) || 0;
    return Math.max(evenShare, 0);
  }

  const s = styles(colors);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.heading}>{t("billSplitTitle")}</Text>
      <Text style={s.subtitle}>{t("billSplitSubtitle")}</Text>

      {/* Total Bill */}
      <View style={s.card}>
        <Text style={s.label}>{t("totalBill")} (฿)</Text>
        <TextInput
          style={s.bigInput}
          value={total}
          onChangeText={setTotal}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.subtext}
        />
      </View>

      {/* Tip */}
      <View style={s.card}>
        <Text style={s.label}>{t("tipPercent")}</Text>
        <View style={s.tipRow}>
          {TIPS.map((pct) => (
            <TouchableOpacity
              key={pct}
              style={[s.tipBtn, tip === pct && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setTip(pct)}
            >
              <Text style={[s.tipText, tip === pct && { color: "#fff" }]}>{pct}%</Text>
            </TouchableOpacity>
          ))}
        </View>
        {tip > 0 && (
          <Text style={{ fontSize: 13, color: colors.subtext, marginTop: 8 }}>
            {t("tip")}: ฿{tipAmount.toFixed(2)} → {t("total")}: ฿{grandTotal.toFixed(2)}
          </Text>
        )}
      </View>

      {/* Number of people */}
      <View style={s.card}>
        <Text style={s.label}>{t("numPeople")}</Text>
        <View style={s.peopleRow}>
          <TouchableOpacity
            style={s.stepper}
            onPress={() => updatePeople(String(Math.max(numPeople - 1, 2)))}
          >
            <Text style={{ fontSize: 22, color: colors.primary, fontWeight: "700" }}>−</Text>
          </TouchableOpacity>
          <Text style={s.peopleNum}>{numPeople}</Text>
          <TouchableOpacity
            style={s.stepper}
            onPress={() => updatePeople(String(numPeople + 1))}
          >
            <Text style={{ fontSize: 22, color: colors.primary, fontWeight: "700" }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Per-person breakdown */}
      {grandTotal > 0 && (
        <View style={s.card}>
          <Text style={s.label}>{t("perPerson")}</Text>
          {Array.from({ length: numPeople }).map((_, i) => {
            const share = getShare(i);
            return (
              <View key={i} style={s.personRow}>
                <TextInput
                  style={s.nameInput}
                  value={names[i] || ""}
                  onChangeText={(v) => setNames((p) => { const a = [...p]; a[i] = v; return a; })}
                  placeholder={`${t("person")} ${i + 1}`}
                  placeholderTextColor={colors.subtext}
                />
                <TextInput
                  style={s.customInput}
                  value={customAmounts[i] ?? ""}
                  onChangeText={(v) => setCustomAmounts((p) => ({ ...p, [i]: v }))}
                  keyboardType="decimal-pad"
                  placeholder={share.toFixed(2)}
                  placeholderTextColor={colors.subtext}
                />
                <View style={[s.shareTag, { backgroundColor: colors.primary }]}>
                  <Text style={s.shareTagText}>฿{share.toFixed(2)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Summary */}
      {grandTotal > 0 && (
        <View style={[s.card, { backgroundColor: colors.primary }]}>
          <Text style={{ color: "#fff", fontSize: 13, marginBottom: 4 }}>{t("grandTotal")}</Text>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900" }}>฿{grandTotal.toFixed(2)}</Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>
            {numPeople} {t("people")} · {t("avgPerPerson")}: ฿{(grandTotal / numPeople).toFixed(2)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: c.subtext, marginBottom: 16 },
  card: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: c.subtext, marginBottom: 10 },
  bigInput: { fontSize: 36, fontWeight: "800", color: c.text, textAlign: "center", paddingVertical: 8 },
  tipRow: { flexDirection: "row", gap: 8 },
  tipBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.chip, alignItems: "center" },
  tipText: { fontSize: 15, fontWeight: "700", color: c.text },
  peopleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24 },
  stepper: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: c.primary, alignItems: "center", justifyContent: "center" },
  peopleNum: { fontSize: 28, fontWeight: "800", color: c.text, minWidth: 40, textAlign: "center" },
  personRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  nameInput: { flex: 1, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: c.text, backgroundColor: c.inputBg },
  customInput: { width: 80, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, fontSize: 13, color: c.text, backgroundColor: c.inputBg, textAlign: "center" },
  shareTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 72, alignItems: "center" },
  shareTagText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
