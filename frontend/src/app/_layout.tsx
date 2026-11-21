// Root: providers, fonts, the opening splash and a stack with the tabs plus the detail pages on top.
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif/400Regular";
import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif/400Regular_Italic";
import { Outfit_400Regular } from "@expo-google-fonts/outfit/400Regular";
import { Outfit_500Medium } from "@expo-google-fonts/outfit/500Medium";
import { Outfit_600SemiBold } from "@expo-google-fonts/outfit/600SemiBold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { useColorScheme, View } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SPLASH_HOLD_MS, SPLASH_IN_MS, SPLASH_OUT_MS, Splash } from "../components/Splash";
import { BundleProvider } from "../state/BundleContext";
import { PlanProvider } from "../state/PlanContext";
import { themeFor } from "../theme";

type SplashPhase = "showing" | "leaving" | "gone";

export default function RootLayout() {
  // Fonts ship inside the app; if loading fails we still render with system fonts.
  const [loaded, error] = useFonts({ InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold });
  const ready = loaded || !!error;
  const theme = themeFor(useColorScheme());
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [phase, setPhase] = useState<SplashPhase>("showing");

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), SPLASH_IN_MS + SPLASH_HOLD_MS);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!ready || !minTimePassed || phase !== "showing") return;
    setPhase("leaving");
    const t = setTimeout(() => setPhase("gone"), SPLASH_OUT_MS);
    return () => clearTimeout(t);
  }, [ready, minTimePassed, phase]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {ready ? (
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <BundleProvider>
              <PlanProvider>
                <StatusBar style={phase === "gone" ? "light" : "dark"} />
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="dish/[dishId]" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen name="plant/[plantId]" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen name="plan" options={{ animation: "slide_from_bottom" }} />
                  <Stack.Screen name="prepare/[dishId]" options={{ animation: "slide_from_right" }} />
                  <Stack.Screen name="ask/[dishId]" options={{ animation: "slide_from_bottom", presentation: "modal" }} />
                </Stack>
              </PlanProvider>
            </BundleProvider>
          </PaperProvider>
        </SafeAreaProvider>
      ) : null}
      {phase !== "gone" ? <Splash leaving={phase === "leaving"} /> : null}
    </View>
  );
}
