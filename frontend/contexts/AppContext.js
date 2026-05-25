import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TR } from "../translations";

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

const AppContext = createContext({
  colors: LIGHT, isDark: false, themeMode: "auto",
  language: "th", user: null,
  t: (k) => k,
  changeTheme: () => {}, changeLanguage: () => {},
  login: () => {}, logout: () => {},
});

export function AppProvider({ children }) {
  const system = useColorScheme();
  const [themeMode, setThemeMode] = useState("auto");
  const [language, setLanguage] = useState("th");
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [tm, lang, u] = await Promise.all([
          AsyncStorage.getItem("themeMode"),
          AsyncStorage.getItem("language"),
          AsyncStorage.getItem("user"),
        ]);
        if (tm) setThemeMode(tm);
        if (lang) setLanguage(lang);
        if (u) setUser(JSON.parse(u));
      } catch {}
      setReady(true);
    })();
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

  async function login(userData) {
    setUser(userData);
    await AsyncStorage.setItem("user", JSON.stringify(userData)).catch(() => {});
  }

  async function logout() {
    setUser(null);
    await AsyncStorage.removeItem("user").catch(() => {});
  }

  if (!ready) return null;

  return (
    <AppContext.Provider value={{ colors, isDark, themeMode, language, user, t, changeTheme, changeLanguage, login, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
