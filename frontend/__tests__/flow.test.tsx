// Smoke test of the real screens with the bundled data. Each screen renders inside the real providers;
// navigation itself is mocked.
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ReactNode } from "react";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import About from "../src/app/(tabs)/about";
import Home from "../src/app/(tabs)/index";
import Dishes from "../src/app/(tabs)/suggestions";
import DishPage from "../src/app/dish/[dishId]";
import PlanPage from "../src/app/plan";
import PlantPage from "../src/app/plant/[plantId]";
import Prepare from "../src/app/prepare/[dishId]";
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
const mockNavigate = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: jest.fn(), canGoBack: () => true, navigate: (...a: unknown[]) => mockNavigate(...a) },
  useLocalSearchParams: () => mockParams,
}));

const INTERNAL = [/safety rule not yet reviewed/i, /Show the published range for the crop/i, /sprouting alone does not remove/i];
const WAIT = { timeout: 5000 };

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

beforeEach(() => {
  mockPush.mockClear();
  mockNavigate.mockClear();
});

test("Home starts with the kitchen: tick plants, then Done goes to the dishes you can make", async () => {
  await wrap(<Home />);
  expect(await screen.findByText("What's in your kitchen?", {}, WAIT)).toBeTruthy();
  expect(screen.queryByText(/^Done/)).toBeNull(); // no Done until something is picked
  expect(screen.queryByText(/Online|Works offline/)).toBeNull();
  const ewa = screen.getByLabelText("Ewa, Cowpea");
  expect(ewa.props.accessibilityState).toMatchObject({ checked: false });
  await act(async () => fireEvent.press(ewa));
  expect(screen.getByLabelText("Ewa, Cowpea").props.accessibilityState).toMatchObject({ checked: true });
  await act(async () => fireEvent.press(screen.getByLabelText(/^Done, 1 picked/)));
  expect(mockNavigate).toHaveBeenCalledWith("/suggestions");
  await act(async () => fireEvent.press(screen.getByLabelText(/^Akara, /)));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/dish/[dishId]", params: { dishId: "akara" } });
});

test("Dish page shows price, protein, the plant used and one main action; detail starts closed", async () => {
  mockParams = { dishId: "akara" };
  await wrap(<DishPage />);
  expect(await screen.findByText("How to prepare", {}, WAIT)).toBeTruthy();
  expect(screen.getByText("protein each")).toBeTruthy();
  expect(screen.getByText("MADE WITH")).toBeTruthy();
  expect(screen.getByLabelText("How do we know?").props.accessibilityState).toMatchObject({ expanded: false });
  expect(screen.queryByText("Published values")).toBeNull();
});

test("Plant page lists what the plant is good for and toggles 'in my kitchen'", async () => {
  mockParams = { plantId: "cowpea" };
  await wrap(<PlantPage />);
  expect(await screen.findByText("Good for", {}, WAIT)).toBeTruthy();
  const toggle = screen.getByLabelText(/Add cowpea to your kitchen/i);
  await act(async () => fireEvent.press(toggle));
  expect(screen.getByLabelText(/is in your kitchen/i).props.accessibilityState).toMatchObject({ checked: true });
});

test("Plan page has one budget field and no preset amounts", async () => {
  await wrap(<PlanPage />);
  expect(await screen.findByLabelText("Budget for this meal, in naira", {}, WAIT)).toBeTruthy();
  expect(screen.queryByLabelText("1000 naira")).toBeNull();
  expect(screen.queryByText("₦3,000")).toBeNull();
});

test("Dishes tab shows no dishes until a plant is picked", async () => {
  await wrap(<Dishes />);
  expect(await screen.findByText("Pick a plant first", {}, WAIT)).toBeTruthy();
  expect(screen.queryByLabelText(/^Akara,/)).toBeNull();
});

test.each([
  ["akara", "cowpea"],
  ["ekuru", "cowpea"],
  ["egusi_soup", "groundnut"],
])("Prepare %s with %s: steps and one caution, evidence closed, no internal rule wording", async (dishId, plant) => {
  mockParams = { dishId, plant };
  await wrap(<Prepare />);
  const toggle = await screen.findByLabelText("How do we know?", {}, WAIT);
  expect(screen.getByText("Cook beans until fully soft.")).toBeTruthy();
  for (const rx of INTERNAL) expect(screen.queryByText(rx)).toBeNull();
  await act(async () => fireEvent.press(toggle));
  for (const rx of INTERNAL) expect(screen.queryByText(rx)).toBeNull();
});

test("About lists the limits, review status and connection state", async () => {
  await wrap(<About />);
  expect(await screen.findByText("LIMITS", {}, WAIT)).toBeTruthy();
  expect(screen.getByText(/safety rules are waiting for an expert/)).toBeTruthy();
  expect(screen.getByText(/Offline now|Online now/)).toBeTruthy();
});
