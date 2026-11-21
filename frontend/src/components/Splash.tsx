// Opening screen: the ProteinPath mark on white rises gently into place, holds, then the white layer
// fades away to reveal the app. With reduced motion it simply shows and then hides.
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { LOGO_MARK } from "../lib/brand";
import { fonts } from "../theme/tokens";

const EASE = Easing.bezier(0.22, 1, 0.36, 1);

export const SPLASH_IN_MS = 900;
export const SPLASH_HOLD_MS = 2000;
export const SPLASH_OUT_MS = 500;
export const SPLASH_TOTAL_MS = SPLASH_IN_MS + SPLASH_HOLD_MS + SPLASH_OUT_MS;

/** `leaving` starts the fade-out of the white layer; the parent unmounts it afterwards. */
export function Splash({ leaving }: { leaving: boolean }) {
  const reduced = useReducedMotion();
  const rise = useSharedValue(reduced ? 0 : 16);
  const show = useSharedValue(reduced ? 1 : 0);
  const layer = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    rise.value = withTiming(0, { duration: SPLASH_IN_MS, easing: EASE, reduceMotion: ReduceMotion.System });
    show.value = withTiming(1, { duration: SPLASH_IN_MS, easing: EASE, reduceMotion: ReduceMotion.System });
  }, [reduced, rise, show]);

  useEffect(() => {
    if (leaving) layer.value = reduced ? 0 : withDelay(0, withTiming(0, { duration: SPLASH_OUT_MS, easing: EASE, reduceMotion: ReduceMotion.System }));
  }, [leaving, reduced, layer]);

  const markStyle = useAnimatedStyle(() => ({ opacity: show.value, transform: [{ translateY: rise.value }] }));
  const layerStyle = useAnimatedStyle(() => ({ opacity: layer.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.layer, layerStyle]} pointerEvents={leaving ? "none" : "auto"} accessible accessibilityLabel="ProteinPath is loading">
      <Animated.View style={[styles.center, markStyle]}>
        <Image source={LOGO_MARK} style={styles.mark} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={styles.word}>proteinpath</Text>
      </Animated.View>
      <View />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", zIndex: 10 },
  center: { alignItems: "center", gap: 18 },
  mark: { width: 132, height: 132 },
  word: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 36, color: "#000000", letterSpacing: -0.3 },
});
