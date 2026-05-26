import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";

const SUGGESTIONS_TH = [
  "สรุปการใช้จ่ายเดือนนี้", "หมวดไหนใช้เงินเยอะสุด?",
  "ฉันควรประหยัดอะไร?", "รายรับเดือนนี้เท่าไหร่?",
];
const SUGGESTIONS_EN = [
  "Summarize my spending this month", "Which category am I spending most on?",
  "What should I cut back on?", "What's my income this month?",
];

export default function ChatScreen() {
  const { colors, t, language } = useApp();
  const [messages, setMessages] = useState([
    { role: "assistant", content: language === "th"
        ? "สวัสดีครับ! ผมคือ MoneySnap AI 🤖\nถามอะไรเกี่ยวกับการเงินของคุณได้เลยครับ"
        : "Hi! I'm MoneySnap AI 🤖\nAsk me anything about your finances!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const suggestions = language === "th" ? SUGGESTIONS_TH : SUGGESTIONS_EN;

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  async function send(text) {
    const content = (text || input).trim();
    if (!content) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/chat`, { messages: newMessages }, { timeout: 60000 });
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch (err) {
      const detail = err?.response?.data?.detail || t("error");
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${detail}` }]);
    } finally {
      setLoading(false);
    }
  }

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={s.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isUser = item.role === "user";
          return (
            <View style={[s.bubble, isUser ? s.userBubble : s.aiBubble, { backgroundColor: isUser ? colors.primary : colors.surface }]}>
              {!isUser && <Text style={s.aiLabel}>MoneySnap AI</Text>}
              <Text style={[s.bubbleText, { color: isUser ? "#fff" : colors.text }]}>{item.content}</Text>
            </View>
          );
        }}
        ListFooterComponent={loading ? (
          <View style={[s.bubble, s.aiBubble, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}
      />

      {messages.length === 1 && (
        <View style={s.suggestions}>
          {suggestions.map((s) => (
            <TouchableOpacity key={s} style={[styles(colors).suggChip, { backgroundColor: colors.chip, borderColor: colors.border }]} onPress={() => send(s)}>
              <Text style={{ fontSize: 12, color: colors.text }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          style={[s.input, { color: colors.text }]}
          value={input}
          onChangeText={setInput}
          placeholder={t("chatPlaceholder")}
          placeholderTextColor={colors.subtext}
          multiline
          onSubmitEditing={() => send()}
          returnKeyType="send"
          blurOnSubmit
        />
        <TouchableOpacity
          style={[s.sendBtn, { backgroundColor: input.trim() && !loading ? colors.primary : colors.border }]}
          onPress={() => send()}
          disabled={!input.trim() || loading}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  list: { padding: 12, paddingBottom: 8 },
  bubble: { maxWidth: "82%", borderRadius: 16, padding: 12, marginBottom: 10 },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: c.border },
  aiLabel: { fontSize: 10, fontWeight: "700", color: c.primary, marginBottom: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12, marginBottom: 8 },
  suggChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    padding: 10, borderTopWidth: 1,
  },
  input: { flex: 1, fontSize: 15, maxHeight: 96, paddingVertical: 6 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
});
