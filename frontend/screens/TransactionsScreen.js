import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  TouchableOpacity, Alert, RefreshControl, TextInput,
  ScrollView,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import CategoryBadge from "../components/CategoryBadge";
import { useApp } from "../contexts/AppContext";

const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"];

export default function TransactionsScreen({ navigation }) {
  const { colors, t } = useApp();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState(null);
  const searchTimer = useRef(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load(q = search, m = filterMonth) {
    try {
      const params = { page: 1, page_size: 100 };
      if (q) params.search = q;
      if (m) {
        params.year = currentYear;
        params.month = parseInt(m);
      }
      const res = await axios.get(`${API_BASE_URL}/transactions`, { params });
      setTransactions(res.data.results || []);
    } catch {
      Alert.alert(t("error"), t("loadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onSearchChange(text) {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(text, filterMonth), 400);
  }

  function onMonthSelect(m) {
    const next = filterMonth === m ? null : m;
    setFilterMonth(next);
    load(search, next);
  }

  async function deleteItem(item) {
    try {
      await axios.delete(`${API_BASE_URL}/transactions/${item.id}`);
      setTransactions((p) => p.filter((x) => x.id !== item.id));
    } catch {
      Alert.alert(t("error"), t("deleteFailed"));
    }
  }

  function confirmDelete(item) {
    Alert.alert(t("deleteTitle"), `฿${item.amount?.toFixed(2)}`, [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => deleteItem(item) },
    ]);
  }

  function renderRightActions(item) {
    return (
      <TouchableOpacity style={s.swipeDeleteBtn} onPress={() => confirmDelete(item)}>
        <Text style={s.swipeDeleteText}>{t("delete")}</Text>
      </TouchableOpacity>
    );
  }

  const s = styles(colors);

  if (loading) return <ActivityIndicator style={s.center} size="large" color={colors.primary} />;

  return (
    <View style={s.container}>
      {/* Search bar */}
      <View style={s.searchBox}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={onSearchChange}
          placeholder={t("searchTx")}
          placeholderTextColor={colors.subtext}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(""); load("", filterMonth); }}>
            <Text style={{ color: colors.subtext, fontSize: 16, paddingHorizontal: 6 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Month filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.monthScroll} contentContainerStyle={s.monthRow}>
        {MONTHS.map((m) => {
          const active = filterMonth === m;
          const isCurrent = m === currentMonth;
          return (
            <TouchableOpacity
              key={m}
              style={[s.monthChip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => onMonthSelect(m)}
            >
              <Text style={[s.monthChipText, active && { color: "#fff" }]}>
                {isCurrent && !active ? `${m} ●` : m}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {transactions.length === 0 ? (
        <Text style={s.empty}>{search || filterMonth ? t("noSearchResult") : t("noData")}</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => renderRightActions(item)} overshootRight={false}>
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
                <TouchableOpacity style={s.editRow} onPress={() => navigation.navigate("EditTransaction", { transactionId: item.id })}>
                  <Text style={s.editText}>{t("edit")}</Text>
                </TouchableOpacity>
              </View>
            </Swipeable>
          )}
        />
      )}
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, padding: 12 },
  center: { flex: 1, justifyContent: "center" },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: c.surface, borderRadius: 10,
    borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 10, marginBottom: 10, height: 42,
  },
  searchIcon: { fontSize: 16, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: c.text },
  monthScroll: { maxHeight: 40, marginBottom: 10 },
  monthRow: { gap: 6, paddingRight: 4 },
  monthChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
  },
  monthChipText: { fontSize: 13, color: c.text, fontWeight: "600" },
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
  editRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8, alignSelf: "flex-end" },
  editText: { color: c.primary, fontWeight: "600", fontSize: 14 },
  swipeDeleteBtn: {
    backgroundColor: c.danger, justifyContent: "center", alignItems: "center",
    width: 80, borderRadius: 12, marginBottom: 10,
  },
  swipeDeleteText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
