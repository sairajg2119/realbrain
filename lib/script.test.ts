import test from "node:test";
import assert from "node:assert/strict";
import { cleanOverlay, formatClock, MAX_SCRIPT_SECONDS, MIN_SCRIPT_SECONDS, normaliseRawScript, scriptAsText, timeBeats, WORDS_PER_SECOND } from "./script.ts";
import { checkScript } from "./checks.ts";
import type { Facts, Teardown } from "./types.ts";

const why = { reel_id: "ABC", page: "p", multiple_vs_median: 10, reason: "r" };
const raw = (beats: unknown[], over: Record<string, unknown> = {}) => ({
  hook_type: "audience call-out", format: "talking head", caption: "RERA PRM/X rera.karnataka.gov.in", audience: "families", audience_reason: "space", why_this_works: why, beats, ...over,
});
const beat = (spoken: string, label = "Build", visual = "", on_screen_text = "") => ({ label, spoken, visual, on_screen_text });

test("timing: seconds come from the words at 2.5 words a second, rounded up to half seconds, minimum 1.5", () => {
  const t = timeBeats(["one two three four five", "a"]);
  assert.deepEqual(t[0], { start_s: 0, end_s: 2 });
  assert.deepEqual(t[1], { start_s: 2, end_s: 3.5 });
  const long = timeBeats(["w ".repeat(12).trim()]);
  assert.equal(long[0].end_s, 5, "12 words at 2.5 per second is 4.8 s, rounded up to 5");
});

test("total time is never shorter than the words need", () => {
  for (const n of [3, 7, 9, 13, 17, 25]) {
    const spoken = Array.from({ length: 6 }, () => "x ".repeat(n).trim());
    const end = timeBeats(spoken).at(-1)!.end_s;
    assert.ok(end >= (n * 6) / WORDS_PER_SECOND, `n=${n}`);
  }
});

test("a script with beats gets timed beats, derived hook, body and cta, and a total", () => {
  const s = normaliseRawScript(raw([beat("Tired of the commute?", "x"), beat("Here is the space you get."), beat("Forty acres of open land."), beat("Comment HOME for the plans.", "y")]));
  assert.equal(s.hook, "Tired of the commute?");
  assert.equal(s.cta, "Comment HOME for the plans.");
  assert.equal(s.body, "Here is the space you get. Forty acres of open land.");
  assert.equal(s.beats![0].label, "Hook");
  assert.equal(s.beats!.at(-1)!.label, "CTA");
  assert.equal(s.beats![0].start_s, 0);
  for (let i = 1; i < s.beats!.length; i++) assert.equal(s.beats![i].start_s, s.beats![i - 1].end_s, "beats are contiguous");
  assert.equal(s.total_seconds, s.beats!.at(-1)!.end_s);
  assert.equal(s.target_duration_s, Math.ceil(s.total_seconds!));
  assert.equal(s.audience, "families");
});

test("fewer than three beats is rejected", () => {
  assert.throws(() => normaliseRawScript(raw([beat("Hi"), beat("Bye")])), /at least 3 beats/);
});

test("empty beats are dropped before counting", () => {
  assert.throws(() => normaliseRawScript(raw([beat("Hi"), beat(""), beat("Bye")])), /at least 3 beats/);
});

test("the old flat shape is still accepted", () => {
  const s = normaliseRawScript({ hook_type: "h", format: "f", hook: "Hook", body: "Body", cta: "Cta", caption: "c", target_duration_s: 20, why_this_works: why });
  assert.equal(s.beats, undefined);
  assert.equal(s.target_duration_s, 20);
  assert.equal(s.audience, "everyone");
});

test("a missing caption or reel id is rejected", () => {
  assert.throws(() => normaliseRawScript(raw([beat("a"), beat("b"), beat("c")], { caption: "" })), /caption/);
  assert.throws(() => normaliseRawScript(raw([beat("a"), beat("b"), beat("c")], { why_this_works: {} })), /reel_id/);
});

test("formatClock", () => {
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(38.5), "0:39");
  assert.equal(formatClock(65), "1:05");
});

test("scriptAsText gives a full, timed script with what to say and show", () => {
  const s = normaliseRawScript(raw([beat("Hook line here.", "", "Drone over the campus"), beat("Middle line."), beat("Comment HOME.", "", "", "Comment HOME")]));
  const t = scriptAsText(s);
  assert.match(t, /0:00-0:0\d\s+HOOK/);
  assert.match(t, /Say: Hook line here\./);
  assert.match(t, /Show: Drone over the campus/);
  assert.match(t, /On-screen text: Comment HOME/);
  assert.match(t, /Caption:/);
});

const facts: Facts = {
  is_real_estate_brochure: true, project_name: "Demo", developer: "D", location: "Jakkur", locality_match: null, configurations: ["3 BHK 1,650 sq ft"], price: null,
  amenities: ["Clubhouse"], rera_number: "PRM/X", key_numbers: ["40 acres", "85% open space"], missing: [],
};
const teardowns = [{ id: "ABC", page: "p", multiple_vs_median: 10 } as Teardown];

test("checks: a number only in a beat's on-screen text or visual is caught", () => {
  const s = normaliseRawScript(raw([beat("Big space."), beat("Open land.", "Build", "Show the 99 acre map"), beat("Comment HOME.", "CTA", "", "Only 500 homes")]));
  const c = checkScript(s, facts, teardowns);
  assert.ok(c.redNumbers.includes("99") && c.redNumbers.includes("500"), JSON.stringify(c.redNumbers));
});

test("checks: a script over a minute is a hard failure, and one under it is not", () => {
  const long = normaliseRawScript(raw([beat("Hook words here now."), beat("w ".repeat(160).trim()), beat("Comment HOME.")]));
  assert.ok(long.total_seconds! > MAX_SCRIPT_SECONDS);
  assert.ok(checkScript(long, facts, teardowns).hardFailures.some((m) => /minute|60 seconds/.test(m)));
  const ok = normaliseRawScript(raw([beat("Hook words here now."), beat("w ".repeat(60).trim()), beat("Comment HOME.")]));
  assert.ok(!checkScript(ok, facts, teardowns).hardFailures.some((m) => /minute|60 seconds/.test(m)));
});

test("checks: a slow hook only warns", () => {
  const s = normaliseRawScript(raw([beat("This is a very long opening line that takes far too long to say out loud."), beat("Middle."), beat("Comment HOME.")]));
  const c = checkScript(s, facts, teardowns);
  assert.ok(c.warnings.some((w) => /hook/i.test(w)));
  assert.ok(!c.hardFailures.some((m) => /hook/i.test(m)));
});

test("overlay text drops the AI label and RERA lines the app adds itself", () => {
  assert.equal(cleanOverlay("AI-generated | 85% open space"), "85% open space");
  assert.equal(cleanOverlay("RERA registered: PRM/X | Comment HOME"), "Comment HOME");
  assert.equal(cleanOverlay("AI-generated"), "");
  assert.equal(cleanOverlay("www.rera.karnataka.gov.in"), "");
  assert.equal(cleanOverlay("3500+ trees"), "3500+ trees");
  const s = normaliseRawScript(raw([beat("Hook words here now.", "Hook", "", "AI-generated | Big space"), beat("Middle."), beat("Comment HOME.")]));
  assert.equal(s.beats![0].on_screen_text, "Big space");
});

test("checks: a one-liner of about 20 seconds is too short, a full script is not", () => {
  const short = normaliseRawScript(raw([beat("Hook words here now."), beat("w ".repeat(20).trim()), beat("Comment HOME.")]));
  assert.ok(short.target_duration_s < MIN_SCRIPT_SECONDS);
  assert.ok(checkScript(short, facts, teardowns).hardFailures.some((m) => /Too short/.test(m)));
  const full = normaliseRawScript(raw([beat("Hook words here now."), beat("w ".repeat(70).trim()), beat("Comment HOME.")]));
  assert.ok(full.target_duration_s >= MIN_SCRIPT_SECONDS);
  assert.ok(!checkScript(full, facts, teardowns).hardFailures.some((m) => /Too short/.test(m)));
});

test("checks: the old flat shape is never called too short", () => {
  const flat = normaliseRawScript({ hook_type: "h", format: "f", hook: "Hook", body: "Body", cta: "Cta", caption: "c", target_duration_s: 12, why_this_works: why });
  assert.ok(!checkScript(flat, facts, teardowns).hardFailures.some((m) => /Too short/.test(m)));
});
