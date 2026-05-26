import React, { useRef, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, useColorScheme,
} from "react-native";
import { useApp } from "../contexts/AppContext";

const { width } = Dimensions.get("window");

const SLIDES_TH = [
  { id: "1", emoji: "📷", title: "สแกนสลิปด้วย AI", desc: "ถ่ายรูปสลิปธนาคาร — AI อ่านข้อมูลและบันทึกให้อัตโนมัติ ไม่ต้องพิมพ์เอง" },
  { id: "2", emoji: "📊", title: "วิเคราะห์การใช้จ่าย", desc: "กราฟแบ่งตามหมวดหมู่, แนวโน้ม 6 เดือน, สรุปรายสัปดาห์, และ AI Tips" },
  { id: "3", emoji: "💰", title: "ตั้งงบและเป้าหมาย", desc: "กำหนดงบรายหมวด แจ้งเตือนเมื่อใกล้เกิน และตั้งเป้าหมายออมเงินได้เลย" },
  { id: "4", emoji: "🤝", title: "ครบทุกฟีเจอร์", desc: "บันทึกหนี้, รายจ่ายประจำ, หารบิลกับเพื่อน, Net Worth — ทุกอย่างในที่เดียว" },
  { id: "5", emoji: "🚀", title: "พร้อมใช้งานแล้ว!", desc: "เริ่มต้นด้วยการสแกนสลิปแรกของคุณ หรือเข้าสู่ระบบด้วย Google" },
];

const SLIDES_EN = [
  { id: "1", emoji: "📷", title: "Scan Slips with AI", desc: "Take a photo of any bank slip — AI reads and records everything automatically" },
  { id: "2", emoji: "📊", title: "Analyze Spending", desc: "Category charts, 6-month trends, weekly summary, and AI-powered tips" },
  { id: "3", emoji: "💰", title: "Budget & Goals", desc: "Set per-category budgets with alerts, and track savings goals progress" },
  { id: "4", emoji: "🤝", title: "All-in-One", desc: "Debt tracker, recurring expenses, bill splitting, Net Worth — all in one app" },
  { id: "5", emoji: "🚀", title: "Ready to Go!", desc: "Start by scanning your first slip, or sign in with Google" },
];

export default function OnboardingScreen({ onDone }) {
  const { colors, language } = useApp();
  const slides = language === "en" ? SLIDES_EN : SLIDES_TH;
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);
  const s = styles(colors);

  function goNext() {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      setIndex(index + 1);
    } else {
      onDone();
    }
  }

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.skip} onPress={onDone}>
        <Text style={s.skipText}>{language === "en" ? "Skip" : "ข้าม"}</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={s.slide}>
            <Text style={s.emoji}>{item.emoji}</Text>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.desc}>{item.desc}</Text>
          </View>
        )}
      />

      <View style={s.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[s.dot, i === index && { backgroundColor: colors.primary, width: 20 }]} />
        ))}
      </View>

      <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={goNext}>
        <Text style={s.btnText}>
          {index === slides.length - 1
            ? (language === "en" ? "Get Started" : "เริ่มใช้งาน")
            : (language === "en" ? "Next" : "ถัดไป")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "space-between", paddingVertical: 60, paddingHorizontal: 24 },
  skip: { alignSelf: "flex-end" },
  skipText: { color: c.subtext, fontSize: 15, fontWeight: "600" },
  slide: { width: width - 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  emoji: { fontSize: 80, marginBottom: 32 },
  title: { fontSize: 26, fontWeight: "800", color: c.text, textAlign: "center", marginBottom: 16 },
  desc: { fontSize: 16, color: c.subtext, textAlign: "center", lineHeight: 24 },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
  btn: { width: "100%", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
