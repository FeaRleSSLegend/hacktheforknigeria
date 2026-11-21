// Find around you (map and delivery links) and showing only the dishes that use a picked plant.
import fs from "fs";
import path from "path";

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import Find from "../src/app/find/[dishId]";
import { loadBundle } from "../src/bundle/loader";
import { ORDER_SITES, mapSearchUrl, searchName } from "../src/lib/find";
import { openExternal } from "../src/lib/net";
import { dishIdsForPicks } from "../src/lib/picks";
import { BundleProvider } from "../src/state/BundleContext";
import { PlanProvider } from "../src/state/PlanContext";
import { darkTheme } from "../src/theme";

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
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true, navigate: jest.fn() },
  useLocalSearchParams: () => ({ dishId: "ewa_agoyin" }),
}));

const WAIT = { timeout: 5000 };

function bundle() {
  const dir = path.resolve(__dirname, "../assets/bundle");
  const raw: Record<string, unknown> = {};
  for (const f of fs.readdirSync(dir)) raw[f] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const r = loadBundle(raw);
  if (!r.ok) throw new Error(r.error);
  return r.bundle;
}

afterEach(() => jest.restoreAllMocks());

test("map search uses the short dish name, near me or the typed area", () => {
  expect(searchName("Fio fio (pigeon pea porridge)")).toBe("Fio fio");
  expect(mapSearchUrl("Ewa agoyin", "", "android")).toBe("https://www.google.com/maps/search/?api=1&query=Ewa%20agoyin%20near%20me");
  expect(mapSearchUrl("Ewa agoyin", " Yaba, Lagos ", "ios")).toBe("https://maps.apple.com/?q=Ewa%20agoyin%20in%20Yaba%2C%20Lagos");
});

test("delivery links are https and include Chowdeck and Glovo", () => {
  expect(ORDER_SITES.every((s) => s.url.startsWith("https://"))).toBe(true);
  expect(ORDER_SITES.map((s) => s.id)).toEqual(expect.arrayContaining(["chowdeck", "glovo", "heyfood"]));
});

test("openExternal refuses non-https links and never throws", async () => {
  const spy = jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no app"));
  expect(await openExternal("javascript:alert(1)")).toBe(false);
  expect(spy).not.toHaveBeenCalled();
  expect(await openExternal("https://chowdeck.com/")).toBe(false);
});

test("dishes show only when a plant they use is picked", () => {
  const b = bundle();
  expect(dishIdsForPicks(b, []).size).toBe(0);
  const groundnut = dishIdsForPicks(b, ["groundnut"]);
  expect(groundnut.has("miyan_gyada")).toBe(true);
  expect(groundnut.has("akara")).toBe(false);
  const pigeon = dishIdsForPicks(b, ["pigeon_pea"]);
  expect(pigeon.has("fio_fio")).toBe(true);
  expect(pigeon.has("ewa_agoyin")).toBe(false);
});

test("Find page opens the map and a delivery app", async () => {
  const spy = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <PaperProvider theme={darkTheme}>
        <BundleProvider>
          <PlanProvider>
            <Find />
          </PlanProvider>
        </BundleProvider>
      </PaperProvider>
    </SafeAreaProvider>,
  );
  await act(async () => fireEvent.press(await screen.findByLabelText("Open the map to find Ewa agoyin near you", {}, WAIT)));
  expect(spy).toHaveBeenLastCalledWith(expect.stringContaining("Ewa%20agoyin%20near%20me"));
  await act(async () => fireEvent.press(screen.getByLabelText(/^Open Chowdeck/)));
  expect(spy).toHaveBeenLastCalledWith("https://chowdeck.com/");
  expect(screen.getByText(/does not check these sellers/)).toBeTruthy();
});
