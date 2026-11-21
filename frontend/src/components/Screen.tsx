// Screen shell: back button (pushed screens only) or wordmark, a small connection indicator, a scrolling
// body and an optional single action pinned to the bottom.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { watchConnection } from "../lib/net";
import { useAppTheme } from "../theme";
import { fonts, space, type } from "../theme/tokens";

export function Wordmark() {
  const { custom: c } = useAppTheme();
  return (
    <View style={styles.wordmark} accessible accessibilityRole="header" accessibilityLabel="ProteinPath">
      <MaterialCommunityIcons name="leaf" size={20} color={c.primary} style={{ marginRight: 2, marginTop: -6 }} />
      <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: c.onBackground }}>
        Protein<Text style={{ color: c.primary, fontFamily: fonts.display }}>Path</Text>
      </Text>
    </View>
  );
}

/** Small, quiet connection indicator. The app never waits on the network. */
function ConnectionLabel() {
  const { custom: c } = useAppTheme();
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => watchConnection(setOnline), []);
  return (
    <View style={styles.conn} accessible accessibilityLabel={online ? "Online. Works offline too" : "Offline. Everything still works"}>
      <MaterialCommunityIcons name={online ? "wifi" : "wifi-off"} size={14} color={c.onSurfaceVariant} />
      <Text style={[type.label, { color: c.onSurfaceVariant }]}>{online ? "Online" : "Works offline"}</Text>
    </View>
  );
}

export function Screen({ children, footer, backLabel }: { children: ReactNode; footer?: ReactNode; backLabel?: string }) {
  const { custom: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        {backLabel ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: true }}
            style={({ pressed }) => [styles.back, { backgroundColor: c.surfaceVariant, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color={c.onBackground} />
          </Pressable>
        ) : (
          <Wordmark />
        )}
        <View style={{ flex: 1 }} />
        <ConnectionLabel />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: footer ? 130 : space.xxl }]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: space.md, backgroundColor: c.background }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, minHeight: 64, gap: space.sm },
  wordmark: { flexDirection: "row", alignItems: "center" },
  back: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  conn: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.xl },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md },
});
