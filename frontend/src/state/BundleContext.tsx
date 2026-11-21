// Loads and validates the bundled data once. Never throws: a bad bundle becomes an error state.
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

import { bundledFiles } from "../bundle/bundled";
import { loadBundle } from "../bundle/loader";
import { Bundle } from "../engine/types";

export type BundleState = { status: "loading" } | { status: "ready"; bundle: Bundle } | { status: "error"; error: string };

const Ctx = createContext<BundleState>({ status: "loading" });

export function BundleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BundleState>({ status: "loading" });
  useEffect(() => {
    try {
      const r = loadBundle(bundledFiles);
      setState(r.ok ? { status: "ready", bundle: r.bundle } : { status: "error", error: r.error });
    } catch (e) {
      setState({ status: "error", error: e instanceof Error ? e.message : "unknown error" });
    }
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useBundleState = () => useContext(Ctx);
