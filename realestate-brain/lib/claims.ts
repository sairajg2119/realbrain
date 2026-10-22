// Compliance scan for reel scripts. Pure functions: pass in the library and the text.
// A match is a flag for a human, never a legal finding. No match does not mean a script is safe.

export interface Claim {
  id: string; name: string; class: "prohibited" | "risky" | "conditional" | "safe";
  action: "block" | "flag" | "needs_evidence" | "none"; patterns: string[]; rule_ids: string[];
  why: string; safer_wording: string; evidence_needed: string;
}
export interface Rule {
  id: string; rule: string; plain_english: string; level: string; enforcement: string; status: string;
  escalation_question?: string | null; source_ids: string[]; [k: string]: unknown;
}
export interface Finding {
  claim_id: string; claim_name: string; class: Claim["class"]; action: Claim["action"];
  matched: string; where: string; rule_ids: string[]; why: string; safer_wording: string;
  evidence_needed: string; escalate: boolean; escalation_questions: string[];
}
export interface ScanInput { [field: string]: string | null | undefined }
export interface ScanResult { findings: Finding[]; blocked: boolean; needs_human: boolean; summary: string }

const compiled = new WeakMap<Claim, RegExp[]>();
function regexes(c: Claim): RegExp[] {
  let r = compiled.get(c);
  if (!r) { r = c.patterns.map((p) => new RegExp(p, "i")); compiled.set(c, r); }
  return r;
}

/** Scan named text fields (for example hook, body, cta, caption). Returns one finding per claim per field. */
export function scanText(input: ScanInput, claims: Claim[], rules: Rule[]): ScanResult {
  const ruleById = new Map(rules.map((r) => [r.id, r]));
  const findings: Finding[] = [];
  for (const [where, text] of Object.entries(input)) {
    if (!text) continue;
    for (const c of claims) {
      for (const re of regexes(c)) {
        const m = re.exec(text);
        if (!m) continue;
        const linked = c.rule_ids.map((id) => ruleById.get(id)).filter((r): r is Rule => !!r);
        const unresolved = linked.filter((r) => r.status !== "verified_primary" || r.enforcement === "escalate" || r.level === "needs_legal_review");
        findings.push({
          claim_id: c.id, claim_name: c.name, class: c.class, action: c.action, matched: m[0].trim(), where,
          rule_ids: c.rule_ids, why: c.why, safer_wording: c.safer_wording, evidence_needed: c.evidence_needed,
          // Only blocks and flags raise a legal question. 'needs_evidence' items are a confirm-before-posting list, not an escalation.
          escalate: c.action === "block" || (c.action === "flag" && unresolved.length > 0),
          escalation_questions: c.action === "needs_evidence" ? [] : [...new Set(unresolved.map((r) => r.escalation_question).filter((q): q is string => !!q))],
        });
        break; // one finding per claim per field
      }
    }
  }
  const blocked = findings.some((f) => f.action === "block");
  const needs_human = findings.some((f) => f.action !== "none");
  const n = (a: Finding["action"]) => findings.filter((f) => f.action === a).length;
  const summary = findings.length === 0
    ? "No flagged claims. This is not a legal clearance; the required elements and facts still need checking."
    : `${n("block")} to block, ${n("flag")} to rewrite or source, ${n("needs_evidence")} needing evidence.`;
  return { findings, blocked, needs_human, summary };
}

export interface RequiredElements { rera_number: string | null; caption: string; on_screen_text?: string | null; ai_label_planned?: boolean }

/** Checks that the required elements are present. Presence of text only; whether the number is real is a human check on the K-RERA portal. */
export function checkRequiredElements(x: RequiredElements): { id: string; ok: boolean; message: string }[] {
  const num = x.rera_number?.trim() ?? "";
  const cap = x.caption.toLowerCase();
  const scr = (x.on_screen_text ?? "").toLowerCase();
  const out: { id: string; ok: boolean; message: string }[] = [];
  out.push({ id: "RERA-REG-NO", ok: !!num && x.caption.includes(num), message: num ? "RERA number in the caption" : "No RERA number to check against. Stop and follow the 'no number found' steps." });
  out.push({ id: "RERA-AUTHORITY-WEBSITE", ok: cap.includes("rera.karnataka.gov.in"), message: "K-RERA website in the caption" });
  out.push({ id: "KRERA-AD-NUMBER-PLACEMENT", ok: !!num && (x.on_screen_text ?? "").includes(num), message: x.on_screen_text == null ? "No on-screen text plan given. Put the RERA number on screen for the whole video." : "RERA number in the on-screen text plan" });
  out.push({ id: "RERA-AUTHORITY-WEBSITE-ONSCREEN", ok: scr.includes("rera.karnataka.gov.in"), message: "K-RERA website in the on-screen text plan" });
  out.push({ id: "AI-LABEL", ok: x.ai_label_planned === true, message: "AI-generated label planned for the whole video" });
  return out;
}
