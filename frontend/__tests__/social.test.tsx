// Social tab: a "Coming soon" message over a faded preview feed that screen readers skip.
import { render, screen } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import Social from "../src/app/(tabs)/social";
import { darkTheme } from "../src/theme";

test("Social shows Coming soon and hides the sample posts from screen readers", async () => {
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <PaperProvider theme={darkTheme}>
        <Social />
      </PaperProvider>
    </SafeAreaProvider>,
  );
  expect(screen.getByText("COMING SOON")).toBeTruthy();
  expect(screen.queryByText(/Tried akara/)).toBeNull();
  expect(screen.getByText(/Tried akara/, { includeHiddenElements: true })).toBeTruthy();
});
