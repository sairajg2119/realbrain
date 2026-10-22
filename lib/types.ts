export type BuyerType = "family" | "investor" | "nri" | "first-time buyer";
export const BUYER_TYPES: BuyerType[] = ["family", "investor", "nri", "first-time buyer"];
/** "auto" lets RealBrain choose the audiences the property suits best. */
export type BuyerChoice = BuyerType | "auto";

export interface Facts {
  is_real_estate_brochure: boolean;
  project_name: string | null;
  developer: string | null;
  location: string | null;
  locality_match: string | null;
  configurations: string[];
  price: string | null;
  amenities: string[];
  rera_number: string | null;
  key_numbers: string[];
  missing: string[];
}

/** What must be on screen in the video. Built by code from the verified brochure facts, never written by the model. */
export interface OnScreen {
  lines: string[];
  position: string;
  size_note: string;
  basis: string;
}

/** One timed part of a reel: what to say, what to show, and any text on screen. Times are worked out by code from the words. */
export interface Beat {
  label: string;
  start_s: number;
  end_s: number;
  spoken: string;
  visual: string;
  on_screen_text: string;
}

export interface Script {
  hook_type: string;
  format: string;
  hook: string;
  body: string;
  cta: string;
  caption: string;
  target_duration_s: number;
  facts_used: string[];
  /** Who this script suits best, chosen by RealBrain (families, first-time buyers, investors, NRI buyers, everyone) and why. */
  audience?: string;
  audience_reason?: string;
  /** The full script as timed beats. hook, body and cta above are derived from these. Absent in older saved results. */
  beats?: Beat[];
  total_seconds?: number;
  word_count?: number;
  on_screen?: OnScreen;
  why_this_works: {
    reel_id: string;
    page: string;
    multiple_vs_median: number;
    reason: string;
  };
}

export type CheckCode = "rera" | "website" | "numbers" | "length" | "citation" | "compliance";

export interface ScriptChecks {
  failedCodes: CheckCode[];
  hardFailures: string[];
  warnings: string[];
  redNumbers: string[]; // normalised numbers (commas removed) not found in the brochure facts
  rewritten: boolean;
}

/** One item the person must confirm or take to a legal advisor. A flag, never a legal finding. */
export interface ComplianceItem {
  claim_id: string;
  name: string;
  matched: string;
  where: string;
  action: "block" | "flag" | "needs_evidence";
  evidence_needed: string;
  safer_wording: string;
}

export interface ComplianceReport {
  blocked: boolean;
  summary: string;
  block_messages: string[];
  confirm_before_posting: ComplianceItem[];
  ask_advisor: string[];
  required: { id: string; ok: boolean; message: string }[];
  disclaimer: string;
}

export interface CheckedScript {
  script: Script;
  checks: ScriptChecks;
  /** Absent in saved sample results made before the compliance layer was added. */
  compliance?: ComplianceReport;
}

export interface Teardown {
  id: string;
  url: string;
  page: string;
  plays: number;
  page_median: number;
  multiple_vs_median: number;
  hook_type: string;
  format: string;
  hook: string;
  why_it_worked: string;
}

/** Where a statement in the brief comes from. Never blend these. */
export type Basis = "brochure" | "verified_external" | "inference" | "unverified";

export interface BriefFact {
  id: string;
  text: string;
  basis: Basis;
  source: string;
}

export interface BriefAngle {
  title: string;
  story: string;
  buyer: string;
  hook_type: string;
  hook_example: string;
  format: string;
  cta: string;
  reasoning: string;
  facts_used: BriefFact[];
  evidence_reel_id: string | null;
  unsupported_numbers: string[];
  blocked: boolean;
  compliance_flags: string[];
}

/** Built before any script is written. Every item says where it came from and how far it is verified. */
export interface PropertyBrief {
  version: 1;
  generated_at: string;
  model_note: string;
  overview: { summary: string; facts: BriefFact[] };
  location: { from_brochure: BriefFact[]; verified: BriefFact[]; unverified: BriefFact[]; to_research: string[] };
  selling_points: { point: string; why_it_matters: string; evidence: BriefFact[]; basis: "brochure" | "inference" }[];
  limitations: { item: string; kind: "missing" | "risk" | "contradiction" | "question" | "removed_claim" }[];
  personas: { buyer: string; needs: string; fit: string }[];
  differentiation_note: string;
  angles: BriefAngle[];
  verification: { rera_number: string | null; portal_url: string; status: "needs_human_check"; steps: string[] };
  compliance_flags: ComplianceItem[];
  legend: Record<Basis, string>;
}

export type AnalyzeResponse =
  | { status: "ok"; facts: Facts; brief?: PropertyBrief | null; scripts: CheckedScript[]; rulesStale: boolean; reelLinks: Record<string, string>; notes: string[] }
  | { status: "rejected"; facts: Facts | null; message: string }
  | { status: "error"; message: string };
