// React Native Paper MD3 themes (light and dark) built from the tokens.
import { MD3DarkTheme, MD3LightTheme, MD3Theme, configureFonts, useTheme } from "react-native-paper";

import { Palette, fonts, palette } from "./tokens";

export type AppTheme = MD3Theme & { custom: Palette };

function build(base: MD3Theme, p: Palette, isDark: boolean): AppTheme {
  return {
    ...base,
    dark: isDark,
    roundness: 5,
    fonts: configureFonts({ config: { fontFamily: fonts.regular } }),
    colors: {
      ...base.colors,
      primary: p.primary,
      onPrimary: p.onPrimary,
      primaryContainer: p.primaryContainer,
      onPrimaryContainer: p.onPrimaryContainer,
      secondary: p.sageInk,
      secondaryContainer: p.sage,
      onSecondaryContainer: p.onSage,
      tertiary: p.accent,
      tertiaryContainer: p.accentContainer,
      onTertiaryContainer: p.onAccentContainer,
      background: p.background,
      onBackground: p.onBackground,
      surface: p.surface,
      onSurface: p.onBackground,
      surfaceVariant: p.surfaceVariant,
      onSurfaceVariant: p.onSurfaceVariant,
      outline: p.outline,
      outlineVariant: p.hairline,
      error: p.error,
      errorContainer: p.errorContainer,
      onErrorContainer: p.onErrorContainer,
      elevation: { ...base.colors.elevation, level0: "transparent", level1: p.surface, level2: p.raised, level3: p.raised },
    },
    custom: p,
  };
}

export const lightTheme = build(MD3LightTheme, palette.light, false);
export const darkTheme = build(MD3DarkTheme, palette.dark, true);

// One cinematic look whatever the system setting (see DESIGN_PROMPT.md).
export const themeFor = (_scheme: string | null | undefined): AppTheme => darkTheme;

export const useAppTheme = () => useTheme<AppTheme>();
