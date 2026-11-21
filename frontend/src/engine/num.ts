// Number helpers that reproduce Python's rounding, so outputs match the golden fixtures exactly.

/** Python's f"{x:.{n}f}": exact binary value, ties to even, keeps the sign of negative zero. */
export function pyFixed(x: number, n: number): string {
  let s: string;
  const exact = Math.abs(x).toFixed(Math.min(100, n + 25));
  const [ip, fp = ""] = exact.split(".");
  const tail = fp.slice(n);
  if (/^50*$/.test(tail)) {
    const kept = n > 0 ? `${ip}.${fp.slice(0, n)}` : ip;
    const lastDigit = Number(kept[kept.length - 1]);
    s = lastDigit % 2 === 0 ? kept : Math.abs(x).toFixed(n);
  } else {
    s = Math.abs(x).toFixed(n);
  }
  return x < 0 || Object.is(x, -0) ? `-${s}` : s;
}

/** Python's round(x, n). */
export function pyRound(x: number, n: number): number {
  return Number(pyFixed(x, n));
}

/** Python's f"{x:+.{n}f}". */
export function signedFixed(x: number, n: number): string {
  const s = pyFixed(x, n);
  return s.startsWith("-") ? s : `+${s}`;
}

/** Python's round(x) -> int, as a string. */
export function pyRoundInt(x: number): string {
  const v = Number(pyFixed(x, 0));
  return String(v === 0 ? 0 : v);
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Python-style sum: starts at 0 and adds left to right. */
export function sum(values: number[]): number {
  let t = 0;
  for (const v of values) t += v;
  return t;
}

/** Code-point string comparison (Python's default), for sort keys. */
export function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Lexicographic comparison of mixed tuples, like Python tuple ordering. */
export function cmpTuple(a: (number | string | boolean)[], b: (number | string | boolean)[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const x = a[i];
    const y = b[i];
    if (typeof x === "string" && typeof y === "string") {
      const c = cmpStr(x, y);
      if (c !== 0) return c;
    } else {
      const nx = Number(x);
      const ny = Number(y);
      if (nx < ny) return -1;
      if (nx > ny) return 1;
    }
  }
  return a.length - b.length;
}
