import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { TouchableOpacity, Text, View, AppState, StyleSheet } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as LocalAuthentication from "expo-local-authentication";

import { AppProvider, useApp } from "./contexts/AppContext";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import ScanScreen from "./screens/ScanScreen";
import TransactionsScreen from "./screens/TransactionsScreen";
import AnalysisScreen from "./screens/AnalysisScreen";
import EditTransactionScreen from "./screens/EditTransactionScreen";
import ImportScreen from "./screens/ImportScreen";
import SettingsScreen from "./screens/SettingsScreen";
import BudgetScreen from "./screens/BudgetScreen";

axios.defaults.timeout = 30000;

const Stack = createNativeStackNavigator();

function BiometricLock({ onUnlock, colors, t }) {
  const [authenticating, setAuthenticating] = useState(false);

  async function tryUnlock() {
    if (authenticating) return;
    setAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t("unlockPrompt"),
        fallbackLabel: t("unlock"),
        disableDeviceFallback: false,
      });
      if (result.success) {
        onUnlock();
      }
    } catch {}
    setAuthenticating(false);
  }

  useEffect(() => { tryUnlock(); }, []);

  return (
    <View style={[lockStyles.overlay, { backgroundColor: colors.bg }]}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 8 }}>
        MoneySnap
      </Text>
      <Text style={{ fontSize: 14, color: colors.subtext, marginBottom: 32 }}>
        {t("unlockPrompt")}
      </Text>
      <TouchableOpacity
        style={{ paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, backgroundColor: colors.primary }}
        onPress={tryUnlock}
        disabled={authenticating}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{t("unlock")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const lockStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
});

function AppNavigator() {
  const { user, colors, isDark, t, biometricEnabled } = useApp();
  const [locked, setLocked] = useState(biometricEnabled);
  const appState = useRef(AppState.currentState);

  // Lock when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (biometricEnabled && appState.current === "active" && nextState !== "active") {
        setLocked(true);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [biometricEnabled]);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.bg,
      card: colors.navBg,
      text: colors.text,
      border: colors.border,
    },
  };

  const headerStyle = { backgroundColor: colors.navBg };
  const headerTintColor = colors.text;

  function settingsButton(navigation) {
    return (
      <TouchableOpacity onPress={() => navigation.navigate("Settings")} style={{ marginRight: 4 }}>
        <Text style={{ fontSize: 22 }}>⚙️</Text>
      </TouchableOpacity>
    );
  }

  if (biometricEnabled && locked) {
    return <BiometricLock onUnlock={() => setLocked(false)} colors={colors} t={t} />;
  }

  if (!user) {
    return (
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={({ navigation }) => ({
          headerStyle,
          headerTintColor,
          headerRight: () => settingsButton(navigation),
        })}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "MoneySnap" }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={({ navigation }) => ({ title: t("scan"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="Transactions" component={TransactionsScreen} options={({ navigation }) => ({ title: t("transactions"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="Analysis" component={AnalysisScreen} options={({ navigation }) => ({ title: t("analysis"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="Budget" component={BudgetScreen} options={({ navigation }) => ({ title: t("budget"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="EditTransaction" component={EditTransactionScreen} options={({ navigation }) => ({ title: t("editData"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="Import" component={ImportScreen} options={({ navigation }) => ({ title: t("importCSV"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t("settings"), headerRight: () => null }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppNavigator />
    </AppProvider>
  );
}
