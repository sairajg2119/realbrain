import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyCompliance, needsAcknowledgement, onScreenPlan, scanScript, withOnScreen } from "./compliance.ts";
import { checkScript } from "./checks.ts";
import type { Claim, Rule } from "../realestate-brain/lib/claims.ts";
import type { Facts, Script, Teardown } from "./types.ts";

const claims = (JSON.parse(readFileSync("brain/compliance_claims.json", "utf8")) as { claims: Claim[] }).claims;
const rules = (JSON.parse(readFileSync("brain/rules.json", "utf8")) as { rules: Rule[] }).rules;

const RERA = "PRM/KA/RERA/1251/309/PR/123456";
const facts: Facts = {
  is_real_estate_brochure: true, project_name: "Demo Heights", developer: "Demo Homes", location: "Jakkur, Bengaluru", locality_match: "Jakkur",
  configurations: ["3 BHK 1,650 sq ft"], price: "Starting at Rs 1.85 Cr", amenities: ["Clubhouse"], rera_number: RERA,
  key_numbers: ["1,650 sq ft", "1.85 Cr", "40 acres"], missing: [],
};
const teardowns = [{ id: "ABC", page: "p", multiple_vs_median: 10 } as Teardown];
const clean: Script = {
  hook_type: "audience call-out", format: "talking head", hook: "Working near the tech park and tired of the drive?",
  body: "Demo Heights has 3 BHK homes of 1,650 sq ft on 40 acres.", cta: "Comment HOME for the floor plans.",
  caption: `RERA registered: ${RERA}. Check it on rera.karnataka.gov.in`, target_duration_s: 30, facts_used: [],
  why_this_works: { reel_id: "ABC", page: "p", multiple_vs_median: 10, reason: "r" },
};
const scan = (s: Script) => scanScript(withOnScreen(s, facts), facts, claims, rules);

test("the on-screen plan is built from the verified RERA number, with the website and AI label", () => {
  const p = onScreenPlan(facts)!;
  assert.ok(p.lines[0].includes(RERA));
  assert.ok(p.lines.some((l) => l.includes("rera.karnataka.gov.in")));
  assert.ok(p.lines.includes("AI-generated"));
  assert.match(p.position, /Top right/);
});

test("no RERA number means no on-screen plan is invented", () => {
  assert.equal(onScreenPlan({ ...facts, rera_number: null }), undefined);
});

test("a clean script is not blocked and meets the required elements", () => {
  const r = scan(clean);
  assert.equal(r.blocked, false);
  assert.ok(r.required.every((x) => x.ok), JSON.stringify(r.required.filter((x) => !x.ok)));
  assert.match(r.disclaimer, /not legal clearance/);
});

test("guaranteed returns are blocked and become a hard failure with the 'compliance' code", () => {
  const bad = { ...clean, body: "Guaranteed 8% rental return on your 3 BHK." };
  const report = scan(bad);
  assert.equal(report.blocked, true);
  const checks = applyCompliance(checkScript(withOnScreen(bad, facts), facts, teardowns), report);
  assert.ok(checks.failedCodes.includes("compliance"));
  assert.ok(checks.hardFailures.some((m) => m.startsWith("Compliance:")));
});

test("a script with no blocks leaves the checks unchanged", () => {
  const s = withOnScreen(clean, facts);
  const base = checkScript(s, facts, teardowns);
  assert.deepEqual(applyCompliance(base, scan(clean)), base);
});

test("pre-launch booking language is blocked", () => {
  assert.equal(scan({ ...clean, hook: "Pre-launch offer, book now!" }).blocked, true);
});

test("price and approval claims go on the confirm list, not the advisor list", () => {
  const r = scan({ ...clean, body: "3 BHK starting at Rs 1.85 Cr, A-khata, 40 acres." });
  assert.ok(r.confirm_before_posting.some((i) => i.claim_id === "C-PRICE"));
  assert.ok(r.confirm_before_posting.some((i) => i.claim_id === "C-APPROVALS-CLAIM"));
  assert.equal(r.blocked, false);
  assert.deepEqual(r.ask_advisor, []);
  assert.equal(needsAcknowledgement(r), true);
});

test("a rental-yield flag raises a legal question for the advisor", () => {
  const r = scan({ ...clean, body: "Great rental yield near the tech park." });
  assert.ok(r.ask_advisor.length > 0);
});

test("confirm items are de-duplicated per claim", () => {
  const r = scan({ ...clean, hook: "Starting at Rs 1.85 Cr", body: "Starting at Rs 1.85 Cr again", caption: `Rs 1.85 Cr ${RERA} rera.karnataka.gov.in` });
  assert.equal(r.confirm_before_posting.filter((i) => i.claim_id === "C-PRICE").length, 1);
});

test("a clean script needs no acknowledgement, and a missing report does not either", () => {
  assert.equal(needsAcknowledgement(scan(clean)), false);
  assert.equal(needsAcknowledgement(undefined), false);
});

test("'RERA approved' wording is flagged and the on-screen text itself is not", () => {
  assert.ok(scan({ ...clean, body: "This RERA approved project has a clubhouse." }).confirm_before_posting.some((i) => i.claim_id === "C-RERA-APPROVED"));
  assert.equal(scan(clean).confirm_before_posting.length, 0);
});

test("naming an amenity asks for the sanctioned plan, so most real scripts will carry one confirm item", () => {
  const r = scan({ ...clean, body: "Demo Heights has a clubhouse and 3 BHK homes of 1,650 sq ft." });
  const a = r.confirm_before_posting.find((i) => i.claim_id === "C-AMENITIES");
  assert.ok(a);
  assert.match(a!.evidence_needed, /plan/i);
});
