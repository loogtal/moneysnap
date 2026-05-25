import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import CategoryBadge from "../components/CategoryBadge";

export default function TransactionsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  async function loadTransactions() {
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions`, {
        params: { page: 1, page_size: 100 },
      });
      setTransactions(response.data.results || []);
    } catch {
      Alert.alert("ข้อผิดพลาด", "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadTransactions();
  }

  function handleEdit(item) {
    navigation.navigate("EditTransaction", { transactionId: item.id });
  }

  function handleDelete(item) {
    Alert.alert(
      "ลบธุรกรรม",
      `ต้องการลบรายการ ฿${item.amount?.toFixed(2)} ใช่หรือไม่?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบ",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/transactions/${item.id}`);
              setTransactions((prev) => prev.filter((t) => t.id !== item.id));
            } catch {
              Alert.alert("ข้อผิดพลาด", "ลบไม่สำเร็จ โปรดลองอีกครั้ง");
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <View style={styles.container}>
      {transactions.length === 0 ? (
        <Text style={styles.empty}>ยังไม่มีธุรกรรมในระบบ</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.topRow}>
                <Text style={styles.name} numberOfLines={1}>{item.receiver_name || "รายการไม่ระบุ"}</Text>
                <Text style={[styles.amount, item.transaction_type === "income" && styles.income]}>
                  {item.transaction_type === "income" ? "+" : "-"}฿{item.amount?.toFixed(2) ?? "0.00"}
                </Text>
              </View>
              <Text style={styles.bank}>{item.bank_name || "ธนาคารไม่ระบุ"}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.date}>{item.transaction_date?.slice(0, 10) || "ไม่ระบุวันที่"}</Text>
                <CategoryBadge category={item.category || "other"} />
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                  <Text style={styles.actionEdit}>แก้ไข</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                  <Text style={styles.actionDelete}>ลบ</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f7", padding: 12 },
  center: { flex: 1, justifyContent: "center" },
  empty: { marginTop: 40, textAlign: "center", color: "#777", fontSize: 16 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  name: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  amount: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
  income: { color: "#16a34a" },
  bank: { color: "#666", fontSize: 13, marginBottom: 8 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { color: "#555", fontSize: 13 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 10, borderTopWidth: 1, borderTopColor: "#f0f0f0", paddingTop: 8 },
  actionBtn: { paddingHorizontal: 4 },
  actionEdit: { color: "#2d6cdf", fontWeight: "600", fontSize: 14 },
  actionDelete: { color: "#ef4444", fontWeight: "600", fontSize: 14 },
});
