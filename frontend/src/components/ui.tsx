// Shared building blocks. Black and white; photos carry the colour. Motion is short and respects
// reduced motion. Every touchable has a role, a label and at least 48 dp of touch area.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ComponentProps, ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, Image, ImageSourcePropType, Keyboard, Platform, Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
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
const SCRIM = ["rgba(10,10,10,0.15)", "rgba(10,10,10,0.05)", "rgba(10,10,10,0.80)", "#0A0A0A"] as const;

/** True while the on-screen keyboard is open (used to tuck away the tab bar and pinned actions). */
export function useKeyboardVisible(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

/** Fades and rises in once (short stagger, capped). Still when reduced motion is on. */
export function Reveal({ index = 0, children, style }: { index?: number; children: ReactNode; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  if (reduced) return <View style={style}>{children}</View>;
  return (
    <Animated.View style={style} entering={FadeInDown.duration(420).delay(Math.min(index, 6) * 50).easing(EASE).reduceMotion(ReduceMotion.System)}>
      {children}
    </Animated.View>
  );
}

function Photo({ source }: { source: ImageSourcePropType }) {
  return <Image source={source} style={styles.fill} resizeMode="cover" accessible={false} accessibilityIgnoresInvertColors />;
}

/** Full-bleed photo with a black scrim that fades into the page; text sits at the bottom. */
export function Poster({ source, height = 420, children, style }: { source?: ImageSourcePropType; height?: number; children?: ReactNode; style?: ViewStyle }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={[styles.poster, { height, backgroundColor: c.surface }, style]}>
      {source ? <Photo source={source} /> : null}
      <LinearGradient colors={SCRIM} locations={[0, 0.35, 0.78, 1]} style={styles.fill} pointerEvents="none" />
      <View style={styles.posterContent}>{children}</View>
    </View>
  );
}

/** Photo card for grids: image on top, name and one quiet line underneath. */
export function PhotoCard({ source, title, sub, onPress, onLongPress, longPressHint, a11yLabel, selected, checkbox, aspect = 1 }: { source?: ImageSourcePropType; title: string; sub?: string; onPress: () => void; onLongPress?: () => void; longPressHint?: string; a11yLabel: string; selected?: boolean; checkbox?: boolean; aspect?: number }) {
  const { custom: c } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={checkbox ? "checkbox" : "button"}
      accessibilityState={checkbox ? { checked: !!selected } : undefined}
      accessibilityLabel={a11yLabel}
      accessibilityHint={longPressHint}
      accessibilityActions={onLongPress ? [{ name: "longpress", label: longPressHint ?? "More" }] : undefined}
      onAccessibilityAction={(e) => (e.nativeEvent.actionName === "longpress" ? onLongPress?.() : undefined)}
      style={({ pressed }) => [styles.photoCard, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={[styles.photoFrame, { aspectRatio: aspect, backgroundColor: c.surface, borderColor: selected ? c.primary : "transparent" }]}>
        {source ? <Photo source={source} /> : <MaterialCommunityIcons name="silverware-fork-knife" size={28} color={c.outline} />}
        {selected ? (
          <View style={[styles.check, { backgroundColor: c.primary }]}>
            <MaterialCommunityIcons name="check" size={14} color={c.onPrimary} />
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={[type.bodyStrong, { color: c.onBackground }]}>
        {title}
      </Text>
      {sub ? (
        <Text numberOfLines={1} style={[type.small, { color: c.onSurfaceVariant }]}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** List row with a square photo on the left and a chevron on the right. */
export function PhotoRow({ source, title, sub, right, onPress, a11yLabel }: { source?: ImageSourcePropType; title: string; sub?: string; right?: string; onPress: () => void; a11yLabel: string }) {
  const { custom: c } = useAppTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11yLabel} android_ripple={{ color: "rgba(255,255,255,0.08)" }} style={({ pressed }) => [styles.photoRow, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.rowPhoto, { backgroundColor: c.surface }]}>{source ? <Photo source={source} /> : null}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.bodyStrong, { color: c.onBackground }]}>{title}</Text>
        {sub ? <Text style={[type.small, { color: c.onSurfaceVariant }]}>{sub}</Text> : null}
      </View>
      {right ? <Text style={[type.bodyStrong, { color: c.onBackground }]}>{right}</Text> : null}
      <MaterialCommunityIcons name="chevron-right" size={22} color={c.onSurfaceVariant} />
    </Pressable>
  );
}

/** Small round photo. Decorative. */
export function Thumb({ image, size = 36 }: { image?: ImageSourcePropType; size?: number }) {
  const { custom: c } = useAppTheme();
  if (!image) return null;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: c.surface }} accessible={false}>
      <Photo source={image} />
    </View>
  );
}

/** "Raw -> Ready" pair of photos with captions; nothing if either photo is missing. */
export function PhotoStrip({ before, after, beforeLabel, afterLabel }: { before?: ImageSourcePropType; after?: ImageSourcePropType; beforeLabel: string; afterLabel: string }) {
  const { custom: c } = useAppTheme();
  if (!before || !after) return null;
  const frame = (src: ImageSourcePropType, label: string) => (
    <View style={[styles.stripPhoto, { backgroundColor: c.surface }]}>
      <Photo source={src} />
      <LinearGradient colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.8)"]} locations={[0.5, 1]} style={styles.fill} pointerEvents="none" />
      <Text style={[type.caption, { color: c.onBackground, padding: space.md }]}>{label}</Text>
    </View>
  );
  return (
    <View style={styles.strip} accessible accessibilityLabel={`Photos: ${beforeLabel}, then ${afterLabel}`}>
      {frame(before, beforeLabel)}
      {frame(after, afterLabel)}
    </View>
  );
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

/** Spaced uppercase label, like a film credit. */
export function Caption({ children }: { children: ReactNode }) {
  const { custom: c } = useAppTheme();
  return <Text style={[type.caption, { color: c.onSurfaceVariant }]}>{children}</Text>;
}

/** Section title with an optional quiet note or a text action on the right. */
export function SectionTitle({ title, note, action }: { title: string; note?: string; action?: { label: string; onPress: () => void } }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={styles.sectionTitle}>
      <Text accessibilityRole="header" style={[type.title, { color: c.onBackground, flexShrink: 1 }]}>
        {title}
      </Text>
      {action ? (
        <Pressable onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.label} hitSlop={12} style={styles.textAction}>
          <Text style={[type.label, { color: c.onBackground, textDecorationLine: "underline" }]}>{action.label}</Text>
        </Pressable>
      ) : note ? (
        <Text style={[type.small, { color: c.onSurfaceVariant, flexShrink: 1, textAlign: "right" }]}>{note}</Text>
      ) : null}
    </View>
  );
}

/** One big number with what it is for underneath. */
export function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${value}, ${label}${sub ? `. ${sub}` : ""}`}>
      <Text style={[type.display, { color: c.onBackground }]}>{value}</Text>
      <Text style={[type.bodyStrong, { color: c.onBackground }]}>{label}</Text>
      {sub ? <Text style={[type.small, { color: c.onSurfaceVariant }]}>{sub}</Text> : null}
    </View>
  );
}

/** Outline label (never colour alone). */
export function Tag({ label, icon }: { label: string; icon?: IconName }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={[styles.tag, { borderColor: c.outline }]} accessible accessibilityLabel={label}>
      {icon ? <MaterialCommunityIcons name={icon} size={14} color={c.onSurfaceVariant} /> : null}
      <Text style={[type.label, { color: c.onSurfaceVariant }]}>{label}</Text>
    </View>
  );
}

export function Hairline() {
  const { custom: c } = useAppTheme();
  return <View style={{ height: 1, backgroundColor: c.hairline, marginVertical: space.md }} />;
}

/** Thin bar that grows once to value (0..1). */
export function Bar({ value, label }: { value: number; label: string }) {
  const { custom: c } = useAppTheme();
  const reduced = useReducedMotion();
  const w = useSharedValue(reduced ? value : 0);
  useEffect(() => {
    w.value = reduced ? value : withTiming(value, { duration: 400, easing: EASE, reduceMotion: ReduceMotion.System });
  }, [value, reduced, w]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, w.value)) * 100}%` }));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={[styles.barTrack, { backgroundColor: c.hairline }]}>
      <Animated.View style={[styles.barFill, { backgroundColor: c.primary }, fill]} />
    </View>
  );
}

/** Collapsible section, closed by default; the chevron turns and the height animates. */
export function Expander({ title, children }: { title: string; children: ReactNode }) {
  const { custom: c } = useAppTheme();
  const [open, setOpen] = useState(false);
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withTiming(open ? 180 : 0, { duration: 200, reduceMotion: ReduceMotion.System });
  }, [open, turn]);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  return (
    <Animated.View layout={LinearTransition.duration(200).reduceMotion(ReduceMotion.System)} style={[styles.expanderWrap, { borderColor: c.hairline }]}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={title} style={styles.expander}>
        <Text style={[type.bodyStrong, { color: c.onBackground, flex: 1 }]}>{title}</Text>
        <Animated.View style={chevron}>
          <MaterialCommunityIcons name="chevron-down" size={24} color={c.onSurfaceVariant} />
        </Animated.View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)} style={{ paddingBottom: space.lg, gap: space.sm }}>
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** Caution: an icon and the word "Caution" (never colour alone), announced politely. */
export function Caution({ lines }: { lines: string[] }) {
  const { custom: c } = useAppTheme();
  return (
    <View accessible accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.caution, { borderColor: c.onBackground }]}>
      <MaterialCommunityIcons name="alert-circle-outline" size={24} color={c.onBackground} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[type.caption, { color: c.onBackground }]}>CAUTION</Text>
        {lines.map((l) => (
          <Text key={l} style={[type.bodyStrong, { color: c.onBackground }]}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** The one main action: white, full width. */
export function PrimaryButton({ label, onPress, disabled, a11yLabel, compact }: { label: string; onPress: () => void; disabled?: boolean; a11yLabel?: string; compact?: boolean }) {
  const { custom: c } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={a11yLabel ?? label}
      android_ripple={{ color: "rgba(0,0,0,0.12)" }}
      style={({ pressed }) => [styles.primary, compact ? styles.compact : null, { backgroundColor: disabled ? c.surfaceVariant : c.primary, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <Text style={[type.bodyStrong, { color: disabled ? c.onSurfaceVariant : c.onPrimary, fontSize: 17, textAlign: "center" }]}>{label}</Text>
    </Pressable>
  );
}

/** Secondary action: outlined. Pass `on` to make it a toggle (shows a check and its state). */
export function OutlineButton({ label, onPress, on, a11yLabel }: { label: string; onPress: () => void; on?: boolean; a11yLabel?: string }) {
  const { custom: c } = useAppTheme();
  const toggle = on !== undefined;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={toggle ? "switch" : "button"}
      accessibilityState={toggle ? { checked: on } : undefined}
      accessibilityLabel={a11yLabel ?? label}
      style={({ pressed }) => [styles.outline, { borderColor: on ? c.primary : c.outline, backgroundColor: on ? c.primary : "transparent", transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {toggle ? <MaterialCommunityIcons name={on ? "check" : "plus"} size={18} color={on ? c.onPrimary : c.onBackground} /> : null}
      <Text style={[type.bodyStrong, { color: on ? c.onPrimary : c.onBackground }]}>{label}</Text>
    </Pressable>
  );
}

/** Minus, number, plus. */
export function Stepper({ value, onChange, min, max, label, unit }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string; unit: string }) {
  const { custom: c } = useAppTheme();
  const btn = (delta: number, icon: IconName, a11y: string) => {
    const off = value + delta < min || value + delta > max;
    return (
      <Pressable
        onPress={() => onChange(Math.max(min, Math.min(max, value + delta)))}
        disabled={off}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityState={{ disabled: off }}
        style={({ pressed }) => [styles.stepBtn, { borderColor: c.outline, opacity: off ? 0.35 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
      >
        <MaterialCommunityIcons name={icon} size={22} color={c.onBackground} />
      </Pressable>
    );
  };
  return (
    <View style={styles.stepper}>
      {btn(-1, "minus", `Fewer ${label}`)}
      <View style={{ flex: 1, alignItems: "center" }} accessible accessibilityLabel={`${value} ${unit}`} accessibilityLiveRegion="polite">
        <Text style={[type.display, { color: c.onBackground }]}>{value}</Text>
        <Text style={[type.small, { color: c.onSurfaceVariant }]}>{unit}</Text>
      </View>
      {btn(1, "plus", `More ${label}`)}
    </View>
  );
}

export function StateView({ kind, title, message, action }: { kind: "loading" | "empty" | "error"; title: string; message?: string; action?: ReactNode }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      {kind === "loading" ? <ActivityIndicator size="large" color={c.primary} /> : null}
      <Text style={[type.title, { color: c.onBackground, textAlign: "center" }]}>{title}</Text>
      {message ? <Text style={[type.body, { color: c.onSurfaceVariant, textAlign: "center" }]}>{message}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  poster: { borderRadius: radius.block, overflow: "hidden", justifyContent: "flex-end" },
  posterContent: { padding: space.xl, gap: space.sm },
  photoCard: { flex: 1, gap: 6 },
  photoFrame: { width: "100%", borderRadius: radius.card, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2 },
  check: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  photoRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 72, paddingVertical: space.sm },
  rowPhoto: { width: 64, height: 64, borderRadius: radius.tile, overflow: "hidden" },
  strip: { flexDirection: "row", gap: space.sm },
  stripPhoto: { flex: 1, height: 160, borderRadius: radius.card, overflow: "hidden", justifyContent: "flex-end" },
  sectionTitle: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.md, marginBottom: space.md },
  textAction: { minHeight: 48, justifyContent: "center" },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: radius.round, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" },
  barTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  expanderWrap: { borderTopWidth: 1 },
  expander: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 56 },
  caution: { flexDirection: "row", gap: space.md, borderWidth: 1, borderRadius: radius.card, padding: space.lg },
  primary: { minHeight: 56, borderRadius: radius.round, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xl, overflow: "hidden" },
  compact: { alignSelf: "flex-end", minHeight: 52, paddingHorizontal: space.xxl },
  outline: { minHeight: 48, borderRadius: radius.round, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, paddingHorizontal: space.lg },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.md },
  stepBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, padding: space.xl, minHeight: 320 },
});
