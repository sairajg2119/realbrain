/**
 * Which Gemini model to use, and how to read a failure. Pure, so it can be tested without calling the API.
 * A model that fails (quota used up, busy, too slow) is put to rest for a while and the next one is used, so one bad
 * model never holds up a whole request and warm servers remember it.
 */

export type FailureKind = "setup" | "rate_limit" | "gone" | "thinking" | "transient" | "timeout" | "fatal";

/** Duck-typed on purpose: the SDK's ApiError carries a numeric `status`; timeouts and dropped connections do not. */
export function classifyAiError(e: unknown): FailureKind {
  const err = (e ?? {}) as { status?: unknown; name?: unknown; message?: unknown };
  const status = typeof err.status === "number" ? err.status : null;
  const msg = typeof err.message === "string" ? err.message : "";
  if (status === 401 || status === 403 || /API key/i.test(msg)) return "setup";
  if (status === 429) return "rate_limit";
  if (status === 404) return "gone";
  if (status === 400 && /thinking/i.test(msg)) return "thinking";
  if (status !== null && status >= 500) return "transient"; // 500, 502, 503, 504: Google is struggling
  if (status === 408) return "timeout";
  if (err.name === "AbortError" || err.name === "TimeoutError" || /aborted|timed? ?out/i.test(msg)) return "timeout";
  if (status === null && (e instanceof TypeError || /fetch failed|ECONN|ETIMEDOUT|ENOTFOUND|socket|network/i.test(msg))) return "transient";
  return "fatal";
}

/**
 * How long to rest a model after a 429. Gemini's message says which limit was hit: a per-day quota rests the model for an hour,
 * while a per-minute limit says how many seconds to wait ("retryDelay": "22s"), so a short limit costs seconds, not minutes.
 */
export function rateLimitRestMs(e: unknown): number {
  const msg = typeof (e as { message?: unknown } | null)?.message === "string" ? (e as { message: string }).message : "";
  if (/PerDay|per day|daily/i.test(msg)) return 60 * 60_000;
  const m = /retryDelay"?\s*[:=]\s*"?(\d+(?:\.\d+)?)s/i.exec(msg) ?? /retry in (\d+(?:\.\d+)?)s/i.exec(msg);
  const secs = m ? Number(m[1]) : 30;
  return Math.min(120_000, Math.max(5_000, Math.ceil(secs * 1000) + 1000));
}

export class ModelPool {
  private until = new Map<string, number>();
  readonly models: string[];
  private now: () => number;
  constructor(models: string[], now: () => number = Date.now) {
    this.models = models;
    this.now = now;
  }

  /** The first model that is not resting. If all are resting, the one that recovers soonest. */
  current(): string {
    const t = this.now();
    const open = this.models.find((m) => (this.until.get(m) ?? 0) <= t);
    if (open) return open;
    return this.models.reduce((a, b) => ((this.until.get(a) ?? 0) <= (this.until.get(b) ?? 0) ? a : b));
  }

  cool(model: string, ms: number): void {
    this.until.set(model, this.now() + ms);
  }

  allCooling(): boolean {
    const t = this.now();
    return this.models.every((m) => (this.until.get(m) ?? 0) > t);
  }

  /** Milliseconds until some model is free again (0 if one is free now). */
  waitMs(): number {
    const t = this.now();
    return Math.max(0, Math.min(...this.models.map((m) => (this.until.get(m) ?? 0) - t)));
  }
}

/** How long a model rests after each kind of failure. */
export const REST_MS = { gone: 60 * 60_000, transient: 60_000, timeout: 45_000, bad_output: 20_000 } as const;
