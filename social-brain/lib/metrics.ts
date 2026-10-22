// Pure helpers for the Instagram Social Brain. No I/O here so they can be unit tested.

export type PerfClass = "breakout" | "strong" | "typical" | "underperforming" | "severe";

export const THRESHOLDS = { breakout: 2, strong: 1.25, typical: 0.75, severe: 0.5 };
export const MIN_BASELINE_SAMPLE = 8;

export function median(values: number[]): number | null {
  const v = values.filter((x) => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export function quantile(values: number[], q: number): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const pos = (v.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}

export function round(x: number | null, d = 2): number | null {
  if (x === null || !Number.isFinite(x)) return null;
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

export function relativeMultiple(plays: number | null, baselineMedian: number | null): number | null {
  if (plays === null || baselineMedian === null || baselineMedian <= 0) return null;
  return plays / baselineMedian;
}

export function classify(multiple: number | null): PerfClass | null {
  if (multiple === null) return null;
  if (multiple >= THRESHOLDS.breakout) return "breakout";
  if (multiple >= THRESHOLDS.strong) return "strong";
  if (multiple >= THRESHOLDS.typical) return "typical";
  if (multiple >= THRESHOLDS.severe) return "underperforming";
  return "severe";
}

/** Share of the account's other reels this reel beat (0..1). */
export function percentileWithin(plays: number, all: number[]): number | null {
  if (all.length < 2) return null;
  const others = all.length - 1;
  const below = all.filter((x) => x < plays).length;
  return below / others;
}

/** Instagram hides likes by returning -1. Anything negative or non-numeric is "unavailable", not zero. */
export function cleanCount(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : null;
}

export function perPlay(count: number | null, plays: number | null): number | null {
  if (count === null || plays === null || plays <= 0) return null;
  return count / plays;
}

export function handleFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /instagram\.com\/([A-Za-z0-9._]+)/.exec(url);
  return m ? m[1].toLowerCase() : null;
}

export function postsPer30Days(timestamps: string[]): number | null {
  const t = timestamps.map((s) => Date.parse(s)).filter(Number.isFinite).sort((a, b) => a - b);
  if (t.length < 2) return null;
  const days = Math.max((t[t.length - 1] - t[0]) / 86_400_000, 1);
  return ((t.length - 1) / days) * 30;
}

export function dedupeBy<T>(rows: T[], key: (r: T) => string): { kept: T[]; dropped: number } {
  const seen = new Map<string, T>();
  for (const r of rows) if (!seen.has(key(r))) seen.set(key(r), r);
  return { kept: [...seen.values()], dropped: rows.length - seen.size };
}

export function evidenceLevel(n: number, pages: number): "established" | "emerging" | "hypothesis" {
  if (n >= 8 && pages >= 3) return "established";
  if (n >= 4 && pages >= 2) return "emerging";
  return "hypothesis";
}
