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

export interface Script {
  hook_type: string;
  format: string;
  hook: string;
  body: string;
  cta: string;
  caption: string;
  target_duration_s: number;
  facts_used: string[];
  why_this_works: {
    reel_id: string;
    page: string;
    multiple_vs_median: number;
    reason: string;
  };
}

export type CheckCode = "rera" | "website" | "numbers" | "length" | "citation";

export interface ScriptChecks {
  failedCodes: CheckCode[];
  hardFailures: string[];
  warnings: string[];
  redNumbers: string[]; // normalised numbers (commas removed) not found in the brochure facts
  rewritten: boolean;
}

export interface CheckedScript {
  script: Script;
  checks: ScriptChecks;
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
