import { scanText, type Claim, type Rule } from "../realestate-brain/lib/claims.ts";
import { extractNumbers, factNumbers } from "./checks.ts";
import type { Basis, BriefAngle, BriefFact, ComplianceItem, Facts, PropertyBrief } from "./types.ts";

export const K_RERA_PORTAL = "https://rera.karnataka.gov.in/viewAllProjects";

export const BASIS_LEGEND: Record<Basis, string> = {
  brochure: "Stated in the brochure by the developer. Not proof until a document or portal check is recorded.",
  verified_external: "Checked against an official or named external source, with the source shown.",
  inference: "Our reasoning from the facts. A judgement, not a fact.",
  unverified: "Found but not confirmed. Needs a person to check before it is used.",
};

/** Every brochure fact gets a stable id (F1, F2...) so the model can cite facts and the code can check the citation. */
export function factList(facts: Facts): BriefFact[] {
  const out: BriefFact[] = [];
  const add = (label: string, text: string | null | undefined) => {
    const t = (text ?? "").trim();
    if (!t) return;
    out.push({ id: `F${out.length + 1}`, text: label ? `${label}: ${t}` : t, basis: "brochure", source: "Brochure (developer's claim)" });
  };
  add("Project", facts.project_name);
  add("Developer", facts.developer);
  add("Location", facts.location);
  facts.configurations.forEach((c) => add("Configuration", c));
  add("Price", facts.price);
  facts.amenities.forEach((a) => add("Amenity", a));
  facts.key_numbers.forEach((k) => add("Figure", k));
  add("RERA number", facts.rera_number);
  return out;
}

const HOOK_FALLBACK = "other";

export interface RawBrief {
  summary?: unknown;
  selling_points?: { point?: unknown; why_it_matters?: unknown; fact_ids?: unknown; inference?: unknown }[];
  limitations?: { item?: unknown; kind?: unknown }[];
  personas?: { buyer?: unknown; needs?: unknown; fit?: unknown }[];
  angles?: {
    title?: unknown; story?: unknown; buyer?: unknown; hook_type?: unknown; hook_example?: unknown; format?: unknown;
    cta?: unknown; reasoning?: unknown; fact_ids?: unknown; evidence_reel_id?: unknown;
  }[];
}

export interface LocationInput {
  name: string | null;
  verified: BriefFact[];
  unverified: BriefFact[];
}

export interface BuildCtx {
  facts: Facts;
  hookTypes: string[];
  teardownIds: string[];
  location: LocationInput;
  claims: Claim[];
  rules: Rule[];
  now?: Date;
  modelNote: string;
}

const s = (x: unknown): string => (typeof x === "string" ? x.trim() : "");
const ids = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string").map((v) => v.trim().toUpperCase()) : []);

const KINDS = ["missing", "risk", "contradiction", "question"] as const;

/**
 * Turn the model's draft into a brief the app can trust. The model may only cite fact ids that exist; anything it cannot
 * back with a real brochure fact is moved to "limitations" as a removed claim. Numbers not in the facts are flagged, and angles
 * with blocked wording (guaranteed returns, pre-launch selling...) are kept visible but marked blocked and not used for scripts.
 */
export function buildBrief(raw: RawBrief, ctx: BuildCtx): PropertyBrief {
  const all = factList(ctx.facts);
  const byId = new Map(all.map((f) => [f.id, f]));
  const resolve = (x: unknown) => ids(x).map((i) => byId.get(i)).filter((f): f is BriefFact => !!f);
  const known = factNumbers(ctx.facts);
  const limitations: PropertyBrief["limitations"] = [];

  const selling_points: PropertyBrief["selling_points"] = [];
  for (const p of raw.selling_points ?? []) {
    const point = s(p.point);
    if (!point) continue;
    const evidence = resolve(p.fact_ids);
    if (evidence.length === 0) {
      limitations.push({ item: `Removed a selling point with no brochure fact behind it: "${point}"`, kind: "removed_claim" });
      continue;
    }
    selling_points.push({ point, why_it_matters: s(p.why_it_matters), evidence, basis: p.inference === true ? "inference" : "brochure" });
  }

  for (const l of raw.limitations ?? []) {
    const item = s(l.item);
    if (!item) continue;
    const kind = (KINDS as readonly string[]).includes(s(l.kind)) ? (s(l.kind) as (typeof KINDS)[number]) : "question";
    limitations.push({ item, kind });
  }
  // Gaps the extraction itself reported are always shown.
  for (const m of ctx.facts.missing) limitations.push({ item: `Not found in the brochure: ${m}`, kind: "missing" });

  const personas = (raw.personas ?? []).map((p) => ({ buyer: s(p.buyer), needs: s(p.needs), fit: s(p.fit) })).filter((p) => p.buyer);

  const angles: BriefAngle[] = [];
  const flagged: ComplianceItem[] = [];
  const seenFlag = new Set<string>();
  for (const a of raw.angles ?? []) {
    const title = s(a.title);
    const hook_example = s(a.hook_example);
    if (!title || !hook_example) continue;
    const facts_used = resolve(a.fact_ids);
    if (facts_used.length === 0) {
      limitations.push({ item: `Removed a content angle with no brochure fact behind it: "${title}"`, kind: "removed_claim" });
      continue;
    }
    const story = s(a.story);
    const cta = s(a.cta);
    const hook_type = ctx.hookTypes.includes(s(a.hook_type)) ? s(a.hook_type) : HOOK_FALLBACK;
    const unsupported_numbers = [...new Set(extractNumbers(`${hook_example} ${story} ${cta}`).filter((n) => !known.has(n)))];
    const scan = scanText({ hook_example, story, cta }, ctx.claims, ctx.rules);
    const blocked = scan.blocked;
    const compliance_flags = scan.findings.map((f) => `${f.claim_name}: "${f.matched}"`);
    for (const f of scan.findings) {
      if (f.action === "none" || seenFlag.has(f.claim_id)) continue;
      seenFlag.add(f.claim_id);
      flagged.push({ claim_id: f.claim_id, name: f.claim_name, matched: f.matched, where: `angle "${title}"`, action: f.action, evidence_needed: f.evidence_needed, safer_wording: f.safer_wording });
    }
    const reel = s(a.evidence_reel_id);
    angles.push({
      title, story, buyer: s(a.buyer), hook_type, hook_example, format: s(a.format), cta, reasoning: s(a.reasoning), facts_used,
      evidence_reel_id: ctx.teardownIds.includes(reel) ? reel : null, unsupported_numbers, blocked, compliance_flags,
    });
  }

  const location = {
    from_brochure: all.filter((f) => f.text.startsWith("Location:")),
    verified: ctx.location.verified,
    unverified: ctx.location.unverified,
    to_research: [] as string[],
  };
  if (ctx.location.verified.length === 0) {
    const where = ctx.location.name ?? ctx.facts.location ?? "this location";
    location.to_research.push(
      `No verified locality facts are stored for ${where}. Needed, each with a source: nearest employment hubs, metro or rail status (operational vs planned), major roads, schools, hospitals, shopping.`,
    );
  }

  const now = ctx.now ?? new Date();
  return {
    version: 1,
    generated_at: now.toISOString(),
    model_note: ctx.modelNote,
    overview: { summary: s(raw.summary), facts: all },
    location,
    selling_points,
    limitations,
    personas,
    differentiation_note: "No reliable comparison data with other projects is stored, so no comparison is made. The selling points above are this property's own facts.",
    angles,
    verification: {
      rera_number: ctx.facts.rera_number,
      portal_url: K_RERA_PORTAL,
      status: "needs_human_check",
      steps: [
        "Search the RERA number on the K-RERA project status page and confirm project name, promoter and that the registration is current.",
        "Note the completion date and status shown there. Use those for any date, not the brochure's.",
        "Ask for the sanctioned plan and commencement certificate to confirm amenities and approvals.",
      ],
    },
    compliance_flags: flagged,
    legend: BASIS_LEGEND,
  };
}

/** A short plain-text version of the usable angles, for the script-writing prompt. */
export function anglesForScripts(brief: PropertyBrief | null): string {
  if (!brief) return "";
  const usable = brief.angles.filter((a) => !a.blocked && a.unsupported_numbers.length === 0);
  if (usable.length === 0) return "";
  return usable
    .map((a, i) => `${i + 1}. ${a.title} (buyer: ${a.buyer}; hook type: ${a.hook_type}; format: ${a.format}). Story: ${a.story} Based on: ${a.facts_used.map((f) => f.text).join(" | ")}`)
    .join("\n");
}
