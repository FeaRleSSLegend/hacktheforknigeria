// Floating pill tab bar. Every item shows its icon and its label at all times; the active item is a
// filled violet squircle, inactive items stay readable on the bar. Screens read useTabBarInset() so
// their content scrolls clear of the bar.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ComponentProps, createContext, ReactNode, useContext } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../theme";
import { space, type } from "../theme/tokens";
import { IconName, useKeyboardVisible } from "./ui";

export const TAB_BAR_HEIGHT = 72;
const GAP_ABOVE = space.sm;

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

export interface TabMeta {
  label: string;
  icon: IconName;
  activeIcon: IconName;
}

const InsetCtx = createContext(0);

/** Space the tab bar takes at the bottom of the screen (0 outside the tabs). */
export const useTabBarInset = () => useContext(InsetCtx);

function bottomOffset(insetBottom: number) {
  return Math.max(insetBottom, space.md);
}

export function TabBarInsetProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <InsetCtx.Provider value={TAB_BAR_HEIGHT + bottomOffset(insets.bottom) + GAP_ABOVE}>{children}</InsetCtx.Provider>;
}

export function makeTabBar(meta: Record<string, TabMeta>) {
  return function TabBar({ state, emitter, navigateToTab }: TabBarProps) {
    const { custom: c } = useAppTheme();
    const insets = useSafeAreaInsets();
    const keyboard = useKeyboardVisible();
    if (keyboard) return null;
    return (
      <View
        accessibilityRole="tablist"
        style={[
          styles.bar,
          { bottom: 0, left: 0, right: 0, paddingBottom: bottomOffset(insets.bottom), paddingLeft: space.lg + insets.left, paddingRight: space.lg + insets.right, backgroundColor: c.background, borderColor: c.hairline },
        ]}
      >
        {state.routes.map((route, index) => {
          const m = meta[route.name];
          if (!m) return null;
          const focused = state.index === index;
          const onPress = () => {
            const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={m.label}
              android_ripple={{ color: c.primaryContainer, borderless: false }}
              style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}
            >
              <MaterialCommunityIcons name={focused ? m.activeIcon : m.icon} size={24} color={focused ? c.onBackground : c.onSurfaceVariant} />
              <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[type.label, { fontSize: 12, color: focused ? c.onBackground : c.onSurfaceVariant }]}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };
}

const styles = StyleSheet.create({
  bar: { position: "absolute", borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", paddingTop: 6 },
  item: { flex: 1, minHeight: 56, alignItems: "center", justifyContent: "center", gap: 2 },
});
