// Screen shell: flat top bar (back, connection state, About and limits), scrolling body, and an
// optional single primary action pinned to the bottom.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { watchConnection } from "../lib/net";
import { useAppTheme } from "../theme";
import { space, type } from "../theme/tokens";

function ConnectionLabel() {
  const { custom: c } = useAppTheme();
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => watchConnection(setOnline), []);
  const label = online ? "Online. Works offline too" : "Offline. Everything still works";
  return (
    <View style={styles.conn} accessible accessibilityLabel={label}>
      <MaterialCommunityIcons name={online ? "wifi" : "wifi-off"} size={16} color={c.onSurfaceVariant} />
      <Text style={[type.label, { color: c.onSurfaceVariant }]}>{online ? "Online" : "Works offline"}</Text>
    </View>
  );
}

export function Screen({ children, footer, showBack = true }: { children: ReactNode; footer?: ReactNode; showBack?: boolean }) {
  const { custom: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        {showBack && router.canGoBack() ? (
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={26} color={c.onBackground} />
          </Pressable>
        ) : (
          <View style={styles.brand}>
            <MaterialCommunityIcons name="sprout" size={24} color={c.primary} />
            <Text style={[type.heading, { color: c.onBackground }]}>ProteinPath</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <ConnectionLabel />
        <Pressable onPress={() => router.push("/about")} accessibilityRole="button" accessibilityLabel="About and limits" hitSlop={8} style={styles.iconBtn}>
          <MaterialCommunityIcons name="information-outline" size={26} color={c.onBackground} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: footer ? 120 : space.xxl + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom, backgroundColor: c.background, borderTopColor: c.hairline }]}>{footer}</View>
      ) : null}
    </View>
  );
}

/** Banner link to the limits page, shown on the main screens. */
export function LimitsLink() {
  const { custom: c } = useAppTheme();
  return (
    <Pressable
      onPress={() => router.push("/about")}
      accessibilityRole="link"
      accessibilityLabel="Read what is measured and what is estimated"
      style={({ pressed }) => [styles.limits, { borderColor: c.hairline, opacity: pressed ? 0.7 : 1 }]}
    >
      <MaterialCommunityIcons name="scale-balance" size={20} color={c.onSurfaceVariant} />
      <Text style={[type.small, { color: c.onSurfaceVariant, flex: 1 }]}>
        Published and estimated values, not lab-tested by us. <Text style={{ color: c.primary, textDecorationLine: "underline" }}>See the limits</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.sm, minHeight: 56, gap: space.xs },
  brand: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.sm },
  iconBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  conn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.sm, minHeight: 48 },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.lg },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  limits: { flexDirection: "row", gap: space.sm, alignItems: "center", borderWidth: 1, borderRadius: 12, padding: space.md, minHeight: 48 },
});
