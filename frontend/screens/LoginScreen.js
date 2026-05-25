import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Clipboard,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import { useApp } from "../contexts/AppContext";
import { GOOGLE_CLIENT_ID } from "../config";

WebBrowser.maybeCompleteAuthSession();

// Expo auth proxy redirect URI — add this to Google Cloud Console
const REDIRECT_URI = makeRedirectUri({ useProxy: true });

export default function LoginScreen() {
  const { colors, t, login } = useApp();
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const [, response, promptAsync] = Google.useAuthRequest(
    { clientId: GOOGLE_CLIENT_ID || "placeholder" },
    { useProxy: true },
  );

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      handleGoogleToken(response.authentication?.accessToken);
    } else if (response?.type === "error") {
      Alert.alert(t("error"), response.error?.message ?? t("googleFetchFail"));
    }
  }, [response]);

  async function handleGoogleToken(token) {
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const info = await res.json();
      await login({
        id: info.id,
        name: info.name,
        email: info.email,
        picture: info.picture,
        provider: "google",
      });
    } catch {
      Alert.alert(t("error"), t("googleFetchFail"));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (!GOOGLE_CLIENT_ID) {
      Alert.alert(
        t("googleNotReady"),
        `${t("googleNotReadyMsg")}\n\nRedirect URI ที่ต้องเพิ่มใน Google Console:\n\n${REDIRECT_URI}`,
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: "Copy URI",
            onPress: () => {
              Clipboard.setString(REDIRECT_URI);
              Alert.alert("Copied!", REDIRECT_URI);
            },
          },
        ],
      );
      return;
    }
    setBusy(true);
    try {
      await promptAsync({ useProxy: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleApple() {
    setBusy(true);
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const name =
        [cred.fullName?.givenName, cred.fullName?.familyName]
          .filter(Boolean)
          .join(" ") || "Apple User";
      await login({
        id: cred.user,
        name,
        email: cred.email,
        picture: null,
        provider: "apple",
      });
    } catch (e) {
      if (e.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert(t("error"), t("appleSignInFail"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGuest() {
    setBusy(true);
    try {
      await login({
        id: "guest",
        name: t("guest"),
        email: null,
        picture: null,
        provider: "guest",
      });
    } catch {
      Alert.alert(t("error"), t("loginFailed"));
    } finally {
      setBusy(false);
    }
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
        {/* Google */}
        <TouchableOpacity
          style={[s.btn, s.googleBtn, busy && s.disabled]}
          onPress={handleGoogle}
          disabled={busy}
        >
          <Text style={s.googleIcon}>G</Text>
          <Text style={s.googleText}>{t("signInGoogle")}</Text>
        </TouchableOpacity>

        {/* Apple — only shown on iOS when available */}
        {appleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={s.appleNativeBtn}
            onPress={handleApple}
          />
        )}

        {/* Guest */}
        <TouchableOpacity
          style={[s.btn, s.guestBtn]}
          onPress={handleGuest}
          disabled={busy}
        >
          <Text style={[s.guestText, { color: colors.subtext }]}>
            {t("continueGuest")}
          </Text>
        </TouchableOpacity>
      </View>

      {busy && (
        <View style={s.busyRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[s.busyText, { color: colors.subtext }]}>
            {t("signingIn")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1, backgroundColor: c.bg,
      justifyContent: "space-between",
      paddingVertical: 64, paddingHorizontal: 28,
    },
    hero: { alignItems: "center", gap: 12 },
    logo: { fontSize: 72 },
    title: { fontSize: 32, fontWeight: "800", color: c.text },
    subtitle: { fontSize: 16, color: c.subtext, textAlign: "center" },
    buttons: { gap: 12 },
    btn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      borderRadius: 12, paddingVertical: 14, gap: 10,
    },
    disabled: { opacity: 0.6 },
    googleBtn: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#ddd" },
    googleIcon: { fontSize: 18, fontWeight: "700", color: "#4285F4" },
    googleText: { fontSize: 16, fontWeight: "600", color: "#333" },
    appleNativeBtn: { height: 50, width: "100%" },
    guestBtn: { paddingVertical: 10 },
    guestText: { fontSize: 14, textDecorationLine: "underline" },
    busyRow: {
      flexDirection: "row", alignItems: "center",
      justifyContent: "center", gap: 8, marginTop: 8,
    },
    busyText: { fontSize: 14 },
  });
