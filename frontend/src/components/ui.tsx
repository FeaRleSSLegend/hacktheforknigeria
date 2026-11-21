// Shared building blocks: dark food-app look with green glow tiles, round category tiles and bold type.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps, ReactNode, useEffect, useState } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { useAppTheme } from "../theme";
import { radius, space, type } from "../theme/tokens";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

/** Fades and slides in once; still when the system asks for reduced motion. */
export function Reveal({ index = 0, children, style }: { index?: number; children: ReactNode; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  if (reduced) return <View style={style}>{children}</View>;
  return (
    <Animated.View style={style} entering={FadeInDown.duration(650).delay(Math.min(index, 6) * 80).easing(EASE)}>
      {children}
    </Animated.View>
  );
}

/** Soft radial glow made of stacked translucent circles (no blur library needed). */
export function Glow({ size = 220, color, style, strength = 1 }: { size?: number; color?: string; style?: ViewStyle; strength?: number }) {
  const { custom: c } = useAppTheme();
  const rings = [1, 0.82, 0.64, 0.48, 0.34, 0.22];
  return (
    <View pointerEvents="none" style={[{ position: "absolute", width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      {rings.map((r) => (
        <View
          key={r}
          style={{ position: "absolute", width: size * r, height: size * r, borderRadius: size, backgroundColor: color ?? c.primary, opacity: 0.07 * strength }}
        />
      ))}
    </View>
  );
}

/** Big visual block standing in for a food photo: deep green, glow and a large dish icon. */
export function HeroTile({ icon, height = 190, tone = "green", children }: { icon: IconName; height?: number; tone?: "green" | "dark"; children?: ReactNode }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={[styles.hero, { height, backgroundColor: tone === "green" ? c.primaryContainer : c.surfaceVariant }]}>
      <Glow size={height * 1.6} color={c.primary} style={{ right: -height * 0.45, top: -height * 0.35 }} strength={tone === "green" ? 1.4 : 1} />
      <Glow size={height} color={c.accent} style={{ left: -height * 0.35, bottom: -height * 0.45 }} strength={0.6} />
      <View style={[styles.heroIcon, { backgroundColor: "rgba(10,11,13,0.35)" }]}>
        <MaterialCommunityIcons name={icon} size={height * 0.42} color={c.primary} />
      </View>
      {children}
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

/** Section title with an optional quiet right-hand note, like "Top categories ... See all". */
export function SectionTitle({ title, note }: { title: string; note?: string }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={styles.sectionTitle}>
      <Text accessibilityRole="header" style={[type.heading, { color: c.onBackground }]}>
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
    <View style={[styles.numeral, { borderColor: c.primary }]}>
      <Text style={[type.number, { color: c.primary }]}>{n}</Text>
    </View>
  );
}

/** Small rounded label with an icon. */
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

/** Quiet meta line item: icon and text, like "★ 4.5  ·  30-45 min". */
export function Meta({ icon, label, color }: { icon: IconName; label: string; color?: string }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={styles.meta}>
      <MaterialCommunityIcons name={icon} size={16} color={color ?? c.primary} />
      <Text style={[type.label, { color: c.onSurfaceVariant }]}>{label}</Text>
    </View>
  );
}

export function Hairline() {
  const { custom: c } = useAppTheme();
  return <View style={{ height: 1, backgroundColor: c.hairline, marginVertical: space.md }} />;
}

/** Animated bar from 0 to value (0..1). */
export function Bar({ value, label }: { value: number; label: string }) {
  const { custom: c } = useAppTheme();
  const reduced = useReducedMotion();
  const w = useSharedValue(reduced ? value : 0);
  useEffect(() => {
    w.value = reduced ? value : withTiming(value, { duration: 1000, easing: EASE });
  }, [value, reduced, w]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, w.value)) * 100}%` }));
  return (
    <View accessible accessibilityLabel={label} style={[styles.barTrack, { backgroundColor: c.surfaceVariant }]}>
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
  const iconColor = tone === "accent" ? c.accent : tone === "primary" ? c.primary : c.onMuted;
  return (
    <Card tone={tone} style={{ flexDirection: "row", gap: space.md, overflow: "hidden" }}>
      <View style={[styles.noteIcon, { backgroundColor: "rgba(10,11,13,0.3)" }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: space.xs }}>
        {title ? <Text style={[type.bodyStrong, { color: fg }]}>{title}</Text> : null}
        <Text style={[type.small, { color: fg }]}>{children}</Text>
      </View>
    </Card>
  );
}

/** The one green action per screen. */
export function PrimaryButton({ label, onPress, disabled, icon = "arrow-right" }: { label: string; onPress: () => void; disabled?: boolean; icon?: IconName }) {
  const { custom: c } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.primary, { backgroundColor: disabled ? c.surfaceVariant : c.primary, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <Text style={[type.bodyStrong, { color: disabled ? c.onSurfaceVariant : c.onPrimary, fontSize: 18 }]}>{label}</Text>
      <MaterialCommunityIcons name={icon} size={22} color={disabled ? c.onSurfaceVariant : c.onPrimary} />
    </Pressable>
  );
}

/** Round category tile with a label underneath, like a food-app category row. */
export function CircleTile({ icon, label, sub, selected, onPress, role = "radio" }: { icon: IconName; label: string; sub?: string; selected: boolean; onPress: () => void; role?: "radio" | "checkbox" }) {
  const { custom: c } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === "radio" ? { selected } : { checked: selected }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      style={({ pressed }) => [styles.circleWrap, { opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={[styles.circle, { backgroundColor: selected ? c.primaryContainer : c.surfaceVariant, borderColor: selected ? c.primary : "transparent" }]}>
        {selected ? <Glow size={76} strength={1.4} /> : null}
        <MaterialCommunityIcons name={icon} size={30} color={selected ? c.primary : c.onMuted} />
        {selected ? (
          <View style={[styles.check, { backgroundColor: c.primary, borderColor: c.background }]}>
            <MaterialCommunityIcons name="check" size={12} color={c.onPrimary} />
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={[type.label, { color: selected ? c.onBackground : c.onSurfaceVariant, textAlign: "center" }]}>
        {label}
      </Text>
      {sub ? (
        <Text numberOfLines={1} style={[type.label, { color: c.outline, textAlign: "center", fontSize: 11 }]}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Promo-style banner: text on the left, a small green action on the right, glow behind. */
export function Banner({ title, body, action, onPress, icon }: { title: string; body: string; action: string; onPress: () => void; icon: IconName }) {
  const { custom: c } = useAppTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`${title}. ${body}. ${action}`} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <View style={[styles.banner, { backgroundColor: c.surface }]}>
        <Glow size={200} style={{ right: -70, top: -60 }} strength={1.2} />
        <View style={{ flex: 1, gap: space.sm }}>
          <Text style={[type.bodyStrong, { color: c.onBackground }]}>{title}</Text>
          <Text style={[type.small, { color: c.onSurfaceVariant }]}>{body}</Text>
          <View style={[styles.bannerBtn, { backgroundColor: c.primary }]}>
            <Text style={[type.label, { color: c.onPrimary }]}>{action}</Text>
          </View>
        </View>
        <View style={[styles.bannerIcon, { backgroundColor: c.primaryContainer }]}>
          <MaterialCommunityIcons name={icon} size={40} color={c.primary} />
        </View>
      </View>
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
  hero: { borderRadius: radius.block, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  heroIcon: { borderRadius: radius.round, padding: 22 },
  sectionTitle: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: space.md },
  numeral: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radius.round, paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-start" },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  expander: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 48 },
  noteIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  primary: { minHeight: 58, borderRadius: radius.control, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, paddingHorizontal: space.xl },
  circleWrap: { width: 84, alignItems: "center", gap: 6, paddingVertical: 4 },
  circle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "visible" },
  check: { position: "absolute", right: -2, top: -2, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  banner: { borderRadius: radius.card, padding: space.lg, flexDirection: "row", alignItems: "center", gap: space.md, overflow: "hidden" },
  bannerBtn: { alignSelf: "flex-start", borderRadius: radius.round, paddingHorizontal: 14, paddingVertical: 8, minHeight: 34, justifyContent: "center" },
  bannerIcon: { width: 84, height: 84, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, padding: space.xl, minHeight: 360 },
  stateIcon: { width: 160, height: 160, alignItems: "center", justifyContent: "center" },
});
