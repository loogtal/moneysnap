import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";

const MONTH_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const MONTH_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_TH = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const DAY_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function CalendarScreen() {
  const { colors, t, language } = useApp();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [loading, setLoading] = useState(true);
  const [txMap, setTxMap] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  useEffect(() => { setSelectedDate(null); }, [year, month]);
  useFocusEffect(useCallback(() => { load(); }, [year, month]));

  async function load() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/transactions`, {
        params: { page: 1, page_size: 500, year, month: month + 1 },
      });
      const all = res.data.results || [];
      const map = {};
      all.forEach((tx) => {
        const d = tx.transaction_date?.slice(0, 10);
        if (!d || !d.startsWith(monthStr)) return;
        if (!map[d]) map[d] = { income: 0, expense: 0, txs: [] };
        if (tx.transaction_type === "income") map[d].income += tx.amount || 0;
        else map[d].expense += tx.amount || 0;
        map[d].txs.push(tx);
      });
      setTxMap(map);
    } catch {}
    setLoading(false);
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const todayStr = today.toISOString().slice(0, 10);
  const monthNames = language === "th" ? MONTH_TH : MONTH_EN;
  const dayNames = language === "th" ? DAY_TH : DAY_EN;
  const s = styles(colors);

  const dayTxs = selectedDate ? (txMap[selectedDate]?.txs || []) : [];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("calendarTitle")}</Text>

      <View style={s.navRow}>
        <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
          <Text style={s.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.monthTitle}>{monthNames[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
      ) : (
        <>
          <View style={s.dayHeaders}>
            {dayNames.map((d) => (
              <Text key={d} style={s.dayHeader}>{d}</Text>
            ))}
          </View>

          <View style={s.grid}>
            {Array.from({ length: startDay }).map((_, i) => (
              <View key={`e${i}`} style={s.cell} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const data = txMap[dateStr];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    s.cell,
                    isToday && { borderWidth: 1, borderColor: colors.primary },
                    isSelected && { backgroundColor: colors.primary + "22" },
                  ]}
                  onPress={() => setSelectedDate(isSelected ? null : dateStr)}
                >
                  <Text style={[s.dayNum, isToday && { color: colors.primary, fontWeight: "800" }]}>{day}</Text>
                  {data && (
                    <View style={s.dotRow}>
                      {data.income > 0 && <View style={[s.dot, { backgroundColor: colors.success }]} />}
                      {data.expense > 0 && <View style={[s.dot, { backgroundColor: colors.danger }]} />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedDate && (
            <View style={s.detail}>
              <Text style={s.detailTitle}>{selectedDate}</Text>
              {dayTxs.length === 0 ? (
                <Text style={{ color: colors.subtext, fontSize: 14 }}>{t("calendarNoTx")}</Text>
              ) : (
                dayTxs.map((tx) => (
                  <View key={tx.id} style={s.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={1}>
                        {tx.receiver_name || tx.sender_name || t("unknownTx")}
                      </Text>
                      {tx.category ? (
                        <Text style={{ fontSize: 11, color: colors.subtext }}>{t(`cat${tx.category.charAt(0).toUpperCase() + tx.category.slice(1)}`) || tx.category}</Text>
                      ) : null}
                    </View>
                    <Text style={{
                      fontSize: 14, fontWeight: "700",
                      color: tx.transaction_type === "income" ? colors.success : colors.danger,
                    }}>
                      {tx.transaction_type === "income" ? "+" : "-"}฿{(tx.amount || 0).toFixed(0)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          <View style={s.legend}>
            <View style={[s.dot, { backgroundColor: colors.success }]} />
            <Text style={s.legendText}>{t("income")}</Text>
            <View style={[s.dot, { backgroundColor: colors.danger, marginLeft: 12 }]} />
            <Text style={s.legendText}>{t("expense")}</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 16 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 30, color: c.primary, fontWeight: "300" },
  monthTitle: { fontSize: 18, fontWeight: "700", color: c.text },
  dayHeaders: { flexDirection: "row", marginBottom: 4 },
  dayHeader: { width: "14.28%", textAlign: "center", fontSize: 11, fontWeight: "700", color: c.subtext },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 8, padding: 1 },
  dayNum: { fontSize: 13, color: c.text },
  dotRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  detail: {
    marginTop: 16, backgroundColor: c.surface, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: c.border,
  },
  detailTitle: { fontSize: 15, fontWeight: "700", color: c.text, marginBottom: 10 },
  txRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border,
  },
  legend: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  legendText: { fontSize: 12, color: c.subtext, marginLeft: 4 },
});
