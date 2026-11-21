// Design tokens. Warm kitchen palette: cream surfaces, leaf-green primary, palm-oil orange accent.
// Text pairs are chosen for at least 4.5:1 contrast on their surfaces.
import { Platform } from "react-native";

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { control: 12, card: 20, block: 24 } as const;

export const palette = {
  light: {
    background: "#FBF6EC",
    surface: "#FFFDF8",
    surfaceVariant: "#F3EBDB",
    onBackground: "#2A2118",
    onSurfaceVariant: "#5E5245",
    outline: "#8A7B69",
    hairline: "#E5DAC6",
    primary: "#2F6B2F",
    onPrimary: "#FFFFFF",
    primaryContainer: "#DCEDCF",
    onPrimaryContainer: "#14330F",
    accent: "#A93C0B",
    accentContainer: "#FBDDC6",
    onAccentContainer: "#4E1A02",
    muted: "#EFE6D5",
    onMuted: "#4F4438",
    error: "#B3261E",
    errorContainer: "#F9DEDC",
    onErrorContainer: "#410E0B",
  },
  dark: {
    background: "#17140F",
    surface: "#211D17",
    surfaceVariant: "#2D2720",
    onBackground: "#F2E9DB",
    onSurfaceVariant: "#CFC2B0",
    outline: "#9C8D7A",
    hairline: "#3B342A",
    primary: "#A3D68E",
    onPrimary: "#0F2A09",
    primaryContainer: "#2B4D21",
    onPrimaryContainer: "#D3EFC4",
    accent: "#FFB68A",
    accentContainer: "#6A2B07",
    onAccentContainer: "#FFDDC8",
    muted: "#29241D",
    onMuted: "#D9CCBA",
    error: "#F2B8B5",
    errorContainer: "#8C1D18",
    onErrorContainer: "#F9DEDC",
  },
} as const;

export type Palette = { [K in keyof (typeof palette)["light"]]: string };

// Italic serif only for small numerals (step numbers, counters). Headings and body use the system sans.
export const serifItalic = {
  fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "Georgia, serif" }),
  fontStyle: "italic" as const,
};

export const type = {
  display: { fontSize: 34, lineHeight: 38, fontWeight: "600" as const, letterSpacing: -0.8 },
  title: { fontSize: 24, lineHeight: 29, fontWeight: "600" as const, letterSpacing: -0.4 },
  heading: { fontSize: 19, lineHeight: 24, fontWeight: "600" as const, letterSpacing: -0.2 },
  body: { fontSize: 17, lineHeight: 25, fontWeight: "400" as const },
  bodyStrong: { fontSize: 17, lineHeight: 25, fontWeight: "600" as const },
  small: { fontSize: 15, lineHeight: 21, fontWeight: "400" as const },
  label: { fontSize: 14, lineHeight: 19, fontWeight: "600" as const, letterSpacing: 0.1 },
} as const;
