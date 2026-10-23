import { ApiError, GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import { classifyAiError, ModelPool, rateLimitRestMs, REST_MS } from "./aiPool.ts";
import { parseModelJson } from "./jsonExtract.ts";
import { normaliseRawScript } from "./script.ts";
import type { Audience, BuyerType, Facts, Script, Teardown } from "./types.ts";

// Free-plan quotas are counted per model, so a model that is over quota, busy or too slow is rested for a while and the next
// one is used. The light model goes first: it has been the fastest and the most available, and it wrote every script we have checked.
const pool = new ModelPool(
  [
    process.env.GEMINI_MODEL,
    // Free-plan keys have a small daily quota per model and the lite models are often overloaded, so the pool is wide.
    // Checked against the live model list for this key: these answered when the older default (3.1-flash-lite) returned 503.
    "gemini-3-flash-preview",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
  ].filter((m, i, a): m is string => !!m && a.indexOf(m) === i),
);

/** The AI could not give a usable answer after trying. 'busy' = overloaded or unreachable, 'timeout' = too slow, 'bad_output' = answered in a form we could not use. */
export class AiError extends Error {
  kind: "busy" | "timeout" | "bad_output";
  constructor(kind: "busy" | "timeout" | "bad_output", message: string) {
    super(message);
    this.kind = kind;
  }
}

export class SetupError extends Error {}

function client() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new SetupError("Setup problem: GEMINI_API_KEY is missing. Add it to .env.local (or Vercel's Environment Variables).");
  }
  return new GoogleGenAI({ apiKey: key });
}

function parseJson(text: string): unknown {
  return parseModelJson(text);
}

export function isRateLimit(e: unknown): boolean {
  return e instanceof ApiError && e.status === 429;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface AskOpts {
  /** The longest one call may take before it is given up on. */
  timeoutMs?: number;
  /** The longest all attempts together may take. */
  budgetMs?: number;
  onModel?: (model: string) => void;
}

/**
 * Ask Gemini for JSON. Every call has a time limit. A model that is over quota, overloaded, too slow or unreachable is rested and the
 * next one is tried; an answer that cannot be parsed or fails validation is retried, then moves to the next model. Only a bad API key or
 * a real bug stops at once. When nothing works it throws a plain AiError saying which kind of trouble it was.
 */
async function askJson<T>(parts: Part[], system: string, validate: (x: unknown) => T, thinking?: ThinkingLevel, opts: AskOpts = {}): Promise<T> {
  const ai = client();
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const deadline = Date.now() + (opts.budgetMs ?? 110_000);
  let useThinking = true;
  let strikes = 0; // failures in a row on the current model
  let last: { kind: "busy" | "timeout" | "bad_output"; detail: string } = { kind: "busy", detail: "" };

  for (let attempt = 0; attempt < 10 && Date.now() < deadline; attempt++) {
    // Every model is resting (a per-minute limit, usually): wait for the first to recover instead of failing.
    if (pool.allCooling()) await sleep(Math.min(pool.waitMs(), 30_000));
    const model = pool.current();
    opts.onModel?.(model);

    let text: string;
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          temperature: 0.3,
          abortSignal: AbortSignal.timeout(timeoutMs),
          ...(thinking && useThinking ? { thinkingConfig: { thinkingLevel: thinking } } : {}),
        },
      });
      text = res.text ?? "";
    } catch (e) {
      const kind = classifyAiError(e);
      const detail = e instanceof Error ? e.message.slice(0, 200) : String(e);
      if (kind === "setup") throw new SetupError("Setup problem: Gemini rejected the API key. Check GEMINI_API_KEY.");
      if (kind === "thinking" && useThinking) {
        useThinking = false; // this model does not accept a thinking level
        attempt--;
        continue;
      }
      if (kind === "rate_limit") {
        console.warn(`[ai] ${model}: over quota, trying the next model`);
        pool.cool(model, rateLimitRestMs(e));
        strikes = 0;
        last = { kind: "busy", detail };
        // Only a long wait (a daily quota) gives up at once, and the caller shows the rate-limit message. A short one is waited out.
        if (pool.allCooling() && pool.waitMs() > 60_000) throw e;
        continue;
      }
      if (kind === "gone") {
        pool.cool(model, REST_MS.gone);
        strikes = 0;
        last = { kind: "busy", detail };
        continue;
      }
      if (kind === "transient" || kind === "timeout") {
        last = { kind: kind === "timeout" ? "timeout" : "busy", detail };
        strikes++;
        // "High demand" (503) lasts longer than a retry, so the model is rested straight away and the next one is tried.
        const overloaded = /503|UNAVAILABLE|high demand/i.test(detail);
        console.warn(`[ai] ${model}: ${kind}${overloaded ? " (overloaded)" : ""}, trying the next model`);
        // A call that timed out is not tried again on the same model: it is already too slow.
        if (kind === "timeout" || overloaded || strikes >= 2) {
          pool.cool(model, kind === "timeout" ? REST_MS.timeout : REST_MS.transient);
          strikes = 0;
        } else {
          await sleep(1500);
        }
        continue;
      }
      throw e; // a bad request or a bug: trying again will not change it
    }

    try {
      return validate(parseJson(text));
    } catch (v) {
      last = { kind: "bad_output", detail: v instanceof Error ? v.message.slice(0, 200) : String(v) };
      strikes++;
      if (strikes >= 2) {
        pool.cool(model, REST_MS.bad_output);
        strikes = 0;
      }
    }
  }
  throw new AiError(last.kind, last.detail || "no answer in time");
}

const str = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : null);
const strList = (x: unknown) => (Array.isArray(x) ? x.filter((v) => typeof v === "string" && v.trim()).map((v) => (v as string).trim()) : []);

function validateFacts(x: unknown): Facts {
  const o = x as Record<string, unknown>;
  if (typeof o?.is_real_estate_brochure !== "boolean") throw new Error("facts: is_real_estate_brochure missing");
  return {
    is_real_estate_brochure: o.is_real_estate_brochure,
    project_name: str(o.project_name),
    developer: str(o.developer),
    location: str(o.location),
    locality_match: str(o.locality_match),
    configurations: strList(o.configurations),
    price: str(o.price),
    amenities: strList(o.amenities),
    rera_number: str(o.rera_number),
    key_numbers: strList(o.key_numbers),
    missing: strList(o.missing),
  };
}

const EXTRACT_SYSTEM = `You read real estate project brochures for a reel-scripting tool. Reply with one JSON object and nothing else.
Rules: copy numbers exactly as written in the document. Use null (or an empty list) for anything not found. Never guess or infer.
The RERA number is the registration number printed in the brochure (Karnataka ones usually start with PRM/KA/RERA). If none is printed, rera_number is null.`;

export async function extractFacts(pdfBase64: string): Promise<Facts> {
  const prompt = `Read this PDF. Say whether it is a real estate project brochure, then return exactly this JSON:
{"is_real_estate_brochure": true/false, "project_name": "", "developer": "", "location": "", "locality_match": "one of Jakkur, Jayanagar, Whitefield, Sarjapur Road, Hebbal if the project is there, else null", "configurations": ["3 BHK 1,650 sq ft"], "price": "string or null", "amenities": [""], "rera_number": "string or null", "key_numbers": ["every number in the brochure worth using in a reel, with its unit, as written"], "missing": ["fields not found"]}
If it is not a real estate brochure, set is_real_estate_brochure to false and leave the rest empty.`;
  return askJson(
    [{ inlineData: { mimeType: "application/pdf", data: pdfBase64 } }, { text: prompt }],
    EXTRACT_SYSTEM,
    validateFacts,
    ThinkingLevel.LOW,
    { timeoutMs: 50_000 },
  );
}

/**
 * Same extraction from the brochure's TEXT, for PDFs too big to send directly (the inline limit is 20 MB).
 * Loses what is only in images (floor-plan drawings, scanned pages). The caller must say so.
 */
export async function extractFactsFromText(text: string): Promise<Facts> {
  const prompt = `Below is the extracted text of a document (page breaks are not marked). Say whether it is a real estate project brochure, then return exactly this JSON:
{"is_real_estate_brochure": true/false, "project_name": "", "developer": "", "location": "", "locality_match": "one of Jakkur, Jayanagar, Whitefield, Sarjapur Road, Hebbal if the project is there, else null", "configurations": ["3 BHK 1,650 sq ft"], "price": "string or null", "amenities": [""], "rera_number": "string or null", "key_numbers": ["every number in the document worth using in a reel, with its unit, as written"], "missing": ["fields not found"]}
If it is not a real estate brochure, set is_real_estate_brochure to false and leave the rest empty.
For configurations, say whether an area is the sale area or the carpet area exactly as the document labels it.

DOCUMENT TEXT:
${text.slice(0, 120_000)}`;
  const f = await askJson([{ text: prompt }], EXTRACT_SYSTEM, validateFacts, ThinkingLevel.LOW, { timeoutMs: 35_000 });
  // The model often leaves 'missing' empty. Add what is plainly absent so the brief and scripts do not treat it as known.
  const missing = new Set(f.missing);
  if (!f.price) missing.add("price");
  if (f.configurations.length === 0) missing.add("configurations");
  return { ...f, missing: [...missing] };
}

function validateScripts(x: unknown): Script[] {
  const arr = (x as { scripts?: unknown })?.scripts;
  if (!Array.isArray(arr) || arr.length === 0) throw new Error("scripts missing");
  return arr.map((s) => normaliseRawScript(s as Record<string, any>));
}

const SCRIPT_SYSTEM = `You write complete Instagram reel scripts for Bengaluru real estate developers, spoken by an AI avatar over the project's renders. Write the way a real person talks to a friend: short sentences, contractions, plain warm words. No corporate phrases, no brochure language.
Reply with one JSON object and nothing else.
What a full script is: a list of beats in order. Each beat has: label, spoken (exactly what is said), visual (what is on screen, using only the project's renders, plans or amenities named in the facts), on_screen_text (a short caption overlay, or empty).
Structure: beat 1 is the Hook (at most 7 spoken words, lands in under 3 seconds). Then 3 to 5 middle beats (label them Build or Proof): each brings one new fact or scene, a new beat every 3 to 5 seconds, ending with the single strongest fact. The last beat is the CTA (a comment-keyword CTA, or share bait for lifestyle reels). Each script is 30 to 45 seconds. That means between 80 and 110 spoken words in total (the app times it at 2.5 words a second). Fewer than 75 words fails as too short, and most failures are scripts that are too short, so aim for about 95 spoken words: count them before you answer. Over 150 fails as too long. Use 6 to 8 beats, full sentences, and make every middle beat teach the viewer one specific thing from the facts. The beat before the CTA must be the strongest concrete fact, not a feeling. Do not describe an avatar in the visuals; describe the project's renders, plans or amenities.
Hard rules:
- Use ONLY facts and numbers from the brochure facts and locality facts you are given. Do not write any other number anywhere, in the spoken words, the on-screen text or the visual notes (no "3 reasons", no years, no distances), unless it appears in the facts. Copy figures as written, including a trailing "+" (write "3500+ trees", never "3,500 trees").
- A sale area is not a carpet area. Only call an area carpet area if the facts say carpet. Never describe something outside the home (a sports facility, a clubhouse) as being "inside your home".
- Never promise returns, appreciation, refunds, dates or prices that are not in the facts. Describe planned infrastructure (metro, roads) as proposed or planned, never as open.
- Follow the playbook's 10 rules. Each script uses a different hook type from the playbook and a different angle.
- The caption must contain the RERA number exactly as given and the text rera.karnataka.gov.in. The app adds the RERA number, the K-RERA website and an AI-generated label on screen itself, so do not write them into the spoken text or the on-screen text. Never put 'AI-generated' or any RERA text in on_screen_text.
- Never write: guaranteed, assured or committed returns; price-rise or appreciation forecasts; promised handover dates; 'pre-launch', 'book now' or other booking pressure; 'RERA approved' (say 'RERA registered'); 'subject to change' or similar disclaimers; invented urgency ('only 3 left'); 'best', 'only' or 'first' claims; invented customers or testimonials; approvals, khata or title claims that are not in the brochure facts.
- audience says who this script suits best, one of: families, first-time buyers, investors, NRI buyers, everyone. audience_reason is one plain sentence on why.
- why_this_works.reel_id must be an "id" copied from the teardowns, for a reel with the same hook type or format; reason is one plain sentence.`;

const SCRIPT_SHAPE = `{"scripts":[{"audience":"families","audience_reason":"","hook_type":"","format":"","beats":[{"label":"Hook","spoken":"","visual":"","on_screen_text":""},{"label":"Build","spoken":"","visual":"","on_screen_text":""},{"label":"Proof","spoken":"","visual":"","on_screen_text":""},{"label":"CTA","spoken":"comment-keyword CTA","visual":"","on_screen_text":""}],"caption":"","facts_used":[""],"why_this_works":{"reel_id":"","page":"","multiple_vs_median":0,"reason":""}}]}`;

/** What to tell the model about who the scripts are for. "auto" lets it choose the audiences the property suits. */
const AUDIENCE_WORDS: Record<BuyerType, string> = { family: "families", investor: "investors", nri: "NRI buyers", "first-time buyer": "first-time buyers" };

function audienceLine(buyer: Audience): string {
  if (Array.isArray(buyer)) {
    const names = buyer.map((b) => AUDIENCE_WORDS[b]);
    return `A MIX of ${names.join(", ")}. Write at least one script for each of these audiences and set each script's audience to the one it is written for. With two audiences, the third script may speak to both at once (for example a young family that also thinks like an investor). Never write for an audience outside this list.`;
  }
  return buyer === "auto"
    ? "BEST FIT. Choose the audiences this property genuinely suits (families, first-time buyers, investors, NRI buyers, everyone). Do not force an audience the facts do not support."
    : buyer;
}

function compactTeardowns(t: Teardown[]) {
  return JSON.stringify(
    t.map((r) => ({ id: r.id, page: r.page, multiple_vs_median: r.multiple_vs_median, format: r.format, hook_type: r.hook_type, hook: r.hook })),
  );
}

export async function writeScripts(args: {
  facts: Facts;
  buyer: Audience;
  playbook: string;
  teardowns: Teardown[];
  localityFacts: string[];
  rulesJson: string;
  angles?: string;
  avoid?: string;
  extraNote?: string;
  ownerNotes?: string;
}): Promise<Script[]> {
  const prompt = `AUDIENCE: ${audienceLine(args.buyer)}

BROCHURE FACTS:
${JSON.stringify(args.facts)}

VERIFIED LOCALITY FACTS (use at least one if any are listed; if none, use none):
${JSON.stringify(args.localityFacts)}

PLAYBOOK:
${args.playbook}

TOP REEL TEARDOWNS:
${compactTeardowns(args.teardowns)}

COMPLIANCE RULES:
${args.rulesJson}
${args.ownerNotes ? `\nTHE DEVELOPER'S OWN NOTES (they tell you what to emphasise and the tone they want. They are NOT a source of facts: never copy a number, claim or name from them unless the brochure facts above say the same):\n${args.ownerNotes}\n` : ""}${args.angles ? `\nPROPERTY BRIEF ANGLES (built from this brochure; let each script follow a different angle, still using only the facts above):\n${args.angles}\n` : ""}${args.avoid ? `\nDO NOT USE these figures or claims. The brochure contradicts itself or leaves them unclear, so any script that repeats them is wrong:\n${args.avoid}\n` : ""}
Write exactly 3 complete scripts (full timed beats: hook, middle, CTA), each with a different hook type and a different angle. For BEST FIT, give each script the audience it suits best and use at least two different audiences across the three (for example families, first-time buyers, everyone), whenever the facts genuinely support them; use 'everyone' for at most one. For a named audience, write all three for that audience. For a MIX, follow the AUDIENCE line. ${args.extraNote ?? ""}
Return JSON in this shape: ${SCRIPT_SHAPE}`;
  return askJson([{ text: prompt }], SCRIPT_SYSTEM, (x) => {
    const s = validateScripts(x);
    if (s.length !== 3) throw new Error(`expected 3 scripts, got ${s.length}`);
    return s;
  }, ThinkingLevel.LOW, { timeoutMs: 75_000 });
}

const BRIEF_SYSTEM = `You are a Bengaluru real estate analyst and content strategist preparing a property intelligence brief BEFORE any script is written. Reply with one JSON object and nothing else.
Rules:
- Use ONLY the numbered brochure facts you are given (F1, F2...). Cite them by id. Never invent a price, distance, approval, amenity, date, rental yield, appreciation forecast or comparison with other projects.
- Missing information is a gap, never a fact. List gaps and anything that looks contradictory or unclear in 'limitations'.
- No location research is provided beyond the facts. Do not state distances, travel times, metro, IT hubs or infrastructure. Do not guess what is near the project.
- Mark a selling point 'inference' true when it is your reasoning rather than a stated fact.
- Plain, warm words. Each sentence under 30 words.
- Angles must be specific and differentiated, not generic ("Introducing our luxury project"). Each angle uses one hook_type from the allowed list, a format, a comment-keyword CTA, and cites fact ids. evidence_reel_id must be an id copied from the example reels, for a reel with the same hook type.
- Never use guaranteed or assured returns, forecasts, promised dates, pre-launch or booking pressure, 'RERA approved', 'subject to change', invented urgency, or superlatives like best or only.`;

export interface BriefRaw {
  summary?: unknown;
  selling_points?: { point?: unknown; why_it_matters?: unknown; fact_ids?: unknown; inference?: unknown }[];
  limitations?: { item?: unknown; kind?: unknown }[];
  personas?: { buyer?: unknown; needs?: unknown; fit?: unknown }[];
  angles?: Record<string, unknown>[];
}

/** AI call: draft the brief. The caller (lib/brief.ts) validates every citation, so nothing here is trusted as-is. */
export async function writeBrief(args: {
  facts: { id: string; text: string }[];
  buyer: Audience;
  hookTypes: string[];
  exampleReels: { id: string; hook_type: string; hook: string }[];
  location: string | null;
}): Promise<{ raw: BriefRaw; model: string }> {
  const prompt = `BUYER TYPE: ${audienceLine(args.buyer)}
LOCATION AS WRITTEN IN THE BROCHURE: ${args.location ?? "not stated"}

BROCHURE FACTS (cite by id):
${args.facts.map((f) => `${f.id}: ${f.text}`).join("\n")}

ALLOWED HOOK TYPES: ${JSON.stringify(args.hookTypes)}

EXAMPLE REELS (cite an id for evidence_reel_id):
${JSON.stringify(args.exampleReels)}

Return JSON in this shape:
{"summary":"2 sentences on what this property is, from the facts only",
"selling_points":[{"point":"","why_it_matters":"for this buyer type","fact_ids":["F1"],"inference":false}],
"limitations":[{"item":"","kind":"missing|risk|contradiction|question"}],
"personas":[{"buyer":"","needs":"","fit":"how well the property fits, honestly"}],
"angles":[{"title":"","story":"the story in 2 sentences","buyer":"","hook_type":"","hook_example":"one opening line","format":"","cta":"comment-keyword CTA","reasoning":"why this angle suits this property","fact_ids":["F2"],"evidence_reel_id":""}]}
Give 3 to 5 selling_points ranked by relevance, 3 to 6 limitations, 2 to 3 personas and 3 to 5 angles.`;
  let model = "";
  const raw = await askJson([{ text: prompt }], BRIEF_SYSTEM, (x) => {
    if (!x || typeof x !== "object") throw new Error("brief is not an object");
    return x as BriefRaw;
  }, ThinkingLevel.LOW, { timeoutMs: 30_000, budgetMs: 35_000, onModel: (m) => { model = m; } });
  return { raw, model };
}

export async function rewriteScript(args: {
  facts: Facts;
  buyer: Audience;
  script: Script;
  failures: string[];
  teardowns: Teardown[];
}): Promise<Script> {
  // Show the model the beat shape it must return, not the derived flat fields.
  const s = args.script;
  const shown = s.beats
    ? { audience: s.audience, audience_reason: s.audience_reason, hook_type: s.hook_type, format: s.format, beats: s.beats.map((b) => ({ label: b.label, spoken: b.spoken, visual: b.visual, on_screen_text: b.on_screen_text })), caption: s.caption, facts_used: s.facts_used, why_this_works: s.why_this_works }
    : s;
  const spoken = (s.beats ?? []).reduce((n, b) => n + b.spoken.trim().split(/s+/).filter(Boolean).length, 0);
  const tooShort = args.failures.some((f) => f.startsWith("Too short"));
  const lengthNote = tooShort
    ? `
LENGTH: the script has only ${spoken} spoken words. It must have between 85 and 110. Add about ${Math.max(15, 95 - spoken)} words: lengthen two or three of the middle beats with one more concrete fact or scene each, taken only from the brochure facts. Do not pad with filler. Keep the hook short. Count the words before you answer.
`
    : "";
  const prompt = `This reel script failed checks. Fix only what failed; keep the hook type, the audience, the beat structure and the idea.${lengthNote}

AUDIENCE: ${audienceLine(args.buyer)}
BROCHURE FACTS: ${JSON.stringify(args.facts)}
SCRIPT: ${JSON.stringify(shown)}
FAILED CHECKS:
- ${args.failures.join("\n- ")}

TEARDOWN REEL IDS YOU MAY CITE: ${JSON.stringify(args.teardowns.map((t) => t.id))}

Return JSON in this shape with exactly one script: ${SCRIPT_SHAPE}`;
  const out = await askJson([{ text: prompt }], SCRIPT_SYSTEM, (x) => {
    const s = validateScripts(x);
    if (s.length < 1) throw new Error("no script");
    return s;
  }, ThinkingLevel.LOW, { timeoutMs: 45_000 });
  return out[0];
}
