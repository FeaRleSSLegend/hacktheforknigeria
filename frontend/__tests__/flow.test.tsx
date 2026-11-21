// Smoke test of the real screens with the bundled data. Each screen renders inside the real providers;
// navigation itself is mocked.
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ReactNode } from "react";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import About from "../src/app/(tabs)/about";
import Dishes from "../src/app/(tabs)/dishes";
import Start from "../src/app/(tabs)/index";
import Prepare from "../src/app/prepare/[dishId]";
import Suggestions from "../src/app/suggestions";
import { BundleProvider } from "../src/state/BundleContext";
import { PlanProvider } from "../src/state/PlanContext";
import { darkTheme } from "../src/theme";

// Reanimated 4's own jest mock fails to load in this setup, so a minimal stand-in covers what the UI uses.
jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual("react-native");
  const chain: Record<string, unknown> = {};
  for (const k of ["duration", "delay", "easing", "reduceMotion"]) chain[k] = () => chain;
  return {
    __esModule: true,
    default: { View },
    FadeIn: chain,
    FadeInDown: chain,
    FadeOut: chain,
    LinearTransition: chain,
    ReduceMotion: { System: "system" },
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
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: jest.fn(), canGoBack: () => true, navigate: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

// Internal rule wording that must never reach the screen.
const INTERNAL = [/safety rule not yet reviewed/i, /Show the published range for the crop/i, /sprouting alone does not remove/i, /not shown because of a safety rule/i];

const wrap = async (ui: ReactNode) =>
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <PaperProvider theme={darkTheme}>
        <BundleProvider>
          <PlanProvider>{ui}</PlanProvider>
        </BundleProvider>
      </PaperProvider>
    </SafeAreaProvider>,
  );

beforeEach(() => mockPush.mockClear());

test("Cook tab shows the two ways in, the checklist and one main button", async () => {
  await wrap(<Start />);
  expect(await screen.findByText("What can I cook with what I have?")).toBeTruthy();
  expect(screen.getByText("What do I have?")).toBeTruthy();
  expect(screen.getByText("I want to make...")).toBeTruthy();
  expect(screen.getByLabelText("Ewa, Cowpea")).toBeTruthy(); // one touch target per checklist row
  expect(screen.getByText("Works offline")).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByLabelText("Show what I can make")));
  expect(mockPush).toHaveBeenCalledWith("/suggestions");
});

test("Results card shows price and protein with what they are for; evidence starts closed", async () => {
  await wrap(<Suggestions />);
  expect(await screen.findByText("You can make")).toBeTruthy();
  expect(screen.getByText("Akara")).toBeTruthy();
  expect(screen.getAllByText("total for 4 people (₦218 each)").length).toBeGreaterThan(0);
  expect(screen.getAllByText("protein ingredient only, no oil or spices").length).toBeGreaterThan(0);
  expect(screen.getAllByText("protein per person").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Fit for this dish").length).toBeGreaterThan(0);
  expect(screen.queryByText("Published values")).toBeNull(); // inside the closed evidence section
  expect(screen.getByText("Not available yet")).toBeTruthy();
  expect(screen.getByText("We do not have a market price for bambara groundnut yet.")).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByLabelText("See how to prepare Akara")));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/prepare/[dishId]", params: { dishId: "akara", plant: "cowpea" } });
});

test("Prepare shows steps and one caution; evidence is closed by default and opens on tap", async () => {
  mockParams = { dishId: "akara", plant: "cowpea" };
  await wrap(<Prepare />);
  expect(await screen.findByText("Akara · with cowpea")).toBeTruthy();
  expect(screen.getByText("Fry the paste fully (akara).")).toBeTruthy();
  expect(screen.getByText(/Cook beans until fully soft\./)).toBeTruthy();
  expect(screen.getByLabelText("Back to results")).toBeTruthy();
  expect(screen.queryByText(/Phytate was/)).toBeNull();
  const toggle = screen.getByLabelText("How do we know?");
  expect(toggle.props.accessibilityState).toMatchObject({ expanded: false });
  await act(async () => fireEvent.press(toggle));
  expect(screen.getByText(/Phytate was 85 to 89% lower/)).toBeTruthy();
  expect(screen.getByText("We only show methods that are safe to follow at home.")).toBeTruthy();
});

test.each([
  ["akara", "cowpea"],
  ["egusi_soup", "groundnut"],
  ["okpa", "bambara"],
])("internal safety-rule wording never renders on %s with %s, before or after opening evidence", async (dishId, plant) => {
  mockParams = { dishId, plant };
  await wrap(<Prepare />);
  const toggle = await screen.findByLabelText("How do we know?", {}, { timeout: 5000 });
  for (const rx of INTERNAL) expect(screen.queryByText(rx)).toBeNull();
  await act(async () => fireEvent.press(toggle));
  for (const rx of INTERNAL) expect(screen.queryByText(rx)).toBeNull();
});

test("About lists the limits, including the safety-rule review status", async () => {
  await wrap(<About />);
  expect(await screen.findByText("Limits", {}, { timeout: 5000 })).toBeTruthy();
  expect(screen.getByText(/safety rules are waiting for an expert to review them/)).toBeTruthy();
  expect(screen.getByText(/Only 1 of 9 plants have a market price/)).toBeTruthy();
  expect(screen.getByText(/not yet checked against the original PDFs/)).toBeTruthy();
});

test("Dishes tab lists every dish and opens results for the one picked", async () => {
  await wrap(<Dishes />);
  const row = await screen.findByLabelText(/^Moin.moin, /, {}, { timeout: 5000 });
  expect(row.props.accessibilityRole).toBe("radio");
  await act(async () => fireEvent.press(row));
  expect(mockPush).toHaveBeenCalledWith("/suggestions");
});
