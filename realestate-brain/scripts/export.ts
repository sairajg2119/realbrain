// Export the compliance layer into the app-facing brain/ files (the only place the app reads).
// Idempotent. The original app rules.json is copied once to realestate-brain/backup/.
// Run: npm run re:export
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RE = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(RE, "..", "brain");
const read = (f: string) => JSON.parse(readFileSync(join(RE, "brain", f), "utf8"));
mkdirSync(join(RE, "backup"), { recursive: true });
if (!existsSync(join(RE, "backup", "rules.json"))) copyFileSync(join(APP, "rules.json"), join(RE, "backup", "rules.json"));

const rules = read("compliance_rules.json");
const claims = read("claims_library.json");
const sources = read("source_register.json");
const checklist = read("checklist.json");

const counts: Record<string, number> = {};
for (const r of rules.rules) counts[r.status] = (counts[r.status] ?? 0) + 1;
const lastChecked = (rules.rules as { last_verified: string }[]).map((r) => r.last_verified).sort().pop();

// Same top-level shape the app already reads (version, last_checked, stale_after_days, rules[]).
// Rules are compacted for the prompt; the full records stay in realestate-brain/brain/.
writeFileSync(join(APP, "rules.json"), JSON.stringify({
  version: 2,
  _note: "Exported from realestate-brain/brain/compliance_rules.json. Not legal advice. 'status' says how well each rule is sourced: verified_primary (read from an official source on last_checked), secondary_reported (news or law-firm summaries, official text not read), unverified. 'level' separates legal requirements from regulator directions, internal best practice and questions that need a lawyer.",
  last_checked: lastChecked,
  stale_after_days: 14,
  verification_summary: counts,
  rules: rules.rules.map((r: any) => ({
    id: r.id, rule: r.rule, plain_english: r.plain_english, level: r.level, enforcement: r.enforcement, applies_to: r.applies_to,
    status: r.status, source_ids: r.source_ids, escalation_question: r.escalation_question ?? null, source_name: r.legal_basis.split(".")[0].slice(0, 160), last_checked: r.last_verified,
  })),
}, null, 2) + "\n");

// Claims, checklist and a source summary for the future compliance step. Not wired into the app yet.
writeFileSync(join(APP, "compliance_claims.json"), JSON.stringify({
  version: 1, built_at: new Date().toISOString().slice(0, 10),
  note: "Used by realestate-brain/lib/claims.ts. A match is a flag for a human, not a legal finding.",
  claims: claims.claims, advertisement_checklist: checklist.advertisement_checklist, escalation: checklist.escalation,
  sources: sources.sources.map((s: any) => ({ id: s.id, title: s.title, url: s.url, status: s.status, last_verified: s.last_verified })),
}, null, 2) + "\n");

console.log(JSON.stringify({ rules: rules.rules.length, claims: claims.claims.length, by_status: counts, last_checked: lastChecked }, null, 2));
