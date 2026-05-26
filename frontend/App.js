import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { TouchableOpacity, Text, View, AppState, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as LocalAuthentication from "expo-local-authentication";

import { AppProvider, useApp } from "./contexts/AppContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import ScanScreen from "./screens/ScanScreen";
import TransactionsScreen from "./screens/TransactionsScreen";
import AnalysisScreen from "./screens/AnalysisScreen";
import EditTransactionScreen from "./screens/EditTransactionScreen";
import ImportScreen from "./screens/ImportScreen";
import SettingsScreen from "./screens/SettingsScreen";
import BudgetScreen from "./screens/BudgetScreen";
import GoalsScreen from "./screens/GoalsScreen";
import CustomCategoriesScreen from "./screens/CustomCategoriesScreen";
import RecurringScreen from "./screens/RecurringScreen";
import DebtScreen from "./screens/DebtScreen";
import NetWorthScreen from "./screens/NetWorthScreen";
import BillSplitScreen from "./screens/BillSplitScreen";
import AchievementsScreen from "./screens/AchievementsScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import PinLockScreen from "./screens/PinLockScreen";
import CalendarScreen from "./screens/CalendarScreen";
import CurrencyScreen from "./screens/CurrencyScreen";

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
  const { user, colors, isDark, t, biometricEnabled, pinEnabled } = useApp();
  const [locked, setLocked] = useState(biometricEnabled);
  const [pinLocked, setPinLocked] = useState(pinEnabled);
  const [onboardingDone, setOnboardingDone] = useState(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    AsyncStorage.getItem("onboarding_done").then((v) => setOnboardingDone(v === "true")).catch(() => setOnboardingDone(true));
  }, []);

  // Lock when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appState.current === "active" && nextState !== "active") {
        if (biometricEnabled) setLocked(true);
        if (pinEnabled && !biometricEnabled) setPinLocked(true);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [biometricEnabled, pinEnabled]);

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

  if (onboardingDone === null) return null;

  if (!onboardingDone) {
    return (
      <OnboardingScreen onDone={() => {
        AsyncStorage.setItem("onboarding_done", "true").catch(() => {});
        setOnboardingDone(true);
      }} />
    );
  }

  if (biometricEnabled && locked) {
    return <BiometricLock onUnlock={() => setLocked(false)} colors={colors} t={t} />;
  }

  if (pinEnabled && !biometricEnabled && pinLocked) {
    return <PinLockScreen onUnlock={() => setPinLocked(false)} />;
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
        <Stack.Screen name="Goals" component={GoalsScreen} options={({ navigation }) => ({ title: t("goalsTitle"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="CustomCategories" component={CustomCategoriesScreen} options={({ navigation }) => ({ title: t("customCatsTitle"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="Recurring" component={RecurringScreen} options={({ navigation }) => ({ title: t("recurringTitle"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="Debts" component={DebtScreen} options={({ navigation }) => ({ title: t("debtTitle"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="NetWorth" component={NetWorthScreen} options={({ navigation }) => ({ title: t("netWorthTitle"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="BillSplit" component={BillSplitScreen} options={({ navigation }) => ({ title: t("billSplitTitle"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} options={({ navigation }) => ({ title: t("achievementsTitle"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="Calendar" component={CalendarScreen} options={({ navigation }) => ({ title: t("calendarTitle"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="Currency" component={CurrencyScreen} options={({ navigation }) => ({ title: t("currencyTitle"), headerRight: () => settingsButton(navigation) })} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t("settings"), headerRight: () => null }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <AppNavigator />
      </AppProvider>
    </GestureHandlerRootView>
  );
}
