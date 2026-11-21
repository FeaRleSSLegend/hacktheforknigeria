// Plain-language helpers. Every number shown comes from the engine output or the bundle; these
// functions only choose words and round for display.
import { Bundle, ProcessingOption } from "../engine/types";

export function naira(n: number): string {
  const whole = Math.round(n);
  return "₦" + String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "Ewa (cowpea)" style: the first local name, then the short English name. */
export function plantName(bundle: Bundle, id: string): { local: string | null; english: string } {
  const ing = bundle.ingredients[id] ?? bundle.sides[id];
  if (!ing) return { local: null, english: id.replace(/_/g, " ") };
  const english = ing.name.split("(")[0].trim();
  const local = (ing.local_names ?? "").split(",")[0].trim();
  return { local: local ? local[0].toUpperCase() + local.slice(1) : null, english };
}

export function plantLabel(bundle: Bundle, id: string): string {
  const { local, english } = plantName(bundle, id);
  return local ? `${local} (${english.toLowerCase()})` : english;
}

/** Excluded-dish reasons from the engine, in plain words. Unknown reasons are shown as they are. */
export function plainReason(bundle: Bundle, reason: string): string {
  const budget = reason.match(/^over budget \(need (\d+) NGN to buy\)$/);
  if (budget) return `Needs about ${naira(Number(budget[1]))} to buy, more than your budget.`;
  if (reason === "no functional data for this dish") return "No published data yet on how these plants behave in this dish.";
  if (reason.startsWith("no usable protein: ")) {
    const parts = reason.slice("no usable protein: ".length).split("; ");
    const priced: string[] = [];
    const allergic: string[] = [];
    const other: string[] = [];
    for (const p of parts) {
      const m = p.match(/^(\S+) \((.*)\)$/);
      if (!m) continue;
      const name = plantName(bundle, m[1]).english.toLowerCase();
      if (m[2] === "price needed") priced.push(name);
      else if (m[2].startsWith("allergen")) allergic.push(name);
      else other.push(`${name}: ${m[2]}`);
    }
    const out: string[] = [];
    if (priced.length) out.push(`We do not have a market price for ${joinAnd(priced)} yet.`);
    if (allergic.length) out.push(`${cap(joinAnd(allergic))} is on your allergen list.`);
    if (other.length) out.push(other.join(". ") + ".");
    return out.join(" ");
  }
  return reason;
}

export function joinAnd(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Names and one-line plain explanations for the measured outcomes (shown only inside the evidence card). */
export const METRIC_WORDS: Record<string, { name: string; plain: string }> = {
  phytate: { name: "Phytate", plain: "A natural compound in beans that can hold on to minerals. Soaking and cooking lower it." },
  tannin: { name: "Tannin", plain: "A natural compound in bean skins. Removing skins and cooking lower it." },
  trypsin_inhibitor: { name: "Trypsin inhibitor", plain: "A natural compound in raw beans. Thorough cooking lowers it." },
  oxalate: { name: "Oxalate", plain: "A natural compound found in many plants. Some preparation steps lower it." },
};

export function effectSentence(metricName: string, range: [number, number]): string {
  const [lo, hi] = range;
  const r = (x: number) => Math.round(Math.abs(x));
  if (hi <= 0) {
    const a = r(hi);
    const b = r(lo);
    return a === b ? `${metricName} was ${a}% lower` : `${metricName} was ${a} to ${b}% lower`;
  }
  if (lo >= 0) {
    return r(lo) === r(hi) ? `${metricName} was ${r(lo)}% higher` : `${metricName} was ${r(lo)} to ${r(hi)}% higher`;
  }
  return `${metricName} ranged from ${r(lo)}% lower to ${r(hi)}% higher`;
}

export function studiesLabel(o: ProcessingOption): string {
  if (o.kind === "published_other_crop") return "Other crops";
  if (o.kind === "model") return o.evidence.startsWith("estimated from other legumes") ? "Estimated from other legumes" : "Predicted";
  const n = o.sources.length;
  return n === 1 ? "One study" : n === 2 ? "Two studies" : `${n} studies`;
}

export const isCumulative = (o: ProcessingOption) => o.evidence.toLowerCase().includes("cumulative");

export function samplesText(o: ProcessingOption, bundle: Bundle): string {
  const n = o.nRows ?? 0;
  if (o.pooledFrom) {
    const crops = o.pooledFrom.map((c) => plantName(bundle, c).english.toLowerCase());
    return `${n} published sample${n === 1 ? "" : "s"} of ${joinAnd(crops)}`;
  }
  const crop = plantName(bundle, o.cropId).english.toLowerCase();
  return `${n} published ${crop} sample${n === 1 ? "" : "s"}`;
}
