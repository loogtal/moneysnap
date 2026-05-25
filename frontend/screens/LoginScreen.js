import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Alert,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { useApp } from "../contexts/AppContext";

WebBrowser.maybeCompleteAuthSession();

// Fill in your Google Web OAuth Client ID from console.cloud.google.com
const GOOGLE_WEB_CLIENT_ID = "";

export default function LoginScreen() {
  const { colors, t, login } = useApp();
  const [busy, setBusy] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID || "unused",
  });

  useEffect(() => {
    if (response?.type === "success") {
      fetchGoogleUser(response.authentication?.accessToken);
    } else if (response?.type === "error") {
      Alert.alert(t("error"), response.error?.message ?? "Google login failed");
    }
  }, [response]);

  async function fetchGoogleUser(token) {
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const info = await res.json();
      await login({ id: info.id, name: info.name, email: info.email, picture: info.picture, provider: "google" });
    } catch {
      Alert.alert(t("error"), "ไม่สามารถดึงข้อมูล Google ได้");
    } finally {
      setBusy(false);
    }
  }

  async function handleApple() {
    try {
      const AppleAuth = require("expo-apple-authentication");
      const cred = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
      });
      const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(" ") || "Apple User";
      await login({ id: cred.user, name, email: cred.email, picture: null, provider: "apple" });
    } catch (e) {
      if (e.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert(t("error"), Platform.OS !== "ios" ? t("appleIosOnly") : "Apple Sign In ไม่สำเร็จ");
      }
    }
  }

  async function handleGuest() {
    await login({ id: "guest", name: t("guest"), email: null, picture: null, provider: "guest" });
  }

  const s = styles(colors);

  return (
    <View style={s.container}>
      <View style={s.hero}>
        <Text style={s.logo}>💰</Text>
        <Text style={s.title}>{t("loginTitle")}</Text>
        <Text style={s.subtitle}>{t("loginSubtitle")}</Text>
      </View>

      <View style={s.buttons}>
        {!!GOOGLE_WEB_CLIENT_ID && (
          <TouchableOpacity
            style={[s.btn, s.googleBtn]}
            onPress={() => promptAsync()}
            disabled={!request || busy}
          >
            <Text style={s.googleIcon}>G</Text>
            <Text style={s.googleText}>{t("signInGoogle")}</Text>
          </TouchableOpacity>
        )}

        {!GOOGLE_WEB_CLIENT_ID && (
          <TouchableOpacity style={[s.btn, s.googleBtn]} onPress={() => Alert.alert("Setup Required", "ต้องตั้งค่า GOOGLE_WEB_CLIENT_ID ก่อน")}>
            <Text style={s.googleIcon}>G</Text>
            <Text style={s.googleText}>{t("signInGoogle")}</Text>
          </TouchableOpacity>
        )}

        {Platform.OS === "ios" && (
          <TouchableOpacity style={[s.btn, s.appleBtn]} onPress={handleApple}>
            <Text style={s.appleIcon}></Text>
            <Text style={s.appleText}>{t("signInApple")}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[s.btn, s.guestBtn]} onPress={handleGuest}>
          <Text style={[s.guestText, { color: colors.subtext }]}>{t("continueGuest")}</Text>
        </TouchableOpacity>
      </View>

      {busy && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}
    </View>
  );
}

const styles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, justifyContent: "space-between", paddingVertical: 64, paddingHorizontal: 28 },
  hero: { alignItems: "center", gap: 12 },
  logo: { fontSize: 72 },
  title: { fontSize: 32, fontWeight: "800", color: c.text },
  subtitle: { fontSize: 16, color: c.subtext, textAlign: "center" },
  buttons: { gap: 12 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 14, gap: 10 },
  googleBtn: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#ddd" },
  googleIcon: { fontSize: 18, fontWeight: "700", color: "#4285F4" },
  googleText: { fontSize: 16, fontWeight: "600", color: "#333" },
  appleBtn: { backgroundColor: "#000" },
  appleIcon: { fontSize: 18, color: "#fff" },
  appleText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  guestBtn: { paddingVertical: 10 },
  guestText: { fontSize: 14, textDecorationLine: "underline" },
});
