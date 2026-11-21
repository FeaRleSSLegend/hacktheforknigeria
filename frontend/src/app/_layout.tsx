import { Baloo2_800ExtraBold } from "@expo-google-fonts/baloo-2/800ExtraBold";
import { Outfit_400Regular } from "@expo-google-fonts/outfit/400Regular";
import { Outfit_500Medium } from "@expo-google-fonts/outfit/500Medium";
import { Outfit_600SemiBold } from "@expo-google-fonts/outfit/600SemiBold";
import { Outfit_700Bold } from "@expo-google-fonts/outfit/700Bold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BundleProvider } from "../state/BundleContext";
import { PlanProvider } from "../state/PlanContext";
import { darkTheme } from "../theme";

export default function RootLayout() {
  // Fonts ship inside the app; if loading fails we still render with system fonts.
  const [loaded, error] = useFonts({ Baloo2_800ExtraBold, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold });
  const theme = darkTheme;
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <BundleProvider>
          <PlanProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background }, animation: "slide_from_right" }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="suggestions" />
              <Stack.Screen name="prepare/[dishId]" />
            </Stack>
          </PlanProvider>
        </BundleProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
