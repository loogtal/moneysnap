import React, { useRef, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, useColorScheme,
} from "react-native";
import { useApp } from "../contexts/AppContext";

const { width } = Dimensions.get("window");

const SLIDES_TH = [
  { id: "1", emoji: "📷", title: "สแกนสลิปด้วย AI", desc: "ถ่ายรูปสลิป PromptPay หรือสลิปธนาคารใดก็ได้ — AI อ่านและบันทึกข้อมูลให้อัตโนมัติ ไม่ต้องพิมพ์เอง" },
  { id: "2", emoji: "📥", title: "นำเข้า Statement ธนาคาร", desc: "รองรับ KBank, SCB, BBL, KTB, BAY, TTB และอีกหลายธนาคาร — import CSV เพื่อดูภาพรวมทันที" },
  { id: "3", emoji: "📊", title: "วิเคราะห์และควบคุมงบ", desc: "กราฟรายจ่ายแบ่งหมวด, แนวโน้ม 6 เดือน, ตั้งงบประมาณ, พยากรณ์สิ้นเดือน และ AI Chat" },
  { id: "4", emoji: "💰", title: "ครบทุกความต้องการ", desc: "บันทึกหนี้, รายจ่ายประจำ, เป้าหมายออม, รายงาน PDF, คะแนนสุขภาพการเงิน — ทุกอย่างในที่เดียว" },
  { id: "5", emoji: "🚀", title: "พร้อมใช้งานแล้ว!", desc: "เริ่มต้นด้วยการสแกนสลิปแรก หรือ import statement จากแอปธนาคารของคุณได้เลย" },
];

const SLIDES_EN = [
  { id: "1", emoji: "📷", title: "Scan Slips with AI", desc: "Photo any PromptPay or bank transfer slip — AI reads and records everything instantly. No typing needed." },
  { id: "2", emoji: "📥", title: "Import Bank Statements", desc: "Supports KBank, SCB, BBL, KTB, BAY, TTB and more — import CSV for an instant spending overview." },
  { id: "3", emoji: "📊", title: "Analyze & Budget", desc: "Category charts, 6-month trends, budget alerts, end-of-month forecast, and AI Chat assistant." },
  { id: "4", emoji: "💰", title: "Everything You Need", desc: "Debt tracker, recurring bills, savings goals, PDF reports, and financial health score — all in one place." },
  { id: "5", emoji: "🚀", title: "Ready to Go!", desc: "Start by scanning your first slip, or import a bank statement to see your spending right away." },
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
