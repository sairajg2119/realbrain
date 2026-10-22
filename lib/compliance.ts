import { checkRequiredElements, scanText, type Claim, type Rule } from "../realestate-brain/lib/claims.ts";
import type { ComplianceItem, ComplianceReport, Facts, OnScreen, Script, ScriptChecks } from "./types.ts";

export const COMPLIANCE_DISCLAIMER =
  "This scan flags wording that often misleads buyers. It is not legal clearance. Confirm every item with documents or your legal advisor.";

/**
 * What must be visible in the video, built from the verified brochure facts.
 * K-RERA's circular of 14 Nov 2019 asks for the number top right at half the project-name size in print and
 * visual media. It does not name Instagram, so following it for video is the safe reading (rule KRERA-AD-NUMBER-PLACEMENT).
 */
export function onScreenPlan(facts: Facts): OnScreen | undefined {
  if (!facts.rera_number) return undefined;
  return {
    lines: [`RERA registered: ${facts.rera_number}`, "www.rera.karnataka.gov.in", "AI-generated"],
    position: "Top right, for the whole video",
    size_note: "RERA number at least half the size of the project name",
    basis: "RERA Act s11(2) and K-RERA circular of 14 Nov 2019 (print rule applied to video as the safe reading; AI label per the 2026 IT Rules summaries)",
  };
}

export function withOnScreen(script: Script, facts: Facts): Script {
  return { ...script, on_screen: onScreenPlan(facts) };
}

/** Scan a script's text and on-screen plan. Blocks come back as messages the caller can treat as hard failures. */
export function scanScript(script: Script, facts: Facts, claims: Claim[], rules: Rule[]): ComplianceReport {
  const onScreenText = script.on_screen?.lines.join(" | ") ?? null;
  // Visual notes and on-screen overlays are part of the reel, so they are scanned too.
  const visuals = script.beats?.map((b) => b.visual).filter(Boolean).join(" | ") || null;
  const overlays = script.beats?.map((b) => b.on_screen_text).filter(Boolean).join(" | ") || null;
  const res = scanText({ hook: script.hook, body: script.body, cta: script.cta, caption: script.caption, on_screen: onScreenText, visuals, overlays }, claims, rules);

  const block_messages = res.findings
    .filter((f) => f.action === "block")
    .map((f) => `Compliance: "${f.matched}" (${f.claim_name}). ${f.why} Safer: ${f.safer_wording}`);

  const seen = new Set<string>();
  const confirm_before_posting: ComplianceItem[] = [];
  for (const f of res.findings) {
    if (f.action === "none" || seen.has(f.claim_id)) continue;
    seen.add(f.claim_id);
    confirm_before_posting.push({
      claim_id: f.claim_id, name: f.claim_name, matched: f.matched, where: f.where,
      action: f.action, evidence_needed: f.evidence_needed, safer_wording: f.safer_wording,
    });
  }
  const ask_advisor = [...new Set(res.findings.filter((f) => f.escalate).flatMap((f) => f.escalation_questions))];

  const required = checkRequiredElements({
    rera_number: facts.rera_number, caption: script.caption, on_screen_text: onScreenText, ai_label_planned: !!script.on_screen?.lines.includes("AI-generated"),
  });

  return { blocked: res.blocked, summary: res.summary, block_messages, confirm_before_posting, ask_advisor, required, disclaimer: COMPLIANCE_DISCLAIMER };
}

/** A blocked claim stops the script from being chosen. Everything else is shown, not enforced. */
export function applyCompliance(checks: ScriptChecks, report: ComplianceReport): ScriptChecks {
  if (!report.blocked) return checks;
  return {
    ...checks,
    hardFailures: [...checks.hardFailures, ...report.block_messages],
    failedCodes: checks.failedCodes.includes("compliance") ? checks.failedCodes : [...checks.failedCodes, "compliance"],
  };
}

/** True when the person must tick a box before approving: something to confirm or to ask an advisor. */
export function needsAcknowledgement(report: ComplianceReport | undefined): boolean {
  return !!report && (report.confirm_before_posting.length > 0 || report.ask_advisor.length > 0);
}
