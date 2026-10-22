import type { Beat, Script } from "./types.ts";

/** Spoken pace used everywhere: about 2.5 words a second (playbook rule 9). */
export const WORDS_PER_SECOND = 2.5;
/** Reels in this product are capped at a minute. */
export const MAX_SCRIPT_SECONDS = 60;
/** A full script, not a one-liner: shorter than this fails and is sent back for a rewrite. */
export const MIN_SCRIPT_SECONDS = 28;
/** The hook must land fast (playbook rule 1: under 3 seconds). A little slack is allowed before warning. */
export const HOOK_WARN_SECONDS = 4;

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
/** Round UP to the next half second, so the total can never be shorter than the words need. */
const halfSecondUp = (x: number) => Math.ceil(x * 2) / 2;

/** Time each beat from its spoken words. The code decides the seconds, never the model. */
export function timeBeats(spoken: string[]): { start_s: number; end_s: number }[] {
  let t = 0;
  return spoken.map((sp) => {
    const d = Math.max(1.5, halfSecondUp(countWords(sp) / WORDS_PER_SECOND));
    const r = { start_s: t, end_s: t + d };
    t += d;
    return r;
  });
}

export function formatClock(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const str = (x: unknown) => (typeof x === "string" ? x.trim() : "");

/**
 * The app adds the AI-generated label and the RERA lines itself, for the whole video. A model that repeats them in a beat's
 * overlay text would put duplicates on screen, so they are removed here.
 */
export function cleanOverlay(text: string): string {
  return text
    .split("|")
    .map((p) => p.trim())
    .filter((p) => p && !/^ai[- ]generated$/i.test(p) && !/rera\s*(registered|no|number)|rera\.karnataka/i.test(p))
    .join(" | ");
}
const strList = (x: unknown) => (Array.isArray(x) ? x.filter((v) => typeof v === "string" && v.trim()).map((v) => (v as string).trim()) : []);

/**
 * Turn the model's script JSON into a Script. New shape: timed beats. The flat hook, body and cta fields are derived from
 * the beats so every existing check keeps working. The old flat shape is still accepted (rewrites, saved sample results).
 */
export function normaliseRawScript(o: Record<string, any>): Script {
  for (const k of ["hook_type", "format", "caption"]) {
    if (!str(o[k])) throw new Error(`script.${k} missing`);
  }
  const w = o.why_this_works ?? {};
  if (typeof w.reel_id !== "string") throw new Error("why_this_works.reel_id missing");
  const why = { reel_id: w.reel_id, page: String(w.page ?? ""), multiple_vs_median: Number(w.multiple_vs_median) || 0, reason: String(w.reason ?? "") };
  const common = {
    hook_type: str(o.hook_type), format: str(o.format), caption: str(o.caption), facts_used: strList(o.facts_used), why_this_works: why,
    audience: str(o.audience) || "everyone", audience_reason: str(o.audience_reason),
  };

  if (Array.isArray(o.beats) && o.beats.length > 0) {
    const rawBeats = (o.beats as Record<string, unknown>[]).filter((b) => str(b?.spoken));
    if (rawBeats.length < 3) throw new Error("script needs at least 3 beats (hook, middle, call to action)");
    const times = timeBeats(rawBeats.map((b) => str(b.spoken)));
    const beats: Beat[] = rawBeats.map((b, i) => ({
      label: i === 0 ? "Hook" : i === rawBeats.length - 1 ? "CTA" : str(b.label) || "Build",
      start_s: times[i].start_s, end_s: times[i].end_s,
      spoken: str(b.spoken), visual: str(b.visual), on_screen_text: cleanOverlay(str(b.on_screen_text)),
    }));
    const total = beats[beats.length - 1].end_s;
    return {
      ...common,
      hook: beats[0].spoken,
      body: beats.slice(1, -1).map((b) => b.spoken).join(" "),
      cta: beats[beats.length - 1].spoken,
      target_duration_s: Math.ceil(total),
      beats, total_seconds: total, word_count: beats.reduce((n, b) => n + countWords(b.spoken), 0),
    };
  }

  for (const k of ["hook", "body", "cta"]) {
    if (!str(o[k])) throw new Error(`script.${k} missing`);
  }
  return { ...common, hook: str(o.hook), body: str(o.body), cta: str(o.cta), target_duration_s: Number(o.target_duration_s) || 30 };
}

/** The whole script as plain text with timestamps, for copying into a notes app or handing to an editor. */
export function scriptAsText(s: Script): string {
  if (!s.beats) return `${s.hook}\n\n${s.body}\n\n${s.cta}\n\nCaption:\n${s.caption}`;
  const lines = s.beats.map(
    (b) => `${formatClock(b.start_s)}-${formatClock(b.end_s)}  ${b.label.toUpperCase()}\nSay: ${b.spoken}${b.visual ? `\nShow: ${b.visual}` : ""}${b.on_screen_text ? `\nOn-screen text: ${b.on_screen_text}` : ""}`,
  );
  return `${s.audience ? `For: ${s.audience}\n` : ""}About ${Math.round(s.total_seconds ?? s.target_duration_s)} seconds, ${s.word_count ?? ""} spoken words\n\n${lines.join("\n\n")}\n\nCaption:\n${s.caption}`;
}
