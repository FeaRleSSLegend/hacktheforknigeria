// React Native Paper MD3 theme built from the tokens, light and dark.
import { MD3DarkTheme, MD3LightTheme, MD3Theme, useTheme } from "react-native-paper";

import { Palette, palette } from "./tokens";

export type AppTheme = MD3Theme & { custom: Palette };

function build(base: MD3Theme, p: Palette): AppTheme {
  return {
    ...base,
    roundness: 3,
    colors: {
      ...base.colors,
      primary: p.primary,
      onPrimary: p.onPrimary,
      primaryContainer: p.primaryContainer,
      onPrimaryContainer: p.onPrimaryContainer,
      secondary: p.accent,
      secondaryContainer: p.accentContainer,
      onSecondaryContainer: p.onAccentContainer,
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
      elevation: {
        ...base.colors.elevation,
        level0: "transparent",
        level1: p.surface,
        level2: p.surface,
        level3: p.surfaceVariant,
      },
    },
    custom: p,
  };
}

export const lightTheme = build(MD3LightTheme, palette.light);
export const darkTheme = build(MD3DarkTheme, palette.dark);

export const useAppTheme = () => useTheme<AppTheme>();
