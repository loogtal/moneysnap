import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useColorScheme, View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { TR } from "../translations";
import { API_BASE_URL } from "../config";

const LIGHT = {
  bg: "#ffffff", surface: "#f8f9ff", card: "#ffffff",
  border: "#e0e7ff", text: "#111111", subtext: "#666666",
  primary: "#2d6cdf", danger: "#ef4444", success: "#16a34a",
  inputBg: "#f9fafb", inputBorder: "#d1d5db",
  chip: "#f3f4f6", chipBorder: "#d1d5db", chipText: "#555555",
  sectionLabel: "#888888", navBg: "#ffffff",
};

const DARK = {
  bg: "#0d0d0d", surface: "#1a1a2e", card: "#16213e",
  border: "#2a2a4a", text: "#f1f1f1", subtext: "#aaaaaa",
  primary: "#5b9bff", danger: "#ff6b6b", success: "#4ade80",
  inputBg: "#1e1e3a", inputBorder: "#3a3a5a",
  chip: "#1e1e3a", chipBorder: "#3a3a5a", chipText: "#cccccc",
  sectionLabel: "#888888", navBg: "#16213e",
};

function makeGuestId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const AppContext = createContext({
  colors: LIGHT, isDark: false, themeMode: "auto",
  language: "th", user: null, notificationsEnabled: false,
  biometricEnabled: false, pinEnabled: false, pinCode: "",
  t: (k) => k,
  changeTheme: () => {}, changeLanguage: () => {},
  login: async () => {}, logout: async () => {},
  setNotificationsEnabled: async () => {},
  setBiometricEnabled: async () => {},
  setPinEnabled: async () => {}, setPinCode: async () => {},
});

export function AppProvider({ children }) {
  const system = useColorScheme();
  const [themeMode, setThemeMode] = useState("auto");
  const [language, setLanguage] = useState("th");
  const [user, setUser] = useState(null);
  const [notificationsEnabled, setNotifEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [pinEnabled, setPinEnabledState] = useState(false);
  const [pinCode, setPinCodeState] = useState("");
  const [privacyMode, setPrivacyModeState] = useState(false);
  const [ready, setReady] = useState(false);
  const interceptorRef = useRef(null);

  // Restore persisted state and JWT on startup
  useEffect(() => {
    (async () => {
      try {
        const [tm, lang, u, token, notif, biometric, pinEn, pinCd, pm] = await Promise.all([
          AsyncStorage.getItem("themeMode"),
          AsyncStorage.getItem("language"),
          AsyncStorage.getItem("user"),
          AsyncStorage.getItem("authToken"),
          AsyncStorage.getItem("notificationsEnabled"),
          AsyncStorage.getItem("biometricEnabled"),
          AsyncStorage.getItem("pin_enabled"),
          AsyncStorage.getItem("pin_code"),
          AsyncStorage.getItem("privacy_mode"),
        ]);
        if (tm) setThemeMode(tm);
        if (lang) setLanguage(lang);
        if (u) setUser(JSON.parse(u));
        if (token) {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }
        if (notif === "true") setNotifEnabled(true);
        if (biometric === "true") setBiometricEnabledState(true);
        if (pinEn === "true") setPinEnabledState(true);
        if (pinCd) setPinCodeState(pinCd);
        if (pm === "true") setPrivacyModeState(true);
      } catch {}
      setReady(true);
    })();
  }, []);

  // Axios interceptor: auto-logout on 401
  useEffect(() => {
    interceptorRef.current = axios.interceptors.response.use(
      (res) => res,
      async (err) => {
        if (err.response?.status === 401) {
          await _clearSession();
        }
        return Promise.reject(err);
      }
    );
    return () => {
      if (interceptorRef.current != null) {
        axios.interceptors.response.eject(interceptorRef.current);
      }
    };
  }, []);

  const isDark = themeMode === "auto" ? system === "dark" : themeMode === "dark";
  const colors = isDark ? DARK : LIGHT;

  function t(key) {
    return TR[language]?.[key] ?? TR.th[key] ?? key;
  }

  async function changeTheme(mode) {
    setThemeMode(mode);
    await AsyncStorage.setItem("themeMode", mode).catch(() => {});
  }

  async function changeLanguage(lang) {
    setLanguage(lang);
    await AsyncStorage.setItem("language", lang).catch(() => {});
  }

  async function _clearSession() {
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
    await Promise.all([
      AsyncStorage.removeItem("user"),
      AsyncStorage.removeItem("authToken"),
    ]).catch(() => {});
  }

  async function login(userData) {
    // For guest logins, ensure a stable device-unique provider_id
    let providerId = userData.id;
    if (userData.provider === "guest") {
      let guestId = await AsyncStorage.getItem("guestId").catch(() => null);
      if (!guestId) {
        guestId = makeGuestId();
        await AsyncStorage.setItem("guestId", guestId).catch(() => {});
      }
      providerId = guestId;
    }

    // Authenticate with backend and get JWT
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, {
        provider: userData.provider,
        provider_id: providerId,
        name: userData.name ?? null,
        email: userData.email ?? null,
        picture: userData.picture ?? null,
      }, { timeout: 15000 });

      const { token, user: backendUser } = res.data;
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      await AsyncStorage.setItem("authToken", token).catch(() => {});

      const merged = {
        ...userData,
        id: backendUser.id,
        provider_id: providerId,
      };
      setUser(merged);
      await AsyncStorage.setItem("user", JSON.stringify(merged)).catch(() => {});
    } catch (err) {
      // Backend unreachable — store locally so user isn't blocked
      console.warn("Backend auth failed, continuing offline:", err?.message);
      const localUser = { ...userData, id: providerId, provider_id: providerId };
      setUser(localUser);
      await AsyncStorage.setItem("user", JSON.stringify(localUser)).catch(() => {});
    }
  }

  async function setNotificationsEnabled(enabled) {
    setNotifEnabled(enabled);
    await AsyncStorage.setItem("notificationsEnabled", String(enabled)).catch(() => {});
  }

  async function setBiometricEnabled(enabled) {
    setBiometricEnabledState(enabled);
    await AsyncStorage.setItem("biometricEnabled", String(enabled)).catch(() => {});
  }

  async function setPinEnabled(enabled) {
    setPinEnabledState(enabled);
    await AsyncStorage.setItem("pin_enabled", String(enabled)).catch(() => {});
  }

  async function setPinCode(code) {
    setPinCodeState(code);
    if (code) {
      await AsyncStorage.setItem("pin_code", code).catch(() => {});
    } else {
      await AsyncStorage.removeItem("pin_code").catch(() => {});
    }
  }

  async function togglePrivacy() {
    const next = !privacyMode;
    setPrivacyModeState(next);
    await AsyncStorage.setItem("privacy_mode", next ? "true" : "false").catch(() => {});
  }

  async function logout() {
    await _clearSession();
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#2d6cdf" />
      </View>
    );
  }

  return (
    <AppContext.Provider value={{
      colors, isDark, themeMode, language, user, notificationsEnabled, biometricEnabled,
      pinEnabled, pinCode, privacyMode, t,
      changeTheme, changeLanguage, login, logout, setNotificationsEnabled, setBiometricEnabled,
      setPinEnabled, setPinCode, togglePrivacy,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
