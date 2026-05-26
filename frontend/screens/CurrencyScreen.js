import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../contexts/AppContext";

const CURRENCIES = ["THB","USD","EUR","JPY","GBP","CNY","SGD","AUD","KRW","MYR","HKD"];
const CACHE_KEY = "currency_rates_cache";
const CACHE_TTL = 3600000;

export default function CurrencyScreen() {
  const { colors, t } = useApp();
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("THB");
  const [to, setTo] = useState("USD");
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => { loadRates(); }, []);

  async function loadRates() {
    setLoading(true);
    setError(false);
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
      if (cached) {
        const { rates: r, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setRates(r);
          setUpdatedAt(new Date(timestamp));
          setLoading(false);
          return;
        }
      }
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await res.json();
      if (data.result !== "success") throw new Error("API error");
      setRates(data.rates);
      setUpdatedAt(new Date());
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, timestamp: Date.now() })).catch(() => {});
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  function convert() {
    if (!rates || !amount) return "–";
    const num = parseFloat(amount);
    if (isNaN(num)) return "–";
    const inUSD = num / (rates[from] || 1);
    const result = inUSD * (rates[to] || 1);
    return result.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  function swap() {
    setFrom(to);
    setTo(from);
  }

  const s = styles(colors);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("currencyTitle")}</Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
      ) : error ? (
        <View style={{ alignItems: "center", marginVertical: 40 }}>
          <Text style={{ color: colors.danger, fontSize: 15, marginBottom: 16 }}>{t("currencyFail")}</Text>
          <TouchableOpacity style={[s.retryBtn, { backgroundColor: colors.primary }]} onPress={loadRates}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>{t("refresh")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={s.card}>
            <Text style={s.label}>{t("currencyAmount")}</Text>
            <TextInput
              style={[s.amountInput, { color: colors.text }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.subtext}
            />
          </View>

          <View style={s.card}>
            <Text style={s.label}>{t("currencyFrom")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.chip, from === c && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setFrom(c)}
                >
                  <Text style={[s.chipText, from === c && { color: "#fff" }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity style={s.swapRow} onPress={swap}>
            <View style={[s.swapBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 22, color: colors.primary }}>⇅</Text>
            </View>
          </TouchableOpacity>

          <View style={s.card}>
            <Text style={s.label}>{t("currencyTo")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.chip, to === c && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setTo(c)}
                >
                  <Text style={[s.chipText, to === c && { color: "#fff" }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={[s.resultCard, { borderColor: colors.primary }]}>
            <Text style={{ fontSize: 13, color: colors.subtext, marginBottom: 4 }}>
              {amount || "0"} {from} =
            </Text>
            <Text style={{ fontSize: 34, fontWeight: "800", color: colors.primary }}>
              {convert()}
            </Text>
            <Text style={{ fontSize: 14, color: colors.subtext, marginTop: 2 }}>{to}</Text>
          </View>

          {updatedAt && (
            <Text style={{ fontSize: 11, color: colors.subtext, textAlign: "center", marginTop: 14 }}>
              {t("currencyUpdated")}: {updatedAt.toLocaleTimeString()}
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 48 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 20 },
  card: { backgroundColor: c.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.border, marginBottom: 12 },
  label: { fontSize: 11, fontWeight: "700", color: c.sectionLabel, textTransform: "uppercase", letterSpacing: 0.7 },
  amountInput: { fontSize: 32, fontWeight: "700", marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: c.border, marginRight: 8, backgroundColor: c.chip },
  chipText: { fontSize: 13, fontWeight: "600", color: c.chipText },
  swapRow: { alignItems: "center", marginVertical: 4 },
  swapBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  resultCard: { borderRadius: 14, padding: 24, borderWidth: 2, alignItems: "center", marginTop: 8 },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
});
