import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { anglesForScripts, avoidForScripts, buildBrief, factList, type BuildCtx, type RawBrief } from "./brief.ts";
import type { Claim, Rule } from "../realestate-brain/lib/claims.ts";
import type { Facts } from "./types.ts";

const claims = (JSON.parse(readFileSync("brain/compliance_claims.json", "utf8")) as { claims: Claim[] }).claims;
const rules = (JSON.parse(readFileSync("brain/rules.json", "utf8")) as { rules: Rule[] }).rules;

const facts: Facts = {
  is_real_estate_brochure: true, project_name: "Demo Heights", developer: "Demo Homes", location: "Jakkur, Bengaluru", locality_match: "Jakkur",
  configurations: ["3 BHK 1,650 sq ft"], price: "Starting at Rs 1.85 Cr", amenities: ["Clubhouse"], rera_number: "PRM/KA/RERA/1251/309/PR/123456",
  key_numbers: ["1,650 sq ft", "1.85 Cr", "40 acres"], missing: ["possession date"],
};
const list = factList(facts);
const idOf = (needle: string) => list.find((f) => f.text.includes(needle))!.id;

const ctx = (over: Partial<BuildCtx> = {}): BuildCtx => ({
  facts, hookTypes: ["bold money number", "audience call-out"], teardownIds: ["ABC"], claims, rules, modelNote: "test",
  location: { name: "Jakkur", verified: [], unverified: [] }, now: new Date("2026-10-22T00:00:00Z"), ...over,
});

const goodAngle = () => ({
  title: "The 40-acre family address", story: "A big campus for a family. 3 BHK homes of 1,650 sq ft.", buyer: "family",
  hook_type: "audience call-out", hook_example: "Family looking for space in Jakkur? Stop scrolling.", format: "talking head",
  cta: "Comment HOME for the floor plans.", reasoning: "Space is the strongest fact.", fact_ids: [idOf("40 acres"), idOf("Configuration")], evidence_reel_id: "ABC",
});

test("every brochure fact gets a stable id and is labelled as the developer's claim", () => {
  assert.equal(list[0].id, "F1");
  assert.ok(list.every((f) => f.basis === "brochure" && /developer/i.test(f.source)));
  assert.ok(list.some((f) => f.text === `RERA number: ${facts.rera_number}`));
});

test("a selling point citing a fact that does not exist is removed and recorded", () => {
  const raw: RawBrief = { selling_points: [{ point: "Next to the metro", why_it_matters: "x", fact_ids: ["F99"] }, { point: "Big campus", why_it_matters: "y", fact_ids: [idOf("40 acres")] }] };
  const b = buildBrief(raw, ctx());
  assert.deepEqual(b.selling_points.map((p) => p.point), ["Big campus"]);
  assert.ok(b.limitations.some((l) => l.kind === "removed_claim" && l.item.includes("Next to the metro")));
});

test("an angle with no valid brochure fact is dropped", () => {
  const a = { ...goodAngle(), fact_ids: ["F77"] };
  const b = buildBrief({ angles: [a] }, ctx());
  assert.equal(b.angles.length, 0);
  assert.ok(b.limitations.some((l) => l.kind === "removed_claim" && l.item.includes(a.title)));
});

test("numbers that are not in the facts are flagged on the angle", () => {
  const a = { ...goodAngle(), story: "Just 500 families will live here." };
  const b = buildBrief({ angles: [a] }, ctx());
  assert.deepEqual(b.angles[0].unsupported_numbers, ["500"]);
  assert.equal(anglesForScripts(b), "", "an angle with an unsupported number is not passed to the script writer");
});

test("blocked wording keeps the angle visible but unusable for scripts", () => {
  const a = { ...goodAngle(), hook_example: "Guaranteed 8% return on your 3 BHK" };
  const b = buildBrief({ angles: [a] }, ctx());
  assert.equal(b.angles[0].blocked, true);
  assert.ok(b.angles[0].compliance_flags.length > 0);
  assert.equal(anglesForScripts(b), "");
});

test("a good angle reaches the script prompt with its facts", () => {
  const b = buildBrief({ angles: [goodAngle()] }, ctx());
  assert.equal(b.angles[0].blocked, false);
  const p = anglesForScripts(b);
  assert.match(p, /40-acre family address/);
  assert.match(p, /40 acres/);
});

test("an unknown hook type becomes 'other' and an unknown reel id becomes null", () => {
  const a = { ...goodAngle(), hook_type: "made up hook", evidence_reel_id: "NOPE" };
  const b = buildBrief({ angles: [a] }, ctx());
  assert.equal(b.angles[0].hook_type, "other");
  assert.equal(b.angles[0].evidence_reel_id, null);
});

test("missing brochure fields always appear as limitations", () => {
  const b = buildBrief({}, ctx());
  assert.ok(b.limitations.some((l) => l.kind === "missing" && l.item.includes("possession date")));
});

test("with no verified locality facts the brief says what research is needed and invents nothing", () => {
  const b = buildBrief({}, ctx());
  assert.equal(b.location.verified.length, 0);
  assert.match(b.location.to_research[0], /No verified locality facts/);
  assert.ok(b.location.from_brochure.every((f) => f.basis === "brochure"));
});

test("verified locality facts keep their basis and remove the research gap", () => {
  const b = buildBrief({}, ctx({ location: { name: "Jakkur", verified: [{ id: "L1", text: "x", basis: "verified_external", source: "s" }], unverified: [] } }));
  assert.equal(b.location.to_research.length, 0);
  assert.equal(b.location.verified[0].basis, "verified_external");
});

test("the brief never claims verification: RERA is a human check and comparisons are not made", () => {
  const b = buildBrief({}, ctx());
  assert.equal(b.verification.status, "needs_human_check");
  assert.equal(b.verification.rera_number, facts.rera_number);
  assert.match(b.differentiation_note, /No reliable comparison data/);
  assert.equal(b.generated_at, "2026-10-22T00:00:00.000Z");
});

test("price and amenity mentions in an angle surface as compliance flags once", () => {
  const a = { ...goodAngle(), story: "Clubhouse and a 3 BHK starting at Rs 1.85 Cr. The clubhouse is big." };
  const b = buildBrief({ angles: [a, { ...a, title: "Second" }] }, ctx());
  assert.equal(b.compliance_flags.filter((f) => f.claim_id === "C-AMENITIES").length, 1);
  assert.ok(b.compliance_flags.some((f) => f.claim_id === "C-PRICE"));
});

test("no brief means no angles in the prompt", () => {
  assert.equal(anglesForScripts(null), "");
});

test("contradictions and unclear figures are handed to the script writer as things not to use", () => {
  const b = buildBrief({ limitations: [{ item: "Clubhouse is 7 acres in one place and 2.5+ acres in another.", kind: "contradiction" }, { item: "No pricing.", kind: "missing" }, { item: "'8 minutes' has no context.", kind: "question" }] }, ctx());
  const avoid = avoidForScripts(b);
  assert.match(avoid, /7 acres/);
  assert.match(avoid, /8 minutes/);
  assert.ok(!/No pricing/.test(avoid), "plain gaps are not figures to avoid");
  assert.equal(avoidForScripts(null), "");
});
