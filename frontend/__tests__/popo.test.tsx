// Ask Popo: the button on Prepare, the chat with and without the optional service, and the helpers.
import fs from "fs";
import path from "path";

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ReactNode } from "react";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AskPopo from "../src/app/ask/[dishId]";
import Prepare from "../src/app/prepare/[dishId]";
import { loadBundle } from "../src/bundle/loader";
import { askPopo } from "../src/lib/net";
import { offlineAnswer, popoContext } from "../src/lib/popo";
import { preparePlan } from "../src/lib/prepare";
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
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: jest.fn(), canGoBack: () => true, navigate: jest.fn() },
  useLocalSearchParams: () => ({ dishId: "akara", plant: "cowpea" }),
}));

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

function bundle() {
  const dir = path.resolve(__dirname, "../assets/bundle");
  const raw: Record<string, unknown> = {};
  for (const f of fs.readdirSync(dir)) raw[f] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const r = loadBundle(raw);
  if (!r.ok) throw new Error(r.error);
  return r.bundle;
}

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  delete process.env.EXPO_PUBLIC_POPO_URL;
  mockPush.mockClear();
});

test("Prepare has an Ask Popo button that opens the chat for this dish", async () => {
  await wrap(<Prepare />);
  const btn = await screen.findByLabelText(/^Ask Popo/, {}, WAIT);
  await act(async () => fireEvent.press(btn));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/ask/[dishId]", params: { dishId: "akara", plant: "cowpea" } });
});

test("without the service, Popo quotes the matching published steps and says it is offline", async () => {
  await wrap(<AskPopo />);
  await act(async () => fireEvent.press(await screen.findByLabelText("Ask: Can I skip removing the skins?", {}, WAIT)));
  expect(await screen.findByText(/can't reach the internet/, {}, WAIT)).toBeTruthy();
  expect(screen.getByText("Popo · offline, from the steps")).toBeTruthy();
});

test("with the service, the checked answer is shown and labelled as AI", async () => {
  process.env.EXPO_PUBLIC_POPO_URL = "http://192.168.1.20:8000";
  const fetchMock = jest.fn(async () => ({ ok: true, json: async () => ({ answer: "Soaking again softens the beans for milling.", source: "llm", rejected: [] }) }));
  global.fetch = fetchMock as unknown as typeof fetch;
  await wrap(<AskPopo />);
  const input = await screen.findByLabelText("Your question for Popo", {}, WAIT);
  await act(async () => fireEvent.changeText(input, "Why soak twice?"));
  await act(async () => fireEvent.press(screen.getByLabelText("Send question")));
  expect(await screen.findByText("Soaking again softens the beans for milling.", {}, WAIT)).toBeTruthy();
  expect(screen.getByText("Popo · AI, checked against the steps")).toBeTruthy();
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
  expect(url).toBe("http://192.168.1.20:8000/ask");
  const sent = JSON.parse(init.body);
  expect(sent.question).toBe("Why soak twice?");
  expect(sent.context.dish).toBe("Akara");
  expect(Object.keys(sent).sort()).toEqual(["context", "history", "question"]); // no personal plan data
}, 15000);

test("askPopo never throws and reports why it could not answer", async () => {
  expect(await askPopo({}, [], "hi")).toEqual({ kind: "unreachable", reason: "not set up" });
  process.env.EXPO_PUBLIC_POPO_URL = "http://localhost:8000";
  global.fetch = jest.fn(async () => {
    throw new Error("network down");
  }) as unknown as typeof fetch;
  expect(await askPopo({}, [], "hi")).toEqual({ kind: "unreachable", reason: "no connection" });
});

test("offline answer only quotes the steps and always ends with the cooking caution", () => {
  const b = bundle();
  const dish = b.dishes.find((d) => d.id === "akara");
  if (!dish) throw new Error("akara missing");
  const ctx = popoContext(b, dish, "cowpea", preparePlan(b, dish, "cowpea", []));
  const a = offlineAnswer(ctx, "Do I need to remove the skins?");
  expect(a).toContain("remove the skins");
  expect(a.endsWith("Cook beans until fully soft.")).toBe(true);
});
