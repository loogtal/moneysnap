import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";

export default function MerchantScreen() {
  const { colors, t } = useApp();
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await axios.get(`${API_BASE_URL}/transactions`, { params: { page_size: 500 } });
      const txs = (res.data.results || []).filter(
        (tx) => tx.transaction_type !== "income" && tx.receiver_name && tx.receiver_name.trim()
      );
      const map = {};
      txs.forEach((tx) => {
        const name = tx.receiver_name.trim();
        if (!map[name]) map[name] = { name, total: 0, count: 0, txs: [] };
        map[name].total += tx.amount || 0;
        map[name].count += 1;
        map[name].txs.push(tx);
      });
      const sorted = Object.values(map).sort((a, b) => b.total - a.total).slice(0, 30);
      setMerchants(sorted);
    } catch {}
    setLoading(false);
  }

  const s = styles(colors);
  const maxTotal = merchants[0]?.total || 1;

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (merchants.length === 0) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.subtext, fontSize: 15 }}>{t("merchantEmpty")}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("merchantTitle")}</Text>

      {merchants.map((m, idx) => {
        const pct = Math.round((m.total / maxTotal) * 100);
        const isOpen = selected === m.name;
        return (
          <TouchableOpacity key={m.name} style={s.card} onPress={() => setSelected(isOpen ? null : m.name)} activeOpacity={0.85}>
            <View style={s.rowTop}>
              <View style={s.rankBadge}>
                <Text style={s.rankText}>#{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.merchantName} numberOfLines={1}>{m.name}</Text>
                <Text style={s.merchantMeta}>{m.count} {t("merchantTimes")}</Text>
              </View>
              <Text style={s.merchantTotal}>฿{m.total.toFixed(0)}</Text>
            </View>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${pct}%` }]} />
            </View>
            {isOpen && (
              <View style={s.txList}>
                {m.txs.slice(0, 5).map((tx) => (
                  <View key={tx.id} style={s.txRow}>
                    <Text style={s.txDate}>{tx.transaction_date?.slice(0, 10) ?? "—"}</Text>
                    <Text style={[s.txAmt, { color: colors.danger }]}>-฿{(tx.amount ?? 0).toFixed(0)}</Text>
                  </View>
                ))}
                {m.txs.length > 5 && (
                  <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 4 }}>+{m.txs.length - 5} more</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 16 },
  card: {
    backgroundColor: c.surface, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: c.border,
  },
  rowTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  rankBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary + "22",
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  rankText: { fontSize: 11, fontWeight: "700", color: c.primary },
  merchantName: { fontSize: 14, fontWeight: "700", color: c.text },
  merchantMeta: { fontSize: 11, color: c.subtext, marginTop: 1 },
  merchantTotal: { fontSize: 15, fontWeight: "800", color: c.danger },
  barBg: { height: 6, backgroundColor: c.border, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, backgroundColor: c.danger, borderRadius: 3 },
  txList: { marginTop: 10, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
  txRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  txDate: { fontSize: 12, color: c.subtext },
  txAmt: { fontSize: 12, fontWeight: "600" },
});
