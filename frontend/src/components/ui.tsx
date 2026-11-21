// Shared building blocks. Restraint: one accent, hairlines over heavy boxes, plain labels (no pills).
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps, ReactNode, useEffect, useState } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, Easing } from "react-native-reanimated";

import { useAppTheme } from "../theme";
import { radius, serifItalic, space, type } from "../theme/tokens";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

/** Fades and slides in once; still when the system asks for reduced motion. */
export function Reveal({ index = 0, children, style }: { index?: number; children: ReactNode; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  if (reduced) return <View style={style}>{children}</View>;
  return (
    <Animated.View style={style} entering={FadeInDown.duration(600).delay(Math.min(index, 6) * 70).easing(EASE)}>
      {children}
    </Animated.View>
  );
}

export function Card({ children, style, tone = "surface" }: { children: ReactNode; style?: ViewStyle; tone?: "surface" | "muted" | "accent" | "primary" }) {
  const { custom: c } = useAppTheme();
  const bg = { surface: c.surface, muted: c.muted, accent: c.accentContainer, primary: c.primaryContainer }[tone];
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bg, borderColor: tone === "surface" ? c.hairline : "transparent", shadowColor: "#3A2A14" },
        tone === "surface" && styles.cardShadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Heading({ children, level = "title" }: { children: ReactNode; level?: "display" | "title" | "heading" }) {
  const { custom: c } = useAppTheme();
  return (
    <Text accessibilityRole="header" style={[type[level], { color: c.onBackground }]}>
      {children}
    </Text>
  );
}

export function Body({ children, muted, strong, style }: { children: ReactNode; muted?: boolean; strong?: boolean; style?: object }) {
  const { custom: c } = useAppTheme();
  return <Text style={[strong ? type.bodyStrong : type.body, { color: muted ? c.onSurfaceVariant : c.onBackground }, style]}>{children}</Text>;
}

export function Small({ children, muted = true, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  const { custom: c } = useAppTheme();
  return <Text style={[type.small, { color: muted ? c.onSurfaceVariant : c.onBackground }, style]}>{children}</Text>;
}

/** Italic serif numeral: the one decorative accent. */
export function Numeral({ n }: { n: number }) {
  const { custom: c } = useAppTheme();
  return <Text style={[serifItalic, { fontSize: 22, lineHeight: 26, color: c.accent, minWidth: 28 }]}>{String(n).padStart(2, "0")}</Text>;
}

/** Small label with an icon: square corners and a hairline border. */
export function Tag({ icon, label, tone = "plain" }: { icon?: IconName; label: string; tone?: "plain" | "good" | "warn" }) {
  const { custom: c } = useAppTheme();
  const color = tone === "good" ? c.primary : tone === "warn" ? c.accent : c.onSurfaceVariant;
  return (
    <View style={[styles.tag, { borderColor: c.hairline }]} accessible accessibilityLabel={label}>
      {icon ? <MaterialCommunityIcons name={icon} size={16} color={color} /> : null}
      <Text style={[type.label, { color }]}>{label}</Text>
    </View>
  );
}

export function Hairline() {
  const { custom: c } = useAppTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.outline, opacity: 0.5, marginVertical: space.md }} />;
}

/** Animated bar from 0 to value (0..1). */
export function Bar({ value, label }: { value: number; label: string }) {
  const { custom: c } = useAppTheme();
  const reduced = useReducedMotion();
  const w = useSharedValue(reduced ? value : 0);
  useEffect(() => {
    w.value = reduced ? value : withTiming(value, { duration: 900, easing: EASE });
  }, [value, reduced, w]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, w.value)) * 100}%` }));
  return (
    <View accessible accessibilityLabel={label} style={[styles.barTrack, { backgroundColor: c.muted }]}>
      <Animated.View style={[styles.barFill, { backgroundColor: c.primary }, fill]} />
    </View>
  );
}

/** "How do we know?" style expander. Content mounts only when open. */
export function Expander({ title, children, icon = "book-open-variant" }: { title: string; children: ReactNode; icon?: IconName }) {
  const { custom: c } = useAppTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        style={({ pressed }) => [styles.expander, { opacity: pressed ? 0.7 : 1 }]}
      >
        <MaterialCommunityIcons name={icon} size={20} color={c.primary} />
        <Text style={[type.bodyStrong, { color: c.primary, flex: 1 }]}>{title}</Text>
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={24} color={c.primary} />
      </Pressable>
      {open ? <Reveal>{children}</Reveal> : null}
    </View>
  );
}

/** Friendly note card for safety warnings and honest caveats. */
export function Note({ icon, title, children, tone = "accent" }: { icon: IconName; title?: string; children: ReactNode; tone?: "accent" | "muted" | "primary" }) {
  const { custom: c } = useAppTheme();
  const fg = tone === "accent" ? c.onAccentContainer : tone === "primary" ? c.onPrimaryContainer : c.onMuted;
  return (
    <Card tone={tone} style={{ flexDirection: "row", gap: space.md }}>
      <MaterialCommunityIcons name={icon} size={24} color={fg} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: space.xs }}>
        {title ? <Text style={[type.bodyStrong, { color: fg }]}>{title}</Text> : null}
        <Text style={[type.small, { color: fg }]}>{children}</Text>
      </View>
    </Card>
  );
}

export function StateView({ kind, title, message, action }: { kind: "loading" | "empty" | "error"; title: string; message?: string; action?: ReactNode }) {
  const { custom: c } = useAppTheme();
  const icon: IconName = kind === "error" ? "pot-steam-outline" : "basket-outline";
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      {kind === "loading" ? <ActivityIndicator size="large" color={c.primary} /> : <MaterialCommunityIcons name={icon} size={56} color={c.accent} />}
      <Text style={[type.title, { color: c.onBackground, textAlign: "center" }]}>{title}</Text>
      {message ? <Text style={[type.body, { color: c.onSurfaceVariant, textAlign: "center" }]}>{message}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: space.lg, borderWidth: StyleSheet.hairlineWidth },
  cardShadow: { shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  barTrack: { height: 10, borderRadius: 5, overflow: "hidden" },
  barFill: { height: 10, borderRadius: 5 },
  expander: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 48 },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, padding: space.xl },
});
