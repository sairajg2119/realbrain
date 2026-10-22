export type BuyerType = "family" | "investor" | "nri" | "first-time buyer";
export const BUYER_TYPES: BuyerType[] = ["family", "investor", "nri", "first-time buyer"];

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

export interface Script {
  hook_type: string;
  format: string;
  hook: string;
  body: string;
  cta: string;
  caption: string;
  target_duration_s: number;
  facts_used: string[];
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

export type AnalyzeResponse =
  | { status: "ok"; facts: Facts; scripts: CheckedScript[]; rulesStale: boolean; reelLinks: Record<string, string>; notes: string[] }
  | { status: "rejected"; facts: Facts | null; message: string }
  | { status: "error"; message: string };
