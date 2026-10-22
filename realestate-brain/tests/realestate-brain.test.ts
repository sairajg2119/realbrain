import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanText, checkRequiredElements, type Claim, type Rule } from "../lib/claims.ts";

const B = join(dirname(fileURLToPath(import.meta.url)), "..", "brain");
const load = (f: string) => JSON.parse(readFileSync(join(B, f), "utf8"));
const claims: Claim[] = load("claims_library.json").claims;
const rules: Rule[] = load("compliance_rules.json").rules;
const sources: { id: string; status: string }[] = load("source_register.json").sources;
const examples = load("misleading_examples.json").examples;
const scan = (s: string) => scanText({ text: s }, claims, rules);

test("every rule points to real sources, and verified rules have a primary source", () => {
  const ids = new Set(sources.map((s) => s.id));
  for (const r of rules) {
    for (const sid of r.source_ids) assert.ok(ids.has(sid), `${r.id} cites unknown source ${sid}`);
    if (r.status === "verified_primary" && r.id !== "ESCALATE-UNCERTAIN") {
      const primary = r.source_ids.some((sid) => sources.find((s) => s.id === sid)?.status === "verified_primary");
      assert.ok(primary, `${r.id} is verified_primary but has no primary source`);
    }
  }
});

test("rule ids are unique, and every claim cites existing rules", () => {
  assert.equal(new Set(rules.map((r) => r.id)).size, rules.length);
  const ids = new Set(rules.map((r) => r.id));
  for (const c of claims) for (const id of c.rule_ids) assert.ok(ids.has(id), `${c.id} cites unknown rule ${id}`);
});

test("rules that are not verified from a primary source cannot be 'hard' legal requirements", () => {
  for (const r of rules) {
    if (r.status !== "verified_primary") assert.notEqual(r.level, "legal_requirement", `${r.id} claims legal_requirement without primary verification`);
  }
});

test("rules that depend on interpretation carry an escalation question", () => {
  for (const r of rules) if (r.level === "needs_legal_review" && r.enforcement !== "info") assert.ok(r.escalation_question, `${r.id} needs an escalation_question`);
});

test("every claim pattern compiles", () => {
  for (const c of claims) for (const p of c.patterns) assert.doesNotThrow(() => new RegExp(p, "i"), `${c.id}: ${p}`);
});

test("guaranteed returns are blocked and escalated", () => {
  const r = scan("Guaranteed 8% rental return on your flat");
  assert.equal(r.blocked, true);
  assert.ok(r.findings.some((f) => f.claim_id === "C-GUARANTEED-RETURNS" && f.escalate));
});

test("pre-launch booking language is blocked", () => {
  assert.equal(scan("Pre-launch offer, book now at special price").blocked, true);
});

test("'RERA approved' is flagged with the safer wording", () => {
  const f = scan("This RERA approved project").findings.find((x) => x.claim_id === "C-RERA-APPROVED");
  assert.ok(f);
  assert.match(f!.safer_wording, /RERA registered/);
});

test("'subject to change' disclaimers are flagged", () => {
  assert.ok(scan("All details subject to change without notice").findings.some((f) => f.claim_id === "C-DISCLAIMER-SUBJECT-TO-CHANGE"));
});

test("approval and possession claims need evidence, not a block", () => {
  const r = scan("A-khata, BDA approved. Possession by December 2027.");
  assert.ok(r.findings.some((f) => f.claim_id === "C-APPROVALS-CLAIM" && f.action === "needs_evidence"));
  assert.ok(r.findings.some((f) => f.claim_id === "C-POSSESSION-DATE"));
  assert.equal(r.blocked, false);
});

test("superlatives, urgency and distances are flagged", () => {
  const r = scan("The best 3 BHK. Only 4 flats left. Metro 5 minutes away.");
  for (const id of ["C-SUPERLATIVE", "C-URGENCY", "C-DISTANCE-INFRA"]) assert.ok(r.findings.some((f) => f.claim_id === id), id);
});

test("a plain safe script has no findings, and the summary says it is not a clearance", () => {
  const r = scan("Working near the tech park and tired of the drive? Search the registration on the K-RERA website before you decide.");
  assert.equal(r.findings.length, 0);
  assert.match(r.summary, /not a legal clearance/);
});

test("scans each field and reports where the match was", () => {
  const r = scanText({ hook: "Hello", caption: "Guaranteed returns!" }, claims, rules);
  assert.equal(r.findings[0].where, "caption");
});

test("every misleading example is caught by at least the claims it lists", () => {
  for (const ex of examples) {
    const r = scan(ex.bad);
    for (const p of ex.problems) {
      const claim = claims.find((c) => c.id === p.claim_id);
      assert.ok(claim, `${ex.id}: unknown claim ${p.claim_id}`);
      if (claim!.patterns.length) assert.ok(r.findings.some((f) => f.claim_id === p.claim_id), `${ex.id}: ${p.claim_id} not detected in "${ex.bad}"`);
    }
  }
});

test("safer rewrites do not trigger a block", () => {
  for (const ex of examples) assert.equal(scan(ex.safer).blocked, false, `${ex.id} safer text is blocked`);
});

test("required elements: RERA number and website in caption and on screen, AI label", () => {
  const ok = checkRequiredElements({ rera_number: "PRM/KA/RERA/1251/308/PR/210113/003785", caption: "RERA PRM/KA/RERA/1251/308/PR/210113/003785 rera.karnataka.gov.in", on_screen_text: "PRM/KA/RERA/1251/308/PR/210113/003785 www.rera.karnataka.gov.in", ai_label_planned: true });
  assert.ok(ok.every((c) => c.ok), JSON.stringify(ok.filter((c) => !c.ok)));
  const bad = checkRequiredElements({ rera_number: null, caption: "hello" });
  assert.ok(bad.some((c) => c.id === "RERA-REG-NO" && !c.ok));
  assert.ok(bad.some((c) => c.id === "AI-LABEL" && !c.ok));
});

test("a missing on-screen plan is reported, not assumed", () => {
  const r = checkRequiredElements({ rera_number: "X1", caption: "X1 rera.karnataka.gov.in", ai_label_planned: true });
  const p = r.find((c) => c.id === "KRERA-AD-NUMBER-PLACEMENT")!;
  assert.equal(p.ok, false);
  assert.match(p.message, /No on-screen text plan/);
});
