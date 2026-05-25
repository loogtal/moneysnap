import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./screens/HomeScreen";
import ScanScreen from "./screens/ScanScreen";
import TransactionsScreen from "./screens/TransactionsScreen";
import AnalysisScreen from "./screens/AnalysisScreen";
import EditTransactionScreen from "./screens/EditTransactionScreen";
import ImportScreen from "./screens/ImportScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "MoneySnap" }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: "สแกนสลิป" }} />
        <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ title: "ธุรกรรม" }} />
        <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: "วิเคราะห์" }} />
        <Stack.Screen name="EditTransaction" component={EditTransactionScreen} options={{ title: "แก้ไขธุรกรรม" }} />
        <Stack.Screen name="Import" component={ImportScreen} options={{ title: "นำเข้า Statement" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
