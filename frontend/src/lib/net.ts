// The only module that touches the network. It listens to the connection state (reachability probing
// off, so NetInfo itself sends no requests) and sends Popo questions to the optional service.
// Nothing on the main path waits on the network.
import NetInfo from "@react-native-community/netinfo";

let configured = false;

export function watchConnection(onChange: (online: boolean) => void): () => void {
  if (!configured) {
    NetInfo.configure({ reachabilityShouldRun: () => false });
    configured = true;
  }
  return NetInfo.addEventListener((state) => onChange(state.isConnected === true));
}

export interface PopoTurn {
  role: "user" | "assistant";
  text: string;
}

export type PopoReply =
  | { kind: "answer"; answer: string; source: "llm" | "template" }
  | { kind: "unreachable"; reason: string };

const POPO_TIMEOUT_MS = 25_000;

/** Where the optional service runs, e.g. http://192.168.1.20:8000. Set EXPO_PUBLIC_POPO_URL when starting Expo. */
export const popoServiceUrl = (): string | null => {
  const url = process.env.EXPO_PUBLIC_POPO_URL;
  return url && /^https?:\/\//.test(url) ? url.replace(/\/+$/, "") : null;
};

/** Sends the Prepare-screen context, recent turns and the question. Never throws. */
export async function askPopo(context: Record<string, unknown>, history: PopoTurn[], question: string): Promise<PopoReply> {
  const base = popoServiceUrl();
  if (!base) return { kind: "unreachable", reason: "not set up" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POPO_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, history, question }),
      signal: controller.signal,
    });
    if (!res.ok) return { kind: "unreachable", reason: `service error ${res.status}` };
    const body: unknown = await res.json();
    if (typeof body === "object" && body !== null && "answer" in body && typeof (body as { answer: unknown }).answer === "string") {
      const b = body as { answer: string; source?: unknown };
      return { kind: "answer", answer: b.answer, source: b.source === "llm" ? "llm" : "template" };
    }
    return { kind: "unreachable", reason: "unexpected reply" };
  } catch {
    return { kind: "unreachable", reason: "no connection" };
  } finally {
    clearTimeout(timer);
  }
}
