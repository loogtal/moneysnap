import React from "react";
import axios from "axios";
import { TouchableOpacity, Text } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AppProvider, useApp } from "./contexts/AppContext";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import ScanScreen from "./screens/ScanScreen";
import TransactionsScreen from "./screens/TransactionsScreen";
import AnalysisScreen from "./screens/AnalysisScreen";
import EditTransactionScreen from "./screens/EditTransactionScreen";
import ImportScreen from "./screens/ImportScreen";
import SettingsScreen from "./screens/SettingsScreen";

axios.defaults.timeout = 30000;

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, colors, isDark, t } = useApp();

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
