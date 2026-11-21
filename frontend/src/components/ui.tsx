// Shared building blocks: dark food-app look, short motion (150-300 ms) that respects reduced motion.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps, ReactNode, useEffect, useState } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useAppTheme } from "../theme";
import { radius, space, type } from "../theme/tokens";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const RIPPLE = { color: "rgba(255,255,255,0.12)" };

/** Fades and rises in once (40 ms stagger, capped at 6). Still when reduced motion is on. */
export function Reveal({ index = 0, children, style }: { index?: number; children: ReactNode; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  if (reduced) return <View style={style}>{children}</View>;
  return (
    <Animated.View style={style} entering={FadeInDown.duration(260).delay(Math.min(index, 6) * 40).easing(EASE).reduceMotion(ReduceMotion.System)}>
      {children}
    </Animated.View>
  );
}

/** Soft radial glow made of stacked translucent circles (decorative, hidden from screen readers). */
export function Glow({ size = 220, color, style, strength = 1 }: { size?: number; color?: string; style?: ViewStyle; strength?: number }) {
  const { custom: c } = useAppTheme();
  const rings = [1, 0.82, 0.64, 0.48, 0.34, 0.22];
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ position: "absolute", width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}
    >
      {rings.map((r) => (
        <View key={r} style={{ position: "absolute", width: size * r, height: size * r, borderRadius: size, backgroundColor: color ?? c.primary, opacity: 0.07 * strength }} />
      ))}
    </View>
  );
}

/** Square icon tile with a glow, standing in for a food photo. */
export function IconTile({ icon, size = 64, tone = "green" }: { icon: IconName; size?: number; tone?: "green" | "dark" }) {
  const { custom: c } = useAppTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.iconTile, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: tone === "green" ? c.primaryContainer : c.surfaceVariant }]}
    >
      <Glow size={size * 1.6} style={{ right: -size * 0.5, top: -size * 0.5 }} strength={1.4} />
      <MaterialCommunityIcons name={icon} size={size * 0.5} color={c.primary} />
    </View>
  );
}

export function Card({ children, style, tone = "surface" }: { children: ReactNode; style?: ViewStyle; tone?: "surface" | "muted" | "accent" | "primary" }) {
  const { custom: c } = useAppTheme();
  const bg = { surface: c.surface, muted: c.muted, accent: c.accentContainer, primary: c.primaryContainer }[tone];
  return <View style={[styles.card, { backgroundColor: bg }, style]}>{children}</View>;
}

export function Heading({ children, level = "title" }: { children: ReactNode; level?: "hero" | "display" | "title" | "heading" }) {
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

export function SectionTitle({ title, note }: { title: string; note?: string }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={styles.sectionTitle}>
      <Text accessibilityRole="header" style={[type.heading, { color: c.onBackground, flexShrink: 1 }]}>
        {title}
      </Text>
      {note ? <Text style={[type.label, { color: c.onSurfaceVariant }]}>{note}</Text> : null}
    </View>
  );
}

/** Numbered circle for steps. */
export function Numeral({ n }: { n: number }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={[styles.numeral, { borderColor: c.primary }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[type.number, { color: c.primary }]}>{n}</Text>
    </View>
  );
}

/** Small rounded label with an icon and a word (never colour alone). */
export function Tag({ icon, label, tone = "plain" }: { icon?: IconName; label: string; tone?: "plain" | "good" | "warn" }) {
  const { custom: c } = useAppTheme();
  const color = tone === "good" ? c.primary : tone === "warn" ? c.accent : c.onMuted;
  const bg = tone === "good" ? "rgba(30,213,97,0.12)" : tone === "warn" ? "rgba(244,199,86,0.12)" : c.surfaceVariant;
  return (
    <View style={[styles.tag, { backgroundColor: bg }]} accessible accessibilityLabel={label}>
      {icon ? <MaterialCommunityIcons name={icon} size={15} color={color} /> : null}
      <Text style={[type.label, { color }]}>{label}</Text>
    </View>
  );
}

export function Hairline() {
  const { custom: c } = useAppTheme();
  return <View style={{ height: 1, backgroundColor: c.hairline, marginVertical: space.md }} />;
}

/** Bar that grows from 0 to value once on mount (300 ms). */
export function Bar({ value, label }: { value: number; label: string }) {
  const { custom: c } = useAppTheme();
  const reduced = useReducedMotion();
  const w = useSharedValue(reduced ? value : 0);
  useEffect(() => {
    w.value = reduced ? value : withTiming(value, { duration: 300, easing: EASE, reduceMotion: ReduceMotion.System });
  }, [value, reduced, w]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, w.value)) * 100}%` }));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={[styles.barTrack, { backgroundColor: c.surfaceVariant }]}>
      <Animated.View style={[styles.barFill, { backgroundColor: c.primary }, fill]} />
    </View>
  );
}

/** Collapsible section, closed by default. Height animates via a layout transition; the chevron rotates. */
export function Expander({ title, children, icon = "book-open-variant" }: { title: string; children: ReactNode; icon?: IconName }) {
  const { custom: c } = useAppTheme();
  const [open, setOpen] = useState(false);
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withTiming(open ? 180 : 0, { duration: 200, reduceMotion: ReduceMotion.System });
  }, [open, turn]);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  return (
    <Animated.View layout={LinearTransition.duration(200).reduceMotion(ReduceMotion.System)}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        accessibilityHint={open ? "Collapses this section" : "Expands this section"}
        android_ripple={RIPPLE}
        style={styles.expander}
      >
        <MaterialCommunityIcons name={icon} size={20} color={c.primary} />
        <Text style={[type.bodyStrong, { color: c.primary, flex: 1 }]}>{title}</Text>
        <Animated.View style={chevron}>
          <MaterialCommunityIcons name="chevron-down" size={24} color={c.primary} />
        </Animated.View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)} exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}>
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** Caution banner: icon plus the word "Caution", announced politely when it appears. */
export function Caution({ children }: { children: ReactNode }) {
  const { custom: c } = useAppTheme();
  return (
    <View accessibilityLiveRegion="polite" accessible accessibilityRole="alert" style={[styles.caution, { backgroundColor: c.accentContainer }]}>
      <MaterialCommunityIcons name="alert-circle" size={26} color={c.accent} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.label, { color: c.accent }]}>Caution</Text>
        <Text style={[type.bodyStrong, { color: c.onAccentContainer }]}>{children}</Text>
      </View>
    </View>
  );
}

/** The green action. Press scale and ripple. */
export function PrimaryButton({ label, onPress, disabled, icon = "arrow-right", a11yLabel }: { label: string; onPress: () => void; disabled?: boolean; icon?: IconName; a11yLabel?: string }) {
  const { custom: c } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={a11yLabel ?? label}
      android_ripple={RIPPLE}
      style={({ pressed }) => [styles.primary, { backgroundColor: disabled ? c.surfaceVariant : c.primary, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <Text style={[type.bodyStrong, { color: disabled ? c.onSurfaceVariant : c.onPrimary, fontSize: 18, flexShrink: 1, textAlign: "center" }]}>{label}</Text>
      <MaterialCommunityIcons name={icon} size={22} color={disabled ? c.onSurfaceVariant : c.onPrimary} />
    </Pressable>
  );
}

/** One touch target: icon, label, optional sub-label and the checked or selected state. */
export function CheckRow({ icon, title, sub, selected, onPress, role }: { icon: IconName; title: string; sub?: string; selected: boolean; onPress: () => void; role: "checkbox" | "radio" }) {
  const { custom: c } = useAppTheme();
  const mark: IconName = role === "checkbox" ? (selected ? "checkbox-marked" : "checkbox-blank-outline") : selected ? "radiobox-marked" : "radiobox-blank";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === "checkbox" ? { checked: selected } : { selected }}
      accessibilityLabel={sub ? `${title}, ${sub}` : title}
      android_ripple={RIPPLE}
      style={({ pressed }) => [styles.row, { backgroundColor: selected ? c.primaryContainer : c.surface, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: selected ? "rgba(10,11,13,0.35)" : c.surfaceVariant }]}>
        <MaterialCommunityIcons name={icon} size={22} color={c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.bodyStrong, { color: c.onBackground }]}>{title}</Text>
        {sub ? <Text style={[type.small, { color: selected ? c.onBackground : c.onSurfaceVariant }]}>{sub}</Text> : null}
      </View>
      <MaterialCommunityIcons name={mark} size={26} color={selected ? c.primary : c.onSurfaceVariant} />
    </Pressable>
  );
}

export function StateView({ kind, title, message, action }: { kind: "loading" | "empty" | "error"; title: string; message?: string; action?: ReactNode }) {
  const { custom: c } = useAppTheme();
  const icon: IconName = kind === "error" ? "pot-steam-outline" : "basket-outline";
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      <View style={styles.stateIcon}>
        <Glow size={160} strength={1.3} />
        {kind === "loading" ? <ActivityIndicator size="large" color={c.primary} /> : <MaterialCommunityIcons name={icon} size={56} color={c.primary} />}
      </View>
      <Text style={[type.title, { color: c.onBackground, textAlign: "center" }]}>{title}</Text>
      {message ? <Text style={[type.body, { color: c.onSurfaceVariant, textAlign: "center" }]}>{message}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: space.lg },
  iconTile: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
  sectionTitle: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: space.sm, marginBottom: space.md },
  numeral: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radius.round, paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-start" },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  expander: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 48 },
  caution: { flexDirection: "row", alignItems: "center", gap: space.md, borderRadius: radius.card, padding: space.lg },
  primary: { minHeight: 56, borderRadius: radius.control, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, paddingHorizontal: space.xl, paddingVertical: space.sm, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 56, borderRadius: radius.control, paddingHorizontal: space.md, paddingVertical: space.sm, overflow: "hidden" },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, padding: space.xl, minHeight: 360 },
  stateIcon: { width: 160, height: 160, alignItems: "center", justifyContent: "center" },
});
