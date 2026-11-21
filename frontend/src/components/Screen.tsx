// Screen shell: round icon buttons either side of a centred wordmark, connection status, scrolling
// body, and an optional single green action pinned to the bottom.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { watchConnection } from "../lib/net";
import { useAppTheme } from "../theme";
import { fonts, space, type } from "../theme/tokens";
import { Banner, IconName } from "./ui";

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

function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { custom: c } = useAppTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => [styles.roundBtn, { backgroundColor: c.surfaceVariant, opacity: pressed ? 0.7 : 1 }]}>
      <MaterialCommunityIcons name={icon} size={22} color={c.onBackground} />
    </Pressable>
  );
}

export function ConnectionLabel() {
  const { custom: c } = useAppTheme();
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => watchConnection(setOnline), []);
  const label = online ? "Online. Works offline too" : "Offline. Everything still works";
  return (
    <View style={styles.conn} accessible accessibilityLabel={label}>
      <View style={[styles.connDot, { backgroundColor: c.primaryContainer }]}>
        <MaterialCommunityIcons name={online ? "wifi" : "wifi-off"} size={14} color={c.primary} />
      </View>
      <View>
        <Text style={[type.label, { color: c.onSurfaceVariant, fontSize: 11 }]}>Data on this phone</Text>
        <Text style={[type.label, { color: c.onBackground }]}>{online ? "Online" : "Works offline"}</Text>
      </View>
    </View>
  );
}

export function Screen({ children, footer, showBack = true, showStatus = false }: { children: ReactNode; footer?: ReactNode; showBack?: boolean; showStatus?: boolean }) {
  const { custom: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const canBack = showBack && router.canGoBack();
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        {canBack ? <RoundButton icon="chevron-left" label="Go back" onPress={() => router.back()} /> : <View style={styles.roundBtnSpace} />}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Wordmark />
        </View>
        <RoundButton icon="information-variant" label="About and limits" onPress={() => router.push("/about")} />
      </View>
      {showStatus ? (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          <ConnectionLabel />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: footer ? 130 : space.xxl + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom, backgroundColor: c.background }]}>{footer}</View> : null}
    </View>
  );
}

/** Banner link to the limits page, shown on the main screens. */
export function LimitsLink() {
  return (
    <Banner
      icon="scale-balance"
      title="Honest numbers"
      body="Published and estimated values, not lab-tested by us."
      action="See the limits"
      onPress={() => router.push("/about")}
    />
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, minHeight: 64, gap: space.sm },
  wordmark: { flexDirection: "row", alignItems: "center" },
  roundBtn: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  roundBtnSpace: { width: 48, height: 48 },
  conn: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 40 },
  connDot: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.xl },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md },
});
