// Renders children only when the bundle has loaded and validated; calm states otherwise.
import { ReactNode } from "react";

import { Bundle } from "../engine/types";
import { useBundleState } from "../state/BundleContext";
import { Screen } from "./Screen";
import { Small, StateView } from "./ui";

export function BundleGate({ children }: { children: (bundle: Bundle) => ReactNode }) {
  const state = useBundleState();
  if (state.status === "loading") {
    return (
      <Screen>
        <StateView kind="loading" title="Getting the kitchen ready" message="Loading the food data on this phone." />
      </Screen>
    );
  }
  if (state.status === "error") {
    return (
      <Screen>
        <StateView
          kind="error"
          title="The food data did not load"
          message="Nothing is broken on your phone. The data file inside the app failed its checks, so we are not showing advice from it."
          action={<Small>Details for the team: {state.error}</Small>}
        />
      </Screen>
    );
  }
  return <>{children(state.bundle)}</>;
}
