import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  TouchableOpacity, Alert, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import CategoryBadge from "../components/CategoryBadge";
import { useApp } from "../contexts/AppContext";

export default function TransactionsScreen({ navigation }) {
  const { colors, t } = useApp();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const res = await axios.get(`${API_BASE_URL}/transactions`, { params: { page: 1, page_size: 100 } });
      setTransactions(res.data.results || []);
    } catch {
      Alert.alert(t("error"), t("loadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function confirmDelete(item) {
    Alert.alert(t("deleteTitle"), `฿${item.amount?.toFixed(2)}`, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"), style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${API_BASE_URL}/transactions/${item.id}`);
            setTransactions((p) => p.filter((x) => x.id !== item.id));
          } catch {
            Alert.alert(t("error"), t("deleteFailed"));
          }
        },
      },
    ]);
  }

  const s = styles(colors);

  if (loading) return <ActivityIndicator style={s.center} size="large" color={colors.primary} />;

  return (
    <View style={s.container}>
      {transactions.length === 0 ? (
        <Text style={s.empty}>{t("noData")}</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.topRow}>
                <Text style={s.name} numberOfLines={1}>{item.receiver_name || t("unknownTx")}</Text>
                <Text style={[s.amount, item.transaction_type === "income" && { color: colors.success }]}>
                  {item.transaction_type === "income" ? "+" : "-"}฿{item.amount?.toFixed(2) ?? "0.00"}
                </Text>
              </View>
              <Text style={s.bank}>{item.bank_name || t("unspecified")}</Text>
              <View style={s.meta}>
                <Text style={s.date}>{item.transaction_date?.slice(0, 10) || t("noDate")}</Text>
                <CategoryBadge category={item.category || "other"} />
              </View>
              <View style={s.actions}>
                <TouchableOpacity onPress={() => navigation.navigate("EditTransaction", { transactionId: item.id })}>
                  <Text style={s.editText}>{t("edit")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)}>
                  <Text style={s.deleteText}>{t("delete")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, padding: 12 },
  center: { flex: 1, justifyContent: "center" },
  empty: { marginTop: 40, textAlign: "center", color: c.subtext, fontSize: 16 },
  card: {
    backgroundColor: c.card, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: c.border,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  name: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8, color: c.text },
  amount: { fontSize: 15, fontWeight: "700", color: c.danger },
  bank: { color: c.subtext, fontSize: 13, marginBottom: 8 },
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { color: c.subtext, fontSize: 13 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 20, marginTop: 10, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
  editText: { color: c.primary, fontWeight: "600", fontSize: 14 },
  deleteText: { color: c.danger, fontWeight: "600", fontSize: 14 },
});
