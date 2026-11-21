// Design tokens: black and white. The photos carry the colour; the interface stays out of the way.
// Text keeps at least 4.5:1 contrast on the surfaces it sits on.

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { control: 14, card: 20, block: 24, tile: 16, round: 999 } as const;

const mono = {
  background: "#0A0A0A",
  surface: "#141414",
  raised: "#1C1C1C",
  surfaceVariant: "#232323",
  onBackground: "#FFFFFF",
  onSurfaceVariant: "#A3A3A3",
  outline: "#3D3D3D",
  hairline: "#262626",
  brand: "#FFFFFF",
  primary: "#FFFFFF",
  onPrimary: "#0A0A0A",
  primaryContainer: "#1C1C1C",
  onPrimaryContainer: "#FFFFFF",
  muted: "#1C1C1C",
  onMuted: "#FFFFFF",
  sage: "#1C1C1C",
  onSage: "#FFFFFF",
  sageInk: "#D4D4D4",
  blush: "#1C1C1C",
  onBlush: "#FFFFFF",
  accent: "#FFFFFF",
  accentContainer: "#1C1C1C",
  onAccentContainer: "#FFFFFF",
  error: "#FF8A80",
  errorContainer: "#2A1414",
  onErrorContainer: "#FFDAD6",
  shadow: "#000000",
} as const;

export type Palette = { [K in keyof typeof mono]: string };

export const palette = { light: mono as Palette, dark: mono as Palette } as const;

// Fonts ship inside the app (OFL licence), so nothing downloads at runtime.
export const fonts = {
  display: "InstrumentSerif_400Regular",
  displayItalic: "InstrumentSerif_400Regular_Italic",
  regular: "Outfit_400Regular",
  medium: "Outfit_500Medium",
  semibold: "Outfit_600SemiBold",
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 48, lineHeight: 50, letterSpacing: -0.8 },
  display: { fontFamily: fonts.display, fontSize: 38, lineHeight: 42, letterSpacing: -0.5 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 1.8 },
  number: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 20 },
} as const;

export const shadow = (_color: string, _level: 1 | 2 = 1) => ({});
