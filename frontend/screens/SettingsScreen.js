import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Image, ActivityIndicator, Switch, Modal,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { API_BASE_URL } from "../config";
import { useApp } from "../contexts/AppContext";
import { requestPermission, scheduleWeeklyReminder, cancelWeeklyReminder } from "../services/notifications";

const PROVIDER_LABEL = { google: "Google", apple: "Apple ID", guest: "Guest" };

function Avatar({ uri, name, size, colors }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.border }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.primary, justifyContent: "center", alignItems: "center",
    }}>
      <Text style={{ color: "#fff", fontSize: size * 0.4, fontWeight: "700" }}>{initial}</Text>
    </View>
  );
}

function StatBox({ label, value, colors }) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 10 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.subtext, marginTop: 2, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

function Divider({ colors }) {
  return <View style={{ width: 1, height: "60%", backgroundColor: colors.border }} />;
}

export default function SettingsScreen({ navigation }) {
  const {
    colors, themeMode, language, user, t, changeTheme, changeLanguage, logout,
    notificationsEnabled, setNotificationsEnabled, biometricEnabled, setBiometricEnabled,
    pinEnabled, setPinEnabled, setPinCode,
  } = useApp();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [togglingNotif, setTogglingNotif] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [pinStep, setPinStep] = useState(0);
  const [pinInput, setPinInput] = useState("");
  const [pinFirst, setPinFirst] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const BACKUP_KEYS = ["savings_goals", "recurring_subs", "debts", "net_worth_items", "custom_categories"];

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then((has) => {
      if (has) LocalAuthentication.isEnrolledAsync().then(setBiometricSupported);
    });
  }, []);
  const s = styles(colors);

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/me`);
      setProfile(res.data);
    } catch {
      // offline — use local user data
    } finally {
      setLoading(false);
    }
  }

  async function handleNotifToggle(enabled) {
    setTogglingNotif(true);
    try {
      if (enabled) {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert(t("notifications"), t("notifPermissionRequired"));
          return;
        }
        await scheduleWeeklyReminder(t("notifWeeklyTitle"), t("notifWeeklyBody"));
        await setNotificationsEnabled(true);
      } else {
        await cancelWeeklyReminder();
        await setNotificationsEnabled(false);
      }
    } finally {
      setTogglingNotif(false);
    }
  }

  function handlePinKey(key) {
    if (key === "⌫") { setPinInput((p) => p.slice(0, -1)); return; }
    const next = pinInput + key;
    setPinInput(next);
    if (next.length === 4) {
      if (pinStep === 1) {
        setPinFirst(next);
        setPinInput("");
        setPinStep(2);
      } else {
        if (next === pinFirst) {
          setPinEnabled(true);
          setPinCode(next);
          setPinStep(0); setPinInput(""); setPinFirst("");
          Alert.alert("", t("pinSetupSuccess"));
        } else {
          setPinInput(""); setPinFirst("");
          setPinStep(1);
          Alert.alert("", t("pinMismatch"));
        }
      }
    }
  }

  function handleDisablePin() {
    Alert.alert(t("pinLock"), t("pinRemoveConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("pinDisable"), style: "destructive", onPress: () => { setPinEnabled(false); setPinCode(""); } },
    ]);
  }

  async function handleExportBackup() {
    setBackupLoading(true);
    try {
      const entries = await Promise.all(BACKUP_KEYS.map(async (k) => {
        const v = await AsyncStorage.getItem(k).catch(() => null);
        return [k, v ? JSON.parse(v) : null];
      }));
      const data = Object.fromEntries(entries.filter(([, v]) => v !== null));
      const json = JSON.stringify(data, null, 2);
      const path = `${FileSystem.documentDirectory}moneysnap_backup.json`;
      await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: "application/json", dialogTitle: t("backupExport") });
    } catch {
      Alert.alert(t("error"), t("backupFail"));
    }
    setBackupLoading(false);
  }

  async function handleImportBackup() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ["application/json", "*/*"] });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      Alert.alert(t("backup"), t("backupConfirmImport"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("backupImport"),
          onPress: async () => {
            setRestoreLoading(true);
            try {
              const content = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
              const data = JSON.parse(content);
              await Promise.all(Object.entries(data).map(([k, v]) => AsyncStorage.setItem(k, JSON.stringify(v))));
              Alert.alert("", t("backupSuccess"));
            } catch {
              Alert.alert(t("error"), t("backupFail"));
            }
            setRestoreLoading(false);
          },
        },
      ]);
    } catch {
      Alert.alert(t("error"), t("backupFail"));
    }
  }

  function handleLogout() {
    Alert.alert(t("account"), t("signOutConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("signOut"), style: "destructive", onPress: logout },
    ]);
  }

  const isGuest = !user || user.provider === "guest";
  const displayName = profile?.name ?? user?.name ?? t("guest");
  const displayEmail = profile?.email ?? user?.email ?? null;
  const displayPic = profile?.picture ?? user?.picture ?? null;
  const provider = profile?.provider ?? user?.provider ?? "guest";

  // Format member since date
  const createdAt = profile?.created_at;
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString(language === "th" ? "th-TH" : "en-US", { year: "numeric", month: "long" })
    : null;

  return (
    <>
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      {/* Profile card */}
      <View style={[s.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={s.profileTop}>
              <Avatar uri={displayPic} name={displayName} size={72} colors={colors} />
              <View style={s.profileInfo}>
                <Text style={s.profileName} numberOfLines={1}>{displayName}</Text>
                {displayEmail ? (
                  <Text style={s.profileEmail} numberOfLines={1}>{displayEmail}</Text>
                ) : null}
                <View style={s.providerBadge}>
                  <Text style={s.providerText}>{PROVIDER_LABEL[provider] ?? provider}</Text>
                </View>
                {memberSince ? (
                  <Text style={s.memberSince}>{t("memberSince")} {memberSince}</Text>
                ) : null}
              </View>
            </View>

            {/* Stats */}
            {profile?.this_month && (
              <View style={[s.statsRow, { borderTopColor: colors.border }]}>
                <StatBox
                  label={t("thisMonthIncome")}
                  value={`฿${profile.this_month.income.toFixed(0)}`}
                  colors={colors}
                />
                <Divider colors={colors} />
                <StatBox
                  label={t("thisMonthExpense")}
                  value={`฿${profile.this_month.expense.toFixed(0)}`}
                  colors={colors}
                />
                <Divider colors={colors} />
                <StatBox
                  label={t("allTimeTx")}
                  value={String(profile.all_time?.total_count ?? 0)}
                  colors={colors}
                />
              </View>
            )}

            <TouchableOpacity style={s.signOutBtn} onPress={handleLogout}>
              <Text style={s.signOutText}>{t("signOut")}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Language */}
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

      {/* Notifications */}
      <Section label={t("notifications")} colors={colors}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>{t("notifToggle")}</Text>
          {togglingNotif ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotifToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
            />
          )}
        </View>
      </Section>

      {/* Biometric */}
      {biometricSupported && (
        <Section label={t("biometric")} colors={colors}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>{t("biometricToggle")}</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </Section>
      )}

      {/* Custom Categories */}
      <Section label={t("customCats")} colors={colors}>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          onPress={() => navigation.navigate("CustomCategories")}
        >
          <Text style={{ fontSize: 14, color: colors.text }}>{t("customCatsSubtitle")}</Text>
          <Text style={{ color: colors.subtext, fontSize: 16, marginLeft: 8 }}>›</Text>
        </TouchableOpacity>
      </Section>

      {/* PIN Lock */}
      <Section label={t("pinLock")} colors={colors}>
        {pinEnabled ? (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 14, color: colors.text }}>{t("pinEnabled")}</Text>
            <TouchableOpacity
              style={{ paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.danger, alignItems: "center" }}
              onPress={handleDisablePin}
            >
              <Text style={{ color: colors.danger, fontWeight: "600" }}>{t("pinDisable")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            onPress={() => { setPinStep(1); setPinInput(""); setPinFirst(""); }}
          >
            <Text style={{ fontSize: 14, color: colors.text }}>{t("pinEnable")}</Text>
            <Text style={{ color: colors.subtext, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        )}
      </Section>

      {/* Backup & Restore */}
      <Section label={t("backup")} colors={colors}>
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            onPress={handleExportBackup}
            disabled={backupLoading}
          >
            <Text style={{ fontSize: 14, color: colors.text }}>{t("backupExport")}</Text>
            {backupLoading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={{ color: colors.subtext, fontSize: 16 }}>›</Text>}
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            onPress={handleImportBackup}
            disabled={restoreLoading}
          >
            <Text style={{ fontSize: 14, color: colors.text }}>{t("backupImport")}</Text>
            {restoreLoading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={{ color: colors.subtext, fontSize: 16 }}>›</Text>}
          </TouchableOpacity>
        </View>
      </Section>

      {/* Theme */}
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

    </ScrollView>

      {/* PIN Setup Modal */}
      <Modal visible={pinStep > 0} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "#00000088", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 32, alignItems: "center", width: 300, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 6 }}>
              {pinStep === 1 ? t("pinEnterNew") : t("pinConfirm")}
            </Text>
            <View style={{ flexDirection: "row", gap: 14, marginVertical: 22 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: pinInput.length > i ? colors.primary : colors.border }} />
              ))}
            </View>
            {[["1","2","3"],["4","5","6"],["7","8","9"],["","0","⌫"]].map((row, ri) => (
              <View key={ri} style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
                {row.map((key, ki) =>
                  key === "" ? <View key={ki} style={{ width: 62, height: 46 }} /> : (
                    <TouchableOpacity
                      key={ki}
                      style={{ width: 62, height: 46, borderRadius: 10, backgroundColor: key === "⌫" ? colors.chip : colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
                      onPress={() => handlePinKey(key)}
                    >
                      <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text }}>{key}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            ))}
            <TouchableOpacity onPress={() => { setPinStep(0); setPinInput(""); setPinFirst(""); }} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.subtext, fontSize: 14 }}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Section({ label, colors, children }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <Text style={{
        fontSize: 12, fontWeight: "700", color: colors.sectionLabel,
        textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
      }}>
        {label}
      </Text>
      <View style={{
        backgroundColor: colors.surface, borderRadius: 14,
        padding: 16, borderWidth: 1, borderColor: colors.border,
      }}>
        {children}
      </View>
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
  profileCard: {
    borderRadius: 16, borderWidth: 1, marginBottom: 28,
    overflow: "hidden",
  },
  profileTop: {
    flexDirection: "row", alignItems: "center",
    gap: 16, padding: 20,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: "700", color: c.text },
  profileEmail: { fontSize: 13, color: c.subtext, marginTop: 2 },
  providerBadge: {
    marginTop: 6, alignSelf: "flex-start",
    backgroundColor: c.chip, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  providerText: { fontSize: 11, fontWeight: "600", color: c.primary },
  memberSince: { fontSize: 11, color: c.subtext, marginTop: 4 },
  statsRow: {
    flexDirection: "row", alignItems: "center",
    borderTopWidth: 1, paddingHorizontal: 8,
  },
  signOutBtn: {
    marginHorizontal: 20, marginBottom: 16, marginTop: 4,
    paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: c.danger, alignItems: "center",
  },
  signOutText: { color: c.danger, fontWeight: "600", fontSize: 14 },
});
