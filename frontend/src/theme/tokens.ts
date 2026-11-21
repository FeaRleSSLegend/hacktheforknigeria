// Design tokens. Dark, food-app look: near-black base, vivid leaf green, deep green blocks, warm yellow.
// Text pairs keep at least 4.5:1 contrast on their surfaces.

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { control: 16, card: 24, block: 28, round: 999 } as const;

const dark = {
  background: "#0A0B0D",
  surface: "#17181B",
  surfaceVariant: "#232426",
  onBackground: "#FFFFFF",
  onSurfaceVariant: "#A7A9AF",
  outline: "#5C5E64",
  hairline: "#26272B",
  primary: "#1ED561",
  onPrimary: "#05210F",
  primaryContainer: "#0B6B44",
  onPrimaryContainer: "#FFFFFF",
  deep: "#0A935B",
  accent: "#F4C756",
  accentContainer: "#3A3016",
  onAccentContainer: "#FBE3A0",
  muted: "#1C1D20",
  onMuted: "#C9CBD0",
  error: "#FF8A80",
  errorContainer: "#5C1A16",
  onErrorContainer: "#FFDAD6",
} as const;

// The app is dark-first (both entries point at the same palette so older imports keep working).
export const palette = { light: dark, dark } as const;

export type Palette = { [K in keyof typeof dark]: string };

// Bundled Google Fonts (shipped inside the app, so nothing downloads at runtime).
export const fonts = {
  display: "Baloo2_800ExtraBold",
  regular: "Outfit_400Regular",
  medium: "Outfit_500Medium",
  semibold: "Outfit_600SemiBold",
  bold: "Outfit_700Bold",
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44 },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 25 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 25 },
  small: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
  number: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
} as const;
