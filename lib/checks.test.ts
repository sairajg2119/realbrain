import test from "node:test";
import assert from "node:assert/strict";
import { checkScript, extractNumbers, hasDistinctHookTypes, rulesAreStale } from "./checks.ts";
import type { Facts, Script, Teardown } from "./types.ts";

const facts: Facts = {
  is_real_estate_brochure: true,
  project_name: "Demo Heights",
  developer: "Demo Homes",
  location: "Jakkur, Bengaluru",
  locality_match: "Jakkur",
  configurations: ["3 BHK 1,650 sq ft"],
  price: "Starting at ₹1.85 Cr",
  amenities: ["Clubhouse"],
  rera_number: "PRM/KA/RERA/1251/309/PR/123456",
  key_numbers: ["1,650 sq ft", "₹1.85 Cr", "40 acres"],
  missing: [],
};
const teardowns = [{ id: "ABC", page: "p", multiple_vs_median: 10 } as Teardown];
const good: Script = {
  hook_type: "bold money number",
  format: "x",
  hook: "Think 1.85 Cr buys a 3 BHK?",
  body: "1,650 sq ft on 40 acres.",
  cta: "Comment HOME.",
  caption: "RERA PRM/KA/RERA/1251/309/PR/123456 — rera.karnataka.gov.in",
  target_duration_s: 30,
  facts_used: [],
  why_this_works: { reel_id: "ABC", page: "p", multiple_vs_median: 10, reason: "r" },
};

test("a clean script passes", () => {
  const c = checkScript(good, facts, teardowns);
  assert.deepEqual(c.hardFailures, []);
  assert.deepEqual(c.redNumbers, []);
});

test("an invented number is flagged red", () => {
  const c = checkScript({ ...good, body: "1,650 sq ft and only 12 units left." }, facts, teardowns);
  assert.deepEqual(c.redNumbers, ["12"]);
  assert.ok(c.hardFailures.length > 0);
});

test("missing RERA number or website fails", () => {
  const c = checkScript({ ...good, caption: "Great home" }, facts, teardowns);
  assert.equal(c.hardFailures.length, 2);
});

test("risky phrase is a warning, not a failure", () => {
  const c = checkScript({ ...good, cta: "Guaranteed returns! Comment HOME." }, facts, teardowns);
  assert.equal(c.warnings.length, 1);
  assert.deepEqual(c.hardFailures, []);
});

test("unknown reel and over-long script fail", () => {
  const long = Array(100).fill("word").join(" ");
  const c = checkScript({ ...good, body: long, why_this_works: { ...good.why_this_works, reel_id: "NOPE" } }, facts, teardowns);
  assert.equal(c.hardFailures.length, 2);
});

test("numbers written as words are checked too", () => {
  const c = checkScript({ ...good, body: "Seventy percent open space and twenty five towers on 40 acres." }, facts, teardowns);
  assert.deepEqual(c.redNumbers, ["70", "25"]);
  assert.deepEqual(extractNumbers("two BHK, one place, forty-five"), ["2", "45"]);
});

test("helpers", () => {
  assert.deepEqual(extractNumbers("1,650 sq ft, 2.5 Cr."), ["1650", "2.5"]);
  assert.equal(hasDistinctHookTypes([good, { ...good, hook_type: "Bold Money Number" }]), false);
  assert.equal(rulesAreStale("2026-10-21", 14, new Date("2026-11-30")), true);
  assert.equal(rulesAreStale("2026-10-21", 14, new Date("2026-10-30")), false);
});
