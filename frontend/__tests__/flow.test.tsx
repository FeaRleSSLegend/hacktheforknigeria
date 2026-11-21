// Smoke test of the real screens with the bundled data: Start, Suggestions, Prepare (akara), About.
// Each screen is rendered inside the real providers; navigation itself is mocked.
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ReactNode } from "react";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import About from "../src/app/about";
import Start from "../src/app/index";
import Prepare from "../src/app/prepare/[dishId]";
import Suggestions from "../src/app/suggestions";
import { BundleProvider } from "../src/state/BundleContext";
import { PlanProvider } from "../src/state/PlanContext";
import { lightTheme } from "../src/theme";

// Reanimated 4's own jest mock fails to load in this setup, so a minimal stand-in covers what
// src/components/ui.tsx uses.
jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual("react-native");
  const chain: Record<string, unknown> = {};
  for (const k of ["duration", "delay", "easing"]) chain[k] = () => chain;
  return {
    __esModule: true,
    default: { View },
    FadeInDown: chain,
    Easing: { bezier: () => (t: number) => t },
    useReducedMotion: () => true,
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (f: () => object) => f(),
    withTiming: (v: number) => v,
  };
});
jest.mock("@react-native-community/netinfo", () => jest.requireActual("@react-native-community/netinfo/jest/netinfo-mock.js"));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => mockParams,
}));

const wrap = async (ui: ReactNode) =>
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <PaperProvider theme={lightTheme}>
        <BundleProvider>
          <PlanProvider>{ui}</PlanProvider>
        </BundleProvider>
      </PaperProvider>
    </SafeAreaProvider>,
  );

beforeEach(() => mockPush.mockClear());

test("Start shows the two ways in with local names and one primary action", async () => {
  await wrap(<Start />);
  expect(await screen.findByText("What can I cook with what I have?")).toBeTruthy();
  expect(screen.getByText("What do I have?")).toBeTruthy();
  expect(screen.getByText("I want to make...")).toBeTruthy();
  expect(screen.getByText("Ewa")).toBeTruthy();
  expect(screen.getByText("Works offline")).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText("Show what I can make")));
  expect(mockPush).toHaveBeenCalledWith("/suggestions");
});

test("Suggestions ranks dishes with honest labels and lists dishes not available yet", async () => {
  await wrap(<Suggestions />);
  expect(await screen.findByText("You can make")).toBeTruthy();
  expect(screen.getByText("Akara")).toBeTruthy();
  expect(screen.getAllByText(/Protein only, excludes oil and spices/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/with Ewa \(cowpea\)/).length).toBeGreaterThan(0);
  expect(screen.getByText("Not available yet")).toBeTruthy();
  expect(screen.getByText("We do not have a market price for bambara groundnut yet.")).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText("Akara")));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/prepare/[dishId]", params: { dishId: "akara", plant: "cowpea" } });
});

test("Prepare for akara shows sourced steps, evidence and unreviewed safety notes", async () => {
  mockParams = { dishId: "akara", plant: "cowpea" };
  await wrap(<Prepare />);
  expect(await screen.findByText("Cook beans until fully soft")).toBeTruthy();
  expect(screen.getByText("Fry the paste fully (akara).")).toBeTruthy();
  expect(screen.getByText("What the papers found")).toBeTruthy();
  expect(screen.getByText(/Phytate was 85 to 89% lower/)).toBeTruthy();
  expect(screen.getAllByText("Published results, not a prediction").length).toBeGreaterThan(0);
  expect(screen.getByText(/not shown because of a safety rule/)).toBeTruthy();
  expect(screen.getAllByText(/safety rule not yet reviewed by an expert/).length).toBeGreaterThan(0);
});

test("About and limits states the honest facts", async () => {
  await wrap(<About />);
  expect(await screen.findByText("Nothing here was tested in a lab by us")).toBeTruthy();
  expect(screen.getByText(/Preparation advice comes from published experiments, not a prediction/)).toBeTruthy();
  expect(screen.getByText(/Plate balance .* is coming/)).toBeTruthy();
});
