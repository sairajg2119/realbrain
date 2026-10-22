// Export the Social Brain into the app's brain/ files (same schema the script engine already reads).
// Idempotent: the original app files are copied once to social-brain/backup/ and the playbook is always rebuilt from that copy.
// Run: npm run brain:export   (after brain:build)
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SB = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP_BRAIN = join(SB, "..", "brain");
const BACKUP = join(SB, "backup");
mkdirSync(BACKUP, { recursive: true });
for (const f of ["playbook.md", "teardowns.json"]) {
  if (!existsSync(join(BACKUP, f))) copyFileSync(join(APP_BRAIN, f), join(BACKUP, f));
}

const jsonl = (p: string) => readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const teardowns = jsonl(join(SB, "brain", "reel_teardowns.jsonl"));
const reels = new Map<string, any>(jsonl(join(SB, "brain", "instagram_reels_normalized.jsonl")).map((r) => [r.reel_id, r]));
const hookTax = JSON.parse(readFileSync(join(SB, "brain", "hook_taxonomy.json"), "utf8")) as any[];
const failures = JSON.parse(readFileSync(join(SB, "brain", "failure_library.json"), "utf8")) as any[];
const cta = JSON.parse(readFileSync(join(SB, "brain", "cta_intelligence.json"), "utf8"));
const meta = JSON.parse(readFileSync(join(SB, "brain", "research_metadata.json"), "utf8"));
const baselines = new Map<string, any>((JSON.parse(readFileSync(join(SB, "brain", "account_performance_baselines.json"), "utf8")) as any[]).map((b) => [b.page, b]));

// Names the playbook already uses (spaces, hyphens) so hook types stay consistent in the prompt.
const HOOK_NAME: Record<string, string> = {
  bold_money_number: "bold money number", pattern_interrupt_question: "pattern-interrupt question", audience_callout: "audience call-out",
  place_transformation: "place + transformation", curiosity_superlative: "curiosity + superlative", rare_feature: "rare feature",
  confession_insider: "confession", list_promise: "list promise", relatable_humour: "relatable humour", construction_spectacle: "construction spectacle",
  founder_insight: "founder insight", market_proof: "market proof", buyer_misconception: "buyer misconception", question_analogy: "question + analogy",
  story_emotional: "emotional story",
};
const SKIP = new Set(["other", "unknown", "visual_only_no_hook", "news_or_celebrity", "announcement", "plain_listing", "question", "relatable_humour", "story_emotional"]);
// Pages whose reach comes from a famous personal brand or entertainment, not property intent. Kept in the data, not used as script exemplars.
const NOT_EXEMPLARS = new Set(["ryanserhant", "realtordotcom", "thebrokeagent"]);
const MIN_HOOK_CHARS = 20; // shorter openers are transcript fragments ("yes", "What did I just witness?") and teach nothing

const pool = teardowns
  .filter((t) => t.performance.baseline_reliable && t.performance.multiple >= 2 && t.hook.opening_line && !SKIP.has(t.hook.type) && !NOT_EXEMPLARS.has(t.page) && t.hook.opening_line.length >= MIN_HOOK_CHARS && t.hook.type in HOOK_NAME)
  .sort((a, b) => b.performance.multiple - a.performance.multiple);
const perType = new Map<string, number>();
const picked: any[] = [];
for (const t of pool) {
  const n = perType.get(t.hook.type) ?? 0;
  if (n >= 4) continue;
  perType.set(t.hook.type, n + 1);
  picked.push(t);
}
// Developer-relevant context first: any Bengaluru breakouts the filters kept.
picked.sort((a, b) => b.performance.multiple - a.performance.multiple);

const reelsOut = picked.map((t) => {
  const r = reels.get(t.reel_id);
  const b = baselines.get(t.page);
  return {
    id: t.short_code, url: t.url, page: t.page, plays: t.performance.plays, page_median: t.performance.baseline_median_plays,
    multiple_vs_median: t.performance.multiple, duration_s: t.duration_s,
    format: String(t.format.type).replace(/_/g, " "), hook_type: HOOK_NAME[t.hook.type], hook: t.hook.opening_line, hook_source: t.hook.opening_source,
    cta: t.cta.primary.replace(/_/g, " "), why_it_worked: `Plausible, not proven: ${(t.likely_drivers ?? "no explanation recorded").replace(/^plausible[,:]?\s*/i, "")}`,
    baseline_n: b?.n_with_plays, market: ["inbengaluruproperties", "invest_in_bengaluru"].includes(t.page) ? "Bengaluru" : "other",
    analysis_basis: t.coverage.analysis_basis,
  };
});

writeFileSync(join(APP_BRAIN, "teardowns.json"), JSON.stringify({
  scraped_at: "2026-10-21",
  _meta: {
    source: `Social Brain ${meta.pipeline_version}: ${meta.counts.reels_normalized} Instagram reels from ${meta.counts.pages_in_data} pages (Apify datasets ${meta.sources.reels_dataset} and ${meta.sources.transcripts_dataset}).`,
    selection: "Reels at 2x or more (breakouts) of their own page median plays, with an opening line of 20+ characters, at most 4 per hook type. Entertainment and famous-brand pages (ryanserhant, realtordotcom, thebrokeagent) and humour or emotional-story hooks are kept in the Social Brain but not offered as script exemplars. Winners only; failure patterns are in playbook.md.",
    limits: "Multiples compare a reel with its own page's median over about the latest 20 reels. Mostly US pages. why_it_worked is an LLM reading of caption/transcript and a plausible explanation, never proof of cause. Visuals were not analysed.",
    built_at: meta.built_at, reels_in_file: reelsOut.length,
  },
  reels: reelsOut,
}, null, 2) + "\n");

// ---- playbook: original rules and templates + an evidence section
const base = readFileSync(join(BACKUP, "playbook.md"), "utf8");
const header = `# RealBrain playbook (evidence-backed v2)

> Patterns below are checked against ${meta.counts.reels_normalized} reels from ${meta.counts.pages_in_data} Instagram pages, each reel compared with its own page's median plays. They are associations from a mostly-US, one-day snapshot, not proof of cause. The hook templates and 10 rules carry over from playbook v1.
`;
const body = base.replace(/^# .*\n+(> .*\n+)?/, "");
const topHooks = hookTax.filter((h) => h.n >= 8 && h.evidence_level === "established" && HOOK_NAME[h.name] && !SKIP.has(h.name)).sort((a, b) => b.median_multiple - a.median_multiple).slice(0, 5);
const ck = cta.comment_keyword_comparison;
const spec = failures.find((f: any) => f.id === "F1");
const evidence = `## What the data says (read before choosing a hook)
- Hook types with the best median results at 8 or more reels from 3 or more pages (median x of the page's own median plays): ${topHooks.map((h) => `${HOOK_NAME[h.name]} ${h.median_multiple}x (n=${h.n})`).join("; ")}.
- Comment-keyword CTAs did not raise plays (${ck.with_keyword_cta.median_multiple}x vs ${ck.without.median_multiple}x) but drew about ${Math.round(ck.with_keyword_cta.median_comments_per_play / ck.without.median_comments_per_play)}x the comments per play. Comments are not the same as qualified leads.
- Spec-line or project-name openings: ${spec?.verdict ?? "n/a"} in this data (lift ${spec?.lift_vs_base_rate}). Keep rule 2 because it is sound practice, but do not cite it as proven.
- A very short caption was the only weak-opening pattern clearly more common among underperformers. Put the story and the CTA keyword in the caption.
- Only ${meta.counts.bengaluru_reels} of the ${meta.counts.reels_normalized} reels are from Bengaluru pages. Treat Bengaluru-specific advice as hypotheses to test.
- Breakouts from celebrity news, pranks and a famous broker's brand reached views through fame or entertainment, not property intent. Copy the mechanism (number first, a question, a call-out), never the topic.

`;
const rulesIdx = body.indexOf("## The 10 rules");
const merged = header + "\n" + (rulesIdx > 0 ? body.slice(0, rulesIdx) + evidence + body.slice(rulesIdx) : body + "\n" + evidence);
writeFileSync(join(APP_BRAIN, "playbook.md"), merged);

console.log(JSON.stringify({ reels_in_teardowns: reelsOut.length, by_hook: Object.fromEntries(perType), bengaluru: reelsOut.filter((r) => r.market === "Bengaluru").length, playbook_chars: merged.length }, null, 2));
