// LLM teardown pass over normalized reels (caption + transcript only; no video).
// Cached per reel + prompt version, so re-runs only pay for new or changed reels.
// Run: npm run brain:enrich   (needs GEMINI_API_KEY in .env.local)
import { readFileSync, appendFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ApiError, GoogleGenAI } from "@google/genai";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = join(ROOT, "cache");
const CACHE = join(CACHE_DIR, "llm_teardowns.jsonl");
const ERRORS = join(CACHE_DIR, "llm_errors.jsonl");
const PROMPT_VERSION = "teardown-v1";
const BATCH = 12;
const LIMIT = Number(process.env.ENRICH_LIMIT ?? 100000);
mkdirSync(CACHE_DIR, { recursive: true });

export const HOOKS = ["bold_money_number", "pattern_interrupt_question", "audience_callout", "place_transformation", "curiosity_superlative", "rare_feature", "confession_insider", "list_promise", "relatable_humour", "construction_spectacle", "founder_insight", "market_proof", "buyer_misconception", "question_analogy", "announcement", "plain_listing", "story_emotional", "news_or_celebrity", "visual_only_no_hook", "other"];
export const FORMATS = ["construction_or_development", "walkthrough_or_tour", "interview_or_conversation", "humour_or_skit", "education_or_advice", "market_commentary", "listing_announcement", "lifestyle_or_story", "talking_head", "fast_visual_tour", "news_slides", "other"];
export const CTAS = ["comment_keyword", "request_information", "save", "share", "ask_question", "follow_series", "visit_website", "book_site_visit", "direct_message", "phone_number", "none_visible", "other"];

const SYSTEM = `You are a social media strategist analysing Instagram real estate reels. You only see each reel's caption, an optional transcript and its duration. You cannot see the video, so never describe visuals. Judge only from the text.
Reply with one JSON object: {"items":[...]} with one item per reel, in the same order, each item:
{"i": <index>, "hook_type": one of ${JSON.stringify(HOOKS)}, "format": one of ${JSON.stringify(FORMATS)}, "cta_types": [subset of ${JSON.stringify(CTAS)}], "cta_keyword": string|null, "audience": short phrase for the intended viewer, "buyer_type": one of ["first_time_buyer","family_upgrader","investor","nri","luxury_buyer","agent_or_professional","general_audience","unclear"], "has_price_or_number": true/false, "uses_locality_or_infrastructure": true/false, "strengths": one short sentence, "weaknesses": one short sentence, "likely_drivers": one short sentence of a plausible reason it did or did not travel (say 'plausible'), "confidence": "low"|"medium"|"high"}
Rules: the hook is the opening line (transcript if given, else the first caption line). Use "visual_only_no_hook" only if there is no usable text. Do not invent facts. Do not claim causes; use hedged language. Keep every sentence under 30 words.`;

function loadCache(): Map<string, any> {
  const m = new Map<string, any>();
  if (!existsSync(CACHE)) return m;
  for (const l of readFileSync(CACHE, "utf8").split("\n").filter(Boolean)) {
    const r = JSON.parse(l);
    if (r.prompt_version === PROMPT_VERSION) m.set(r.reel_id, r);
  }
  return m;
}

// Lite first: it is the model that had quota left, and it keeps the main models free for the live app.
const MODELS = [process.env.ENRICH_MODEL, "gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash"].filter((m, i, a): m is string => !!m && a.indexOf(m) === i);
let mi = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ask(ai: GoogleGenAI, payload: string): Promise<{ items: any[]; model: string }> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODELS[mi], contents: [{ role: "user", parts: [{ text: payload }] }],
        config: { systemInstruction: SYSTEM, responseMimeType: "application/json", temperature: 0.2 },
      });
      const t = (res.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
      if (!Array.isArray(j.items)) throw new Error("no items array");
      return { items: j.items, model: MODELS[mi] };
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401 || e.status === 403) throw new Error("Gemini rejected the key (check GEMINI_API_KEY).");
        if ((e.status === 429 || e.status === 404) && mi < MODELS.length - 1) { mi++; continue; }
        if (e.status === 429) throw new Error("All models are rate limited. Re-run later; cached reels are kept.");
        if (e.status === 503) { await sleep(4000 * (attempt + 1)); continue; }
      }
      console.error(`  attempt ${attempt + 1} on ${MODELS[mi]}: ${String(e).slice(0, 140)}`);
      if (attempt >= 2) throw e;
    }
  }
  throw new Error("Gemini failed after retries");
}

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.error("GEMINI_API_KEY missing. Add it to .env.local. Nothing was sent."); process.exit(2); }
  const ai = new GoogleGenAI({ apiKey: key });
  const reels = readFileSync(join(ROOT, "brain", "instagram_reels_normalized.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const cache = loadCache();
  const todo = reels.filter((r) => !cache.has(r.reel_id)).slice(0, LIMIT);
  console.log(`reels ${reels.length}, cached ${cache.size}, to do ${todo.length}`);
  let done = 0, failed = 0;
  for (let s = 0; s < todo.length; s += BATCH) {
    const batch = todo.slice(s, s + BATCH);
    const payload = JSON.stringify(batch.map((r, i) => ({
      i, page: r.source_page, duration_s: r.duration_s, opening_line: r.opening_line, opening_source: r.opening_source,
      caption: (r.caption ?? "").slice(0, 700), transcript: r.transcript ? r.transcript.slice(0, 900) : null,
    })));
    try {
      const { items, model } = await ask(ai, payload);
      for (const it of items) {
        const r = batch[it.i];
        if (!r || !HOOKS.includes(it.hook_type) || !FORMATS.includes(it.format)) { failed++; appendFileSync(ERRORS, JSON.stringify({ reel_id: r?.reel_id, why: "invalid enum or index", it }) + "\n"); continue; }
        const rec = { reel_id: r.reel_id, prompt_version: PROMPT_VERSION, model, at: new Date().toISOString(),
          hook_type: it.hook_type, format: it.format, cta_types: (Array.isArray(it.cta_types) ? it.cta_types : []).filter((c: string) => CTAS.includes(c)),
          cta_keyword: typeof it.cta_keyword === "string" ? it.cta_keyword : null, audience: it.audience ?? null, buyer_type: it.buyer_type ?? "unclear",
          has_price_or_number: !!it.has_price_or_number, uses_locality_or_infrastructure: !!it.uses_locality_or_infrastructure,
          strengths: it.strengths ?? null, weaknesses: it.weaknesses ?? null, likely_drivers: it.likely_drivers ?? null, confidence: it.confidence ?? "low" };
        appendFileSync(CACHE, JSON.stringify(rec) + "\n"); cache.set(r.reel_id, rec); done++;
      }
      console.log(`batch ${s / BATCH + 1}/${Math.ceil(todo.length / BATCH)} ok (${model}) total ${done}`);
    } catch (e) {
      failed += batch.length;
      appendFileSync(ERRORS, JSON.stringify({ batch_start: s, why: String(e) }) + "\n");
      console.error(`batch at ${s} failed: ${String(e).slice(0, 160)}`);
      if (/rate limited|rejected/.test(String(e))) break;
    }
  }
  console.log(`done ${done}, failed ${failed}, cache ${cache.size}/${reels.length}`);
}
main();
