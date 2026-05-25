import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { useApp } from "../contexts/AppContext";

const PROVIDER_LABEL = { google: "Google", apple: "Apple ID", guest: "Guest" };

export default function SettingsScreen() {
  const { colors, themeMode, language, user, t, changeTheme, changeLanguage, logout } = useApp();
  const s = styles(colors);

  function handleLogout() {
    Alert.alert(t("account"), t("signOutConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("signOut"), style: "destructive", onPress: logout },
    ]);
  }

  const isGuest = !user || user.provider === "guest";

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      <Section label={t("language")} colors={colors}>
        <SegmentRow
          options={[
            { key: "th", label: "🇹🇭  ภาษาไทย" },
            { key: "en", label: "🇺🇸  English" },
          ]}
          value={language}
          onChange={changeLanguage}
          colors={colors}
        />
      </Section>

      <Section label={t("theme")} colors={colors}>
        <SegmentRow
          options={[
            { key: "light", label: "☀️  " + t("themeLight") },
            { key: "auto",  label: "⚙️  " + t("themeAuto") },
            { key: "dark",  label: "🌙  " + t("themeDark") },
          ]}
          value={themeMode}
          onChange={changeTheme}
          colors={colors}
        />
      </Section>

      <Section label={t("account")} colors={colors}>
        <View style={s.accountRow}>
          <View style={s.accountInfo}>
            <Text style={s.accountName}>{isGuest ? t("guest") : user.name}</Text>
            {!isGuest && user.email ? (
              <Text style={s.accountEmail}>{user.email}</Text>
            ) : null}
            <View style={s.providerBadge}>
              <Text style={s.providerText}>
                {PROVIDER_LABEL[user?.provider] ?? user?.provider ?? "—"}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={s.signOutBtn} onPress={handleLogout}>
            <Text style={s.signOutText}>{t("signOut")}</Text>
          </TouchableOpacity>
        </View>
      </Section>

    </ScrollView>
  );
}

function Section({ label, colors, children }) {
  const s = StyleSheet.create({
    wrap: { marginBottom: 28 },
    label: { fontSize: 12, fontWeight: "700", color: colors.sectionLabel, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
    card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  });
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

function SegmentRow({ options, value, onChange, colors }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center",
              backgroundColor: active ? colors.primary : colors.chip,
              borderWidth: 1, borderColor: active ? colors.primary : colors.chipBorder,
            }}
            onPress={() => onChange(opt.key)}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : colors.chipText }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 20, paddingBottom: 48 },
  accountRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  accountInfo: { flex: 1, marginRight: 12 },
  accountName: { fontSize: 16, fontWeight: "700", color: c.text },
  accountEmail: { fontSize: 13, color: c.subtext, marginTop: 2 },
  providerBadge: { marginTop: 6, alignSelf: "flex-start", backgroundColor: c.chip, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  providerText: { fontSize: 11, fontWeight: "600", color: c.primary },
  signOutBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: c.danger },
  signOutText: { color: c.danger, fontSize: 13, fontWeight: "600" },
});
