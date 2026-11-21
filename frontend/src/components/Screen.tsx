// Screen shell: a quiet header (wordmark, or a back arrow on pushed screens), a scrolling body and an
// optional single action pinned above the tab bar. Content is padded so the tab bar never covers it.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../theme";
import { fonts, space } from "../theme/tokens";
import { useTabBarInset } from "./TabBar";
import { useKeyboardVisible } from "./ui";

export function Wordmark() {
  const { custom: c } = useAppTheme();
  return (
    <Text accessibilityRole="header" accessibilityLabel="ProteinPath" style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: c.onBackground }}>
      ProteinPath
    </Text>
  );
}

export function Screen({ children, footer, backLabel, floating }: { children: ReactNode; footer?: ReactNode; backLabel?: string; floating?: ReactNode }) {
  const { custom: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const keyboard = useKeyboardVisible();
  const bottomClear = tabInset > 0 ? tabInset : insets.bottom;
  const showFooter = !!footer && !keyboard;
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={[styles.bar, { paddingLeft: space.lg + insets.left, paddingRight: space.lg + insets.right }]}>
        {backLabel ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            hitSlop={8}
            style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={c.onBackground} />
          </Pressable>
        ) : (
          <Wordmark />
        )}
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingLeft: space.lg + insets.left, paddingRight: space.lg + insets.right, paddingBottom: bottomClear + (showFooter ? 96 : floating ? 112 : space.xxl) },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {floating && !keyboard ? <View style={[styles.floating, { bottom: bottomClear + space.lg, right: space.lg + insets.right }]}>{floating}</View> : null}
      {showFooter ? (
        <View style={[styles.footer, { bottom: tabInset > 0 ? tabInset - space.sm : 0, paddingBottom: tabInset > 0 ? space.sm : space.lg + insets.bottom, backgroundColor: c.background }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", minHeight: 60 },
  back: { width: 48, height: 48, alignItems: "flex-start", justifyContent: "center" },
  body: { paddingTop: space.sm, gap: space.xxl },
  footer: { position: "absolute", left: 0, right: 0, paddingHorizontal: space.lg, paddingTop: space.sm },
  floating: { position: "absolute" },
});
