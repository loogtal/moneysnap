import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";
import { RECURRING_KEY } from "./RecurringScreen";

const ACHIEVEMENTS = [
  { id: "first_scan",   emoji: "📷", key: "achieveFirstScan"   },
  { id: "ten_scans",    emoji: "🔥", key: "achieveTenScans"    },
  { id: "first_budget", emoji: "💰", key: "achieveFirstBudget" },
  { id: "first_goal",   emoji: "🎯", key: "achieveFirstGoal"   },
  { id: "goal_done",    emoji: "🏆", key: "achieveGoalDone"    },
  { id: "first_recur",  emoji: "🔄", key: "achieveFirstRecur"  },
  { id: "first_debt",   emoji: "🤝", key: "achieveFirstDebt"   },
  { id: "shared",       emoji: "📤", key: "achieveShared"      },
  { id: "dark_mode",    emoji: "🌙", key: "achieveDarkMode"    },
  { id: "bilingual",    emoji: "🌐", key: "achieveBilingual"   },
  { id: "save_10k",     emoji: "💎", key: "achieveSave10k"     },
  { id: "import_csv",   emoji: "📥", key: "achieveImport"      },
];

async function computeUnlocked({ language, themeMode }) {
  const unlocked = new Set();

  try {
    // From API
    const profile = await axios.get(`${API_BASE_URL}/auth/me`, { timeout: 5000 }).then((r) => r.data).catch(() => null);
    const allTime = profile?.all_time;
    if (allTime?.total_count >= 1)  unlocked.add("first_scan");
    if (allTime?.total_count >= 10) unlocked.add("ten_scans");

    // Check budgets
    const budgets = await axios.get(`${API_BASE_URL}/budgets`, { timeout: 5000 }).then((r) => r.data.budgets || []).catch(() => []);
    if (budgets.some((b) => b.budget != null)) unlocked.add("first_budget");

    // From AsyncStorage
    const [goals, recurring, debts, shared, imported] = await Promise.all([
      AsyncStorage.getItem("savings_goals").then((r) => r ? JSON.parse(r) : []).catch(() => []),
      AsyncStorage.getItem(RECURRING_KEY).then((r) => r ? JSON.parse(r) : []).catch(() => []),
      AsyncStorage.getItem("debts").then((r) => r ? JSON.parse(r) : []).catch(() => []),
      AsyncStorage.getItem("shared_once").catch(() => null),
      AsyncStorage.getItem("imported_once").catch(() => null),
    ]);

    if (goals.length > 0) unlocked.add("first_goal");
    if (goals.some((g) => g.saved >= g.target && g.target > 0)) unlocked.add("goal_done");
    if (goals.some((g) => g.saved >= 10000)) unlocked.add("save_10k");
    if (recurring.length > 0) unlocked.add("first_recur");
    if (debts.length > 0) unlocked.add("first_debt");
    if (shared === "true") unlocked.add("shared");
    if (imported === "true") unlocked.add("import_csv");

    // Theme / language
    if (themeMode === "dark") unlocked.add("dark_mode");
    if (language === "en") unlocked.add("bilingual");
  } catch {}

  return unlocked;
}

export default function AchievementsScreen() {
  const { colors, t, language, themeMode } = useApp();
  const [unlocked, setUnlocked] = useState(null);
  const s = styles(colors);

  useFocusEffect(useCallback(() => {
    computeUnlocked({ language, themeMode }).then(setUnlocked);
  }, [language, themeMode]));

  const total = ACHIEVEMENTS.length;
  const done = unlocked ? ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length : 0;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{t("achievementsTitle")}</Text>
      <Text style={s.subtitle}>{t("achievementsSubtitle")}</Text>

      {!unlocked ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={s.progressCard}>
            <Text style={s.progressText}>{done} / {total}</Text>
            <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
              <View style={{ width: `${(done / total) * 100}%`, height: "100%", backgroundColor: colors.primary, borderRadius: 4 }} />
            </View>
            <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 6 }}>
              {Math.round((done / total) * 100)}% {t("achieved")}
            </Text>
          </View>

          <View style={s.grid}>
            {ACHIEVEMENTS.map((a) => {
              const isUnlocked = unlocked.has(a.id);
              return (
                <View key={a.id} style={[s.badge, !isUnlocked && s.locked]}>
                  <Text style={[s.badgeEmoji, !isUnlocked && { opacity: 0.25 }]}>{a.emoji}</Text>
                  <Text style={[s.badgeLabel, { color: isUnlocked ? colors.text : colors.subtext }]} numberOfLines={2}>
                    {t(a.key)}
                  </Text>
                  {isUnlocked && <Text style={s.check}>✅</Text>}
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "bold", color: c.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: c.subtext, marginBottom: 16 },
  progressCard: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 20 },
  progressText: { fontSize: 28, fontWeight: "900", color: c.primary, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badge: {
    width: "30%", backgroundColor: c.card, borderRadius: 14, borderWidth: 1,
    borderColor: c.border, padding: 12, alignItems: "center", gap: 4,
  },
  locked: { opacity: 0.6 },
  badgeEmoji: { fontSize: 32 },
  badgeLabel: { fontSize: 11, fontWeight: "600", textAlign: "center", lineHeight: 14 },
  check: { fontSize: 14 },
});
