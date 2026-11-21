import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BundleProvider } from "../state/BundleContext";
import { PlanProvider } from "../state/PlanContext";
import { darkTheme, lightTheme } from "../theme";

export default function RootLayout() {
  const dark = useColorScheme() === "dark";
  const theme = dark ? darkTheme : lightTheme;
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <BundleProvider>
          <PlanProvider>
            <StatusBar style={dark ? "light" : "dark"} />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background }, animation: "slide_from_right" }} />
          </PlanProvider>
        </BundleProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
