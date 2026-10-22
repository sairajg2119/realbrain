import { ApiError, GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import type { BuyerType, Facts, Script, Teardown } from "./types.ts";

// Free-plan quotas are counted per model, so when one is used up we move to the next one.
const MODELS = [process.env.GEMINI_MODEL, "gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"].filter(
  (m, i, a): m is string => !!m && a.indexOf(m) === i,
);
let modelIdx = 0;

export class SetupError extends Error {}

function client() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new SetupError("Setup problem: GEMINI_API_KEY is missing. Add it to .env.local (or Vercel's Environment Variables).");
  }
  return new GoogleGenAI({ apiKey: key });
}

function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? t.slice(start, end + 1) : t);
}

export function isRateLimit(e: unknown): boolean {
  return e instanceof ApiError && e.status === 429;
}

/** Ask Gemini for JSON. Retries once on bad JSON or a failed validation. */
async function askJson<T>(parts: Part[], system: string, validate: (x: unknown) => T, thinking?: ThinkingLevel): Promise<T> {
  const ai = client();
  let lastError = "";
  let busyRetries = 0;
  let useThinking = true;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODELS[modelIdx],
        contents: [{ role: "user", parts }],
        config: { systemInstruction: system, responseMimeType: "application/json", temperature: 0.3, ...(thinking && useThinking ? { thinkingConfig: { thinkingLevel: thinking } } : {}) },
      });
      return validate(parseJson(res.text ?? ""));
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401 || e.status === 403 || /API key/i.test(e.message)) {
          throw new SetupError("Setup problem: Gemini rejected the API key. Check GEMINI_API_KEY.");
        }
        // Daily quota used up (429) or model unavailable (404): switch to the next model and try again.
        if ((e.status === 429 || e.status === 404) && modelIdx < MODELS.length - 1) {
          modelIdx++;
          attempt--;
          continue;
        }
        // This model does not accept a thinking level: try again without it.
        if (e.status === 400 && /thinking/i.test(e.message) && useThinking) {
          useThinking = false;
          attempt--;
          continue;
        }
        // 503 = Google is busy for a moment: wait and try the same request again (up to 4 times).
        if (e.status === 503 && busyRetries < 4) {
          busyRetries++;
          attempt--;
          await new Promise((r) => setTimeout(r, 4000 * busyRetries));
          continue;
        }
        throw e;
      }
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`Gemini did not return usable JSON twice. ${lastError}`);
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
  );
}

function validateScripts(x: unknown): Script[] {
  const arr = (x as { scripts?: unknown })?.scripts;
  if (!Array.isArray(arr) || arr.length === 0) throw new Error("scripts missing");
  return arr.map((s) => {
    const o = s as Record<string, any>;
    for (const k of ["hook_type", "format", "hook", "body", "cta", "caption"]) {
      if (typeof o[k] !== "string" || !o[k].trim()) throw new Error(`script.${k} missing`);
    }
    const w = o.why_this_works ?? {};
    if (typeof w.reel_id !== "string") throw new Error("why_this_works.reel_id missing");
    return {
      hook_type: o.hook_type,
      format: o.format,
      hook: o.hook,
      body: o.body,
      cta: o.cta,
      caption: o.caption,
      target_duration_s: Number(o.target_duration_s) || 30,
      facts_used: strList(o.facts_used),
      why_this_works: {
        reel_id: w.reel_id,
        page: String(w.page ?? ""),
        multiple_vs_median: Number(w.multiple_vs_median) || 0,
        reason: String(w.reason ?? ""),
      },
    };
  });
}

const SCRIPT_SYSTEM = `You write Instagram reel scripts for Bengaluru real estate developers, spoken by an AI avatar. Plain, warm words. No corporate phrases.
Reply with one JSON object and nothing else.
Hard rules:
- Use ONLY facts and numbers from the brochure facts and locality facts you are given. Do not write any other number anywhere (no "3 reasons", no years, no distances) unless it appears in the facts.
- Never promise returns, appreciation, refunds, dates or prices that are not in the facts.
- Follow the playbook's 10 rules. Each script uses a different hook type from the playbook.
- The caption must contain the RERA number exactly as given and the text rera.karnataka.gov.in. The app adds the RERA number, the K-RERA website and an AI-generated label on screen itself, so do not write them into the spoken text.
- Never write: guaranteed, assured or committed returns; price-rise or appreciation forecasts; promised handover dates; 'pre-launch', 'book now' or other booking pressure; 'RERA approved' (say 'RERA registered'); 'subject to change' or similar disclaimers; invented urgency ('only 3 left'); 'best', 'only' or 'first' claims; invented customers or testimonials; approvals, khata or title claims that are not in the brochure facts.
- hook + body + cta together must be at most 2.5 spoken words per second of target_duration_s.
- why_this_works.reel_id must be an "id" copied from the teardowns, for a reel with the same hook type or format; reason is one plain sentence.`;

const SCRIPT_SHAPE = `{"scripts":[{"hook_type":"","format":"","hook":"","body":"","cta":"comment-keyword CTA","caption":"","target_duration_s":30,"facts_used":[""],"why_this_works":{"reel_id":"","page":"","multiple_vs_median":0,"reason":""}}]}`;

function compactTeardowns(t: Teardown[]) {
  return JSON.stringify(
    t.map((r) => ({ id: r.id, page: r.page, multiple_vs_median: r.multiple_vs_median, format: r.format, hook_type: r.hook_type, hook: r.hook })),
  );
}

export async function writeScripts(args: {
  facts: Facts;
  buyer: BuyerType;
  playbook: string;
  teardowns: Teardown[];
  localityFacts: string[];
  rulesJson: string;
  extraNote?: string;
}): Promise<Script[]> {
  const prompt = `BUYER TYPE: ${args.buyer}

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

Write exactly 3 scripts for this buyer type, with 3 different hook types. ${args.extraNote ?? ""}
Return JSON in this shape: ${SCRIPT_SHAPE}`;
  return askJson([{ text: prompt }], SCRIPT_SYSTEM, (x) => {
    const s = validateScripts(x);
    if (s.length !== 3) throw new Error(`expected 3 scripts, got ${s.length}`);
    return s;
  }, ThinkingLevel.LOW);
}

export async function rewriteScript(args: {
  facts: Facts;
  buyer: BuyerType;
  script: Script;
  failures: string[];
  teardowns: Teardown[];
}): Promise<Script> {
  const prompt = `This reel script failed checks. Fix only what failed; keep the hook type and the idea.

BUYER TYPE: ${args.buyer}
BROCHURE FACTS: ${JSON.stringify(args.facts)}
SCRIPT: ${JSON.stringify(args.script)}
FAILED CHECKS:
- ${args.failures.join("\n- ")}

TEARDOWN REEL IDS YOU MAY CITE: ${JSON.stringify(args.teardowns.map((t) => t.id))}

Return JSON in this shape with exactly one script: ${SCRIPT_SHAPE}`;
  const out = await askJson([{ text: prompt }], SCRIPT_SYSTEM, (x) => {
    const s = validateScripts(x);
    if (s.length < 1) throw new Error("no script");
    return s;
  });
  return out[0];
}
