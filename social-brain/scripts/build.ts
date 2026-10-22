// Social Brain build: raw JSONL -> normalized reels, baselines, teardowns, patterns, failure library, playbook.
// Idempotent and deterministic: re-running overwrites derived files only. Raw files are never written here.
// Run: npm run brain:build
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  median, quantile, round, relativeMultiple, classify, percentileWithin, cleanCount, perPlay,
  handleFromUrl, postsPer30Days, dedupeBy, evidenceLevel, MIN_BASELINE_SAMPLE, THRESHOLDS,
} from "../lib/metrics.ts";
import { openingLine, classifyHook, classifyCtas, classifyFormat, weakOpeningFlags } from "../lib/classify.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(ROOT, "raw");
const OUT = join(ROOT, "brain");
const PIPELINE_VERSION = "social-brain-1.0.0";
const NOW = new Date().toISOString();
mkdirSync(OUT, { recursive: true });

const readJsonl = (p: string): any[] =>
  existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const writeJson = (name: string, data: unknown) => writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + "\n");
const writeJsonl = (name: string, rows: unknown[]) => writeFileSync(join(OUT, name), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

// Profile facts that come from the project research notes (21 Oct 2026), not from the reel dataset.
// They are labelled as such and were not re-verified in this run.
const NOTES: Record<string, { followers: number; market: string; kind: string }> = {
  ryanserhant: { followers: 3_390_000, market: "US", kind: "personal_brand_broker" },
  luxury_listings: { followers: 3_640_000, market: "US", kind: "media_page" },
  "abby.young.home": { followers: 24_000, market: "US", kind: "personal_brand_agent" },
  thebrokeagent: { followers: 542_000, market: "US", kind: "entertainment_page" },
  "matt.lionetti": { followers: 74_000, market: "US", kind: "personal_brand_agent" },
  enesyilmazer: { followers: 822_000, market: "US", kind: "personal_brand_tours" },
  themillerfam: { followers: 107_000, market: "US", kind: "personal_brand_agent" },
  sothebysrealty: { followers: 587_000, market: "US/global", kind: "brokerage_brand" },
  unionsquarehouse: { followers: 36_000, market: "Dubai", kind: "agency" },
  coffeecontracts: { followers: 165_000, market: "US", kind: "educator" },
  chadcarroll: { followers: 459_000, market: "US", kind: "personal_brand_broker" },
  tradedny: { followers: 113_000, market: "US", kind: "media_page" },
  tradedmiami: { followers: 104_000, market: "US", kind: "media_page" },
  jayroberts: { followers: 189_000, market: "US", kind: "personal_brand_developer" },
  realtordotcom: { followers: 681_000, market: "US", kind: "portal_brand" },
  luxury_homes: { followers: 1_240_000, market: "US", kind: "media_page" },
  inbengaluruproperties: { followers: 35_000, market: "Bengaluru", kind: "property_page" },
  luxurysocalrealty: { followers: 52_000, market: "US", kind: "agent_team" },
  alliebethallman: { followers: 13_000, market: "US", kind: "brokerage" },
  "the.real.brad.mccallum": { followers: 37_000, market: "US", kind: "video_creator" },
  atproperties: { followers: 52_000, market: "US", kind: "brokerage" },
  brockandlori: { followers: 54_000, market: "US", kind: "personal_brand_agents" },
  invest_in_bengaluru: { followers: 46_000, market: "Bengaluru", kind: "property_page" },
  "emilywalczak.realtor": { followers: 22_000, market: "US", kind: "personal_brand_agent" },
  espacerealestate: { followers: 31_000, market: "Dubai", kind: "agency" },
};
const BENGALURU_PAGES = new Set(["inbengaluruproperties", "invest_in_bengaluru"]);

// ---------------------------------------------------------------- load raw
const rawReels = readJsonl(join(RAW, "instagram_reels_raw.jsonl"));
const rawTranscripts = readJsonl(join(RAW, "instagram_transcripts_raw.jsonl"));
const { kept: reelsRaw, dropped: duplicatesDropped } = dedupeBy(rawReels, (r) => String(r.shortCode ?? r.id));
const transcriptByCode = new Map(rawTranscripts.map((t) => [t.shortCode, t]));

// ---------------------------------------------------------------- normalize
interface Reel {
  reel_id: string; short_code: string; url: string; source_page: string; owner_handle: string | null;
  is_collab_post: boolean; published_at: string | null; collected_from: string;
  plays: number | null; likes: number | null; comments: number | null; shares: null; saves: null;
  duration_s: number | null; is_pinned: boolean | null; paid_partnership: boolean | null;
  caption: string | null; hashtags: string[]; audio_name: string | null; original_audio: boolean | null;
  transcript: string | null; transcript_status: string; language: string | null;
  opening_line: string | null; opening_source: "transcript" | "caption" | null;
  provenance: { dataset_id: string; transcript_dataset_id: string | null; method: string; fields_missing: string[] };
}

const reels: Reel[] = reelsRaw.map((r) => {
  const tr = transcriptByCode.get(r.shortCode);
  const transcript = tr?.status === "transcribed" && tr.transcript ? String(tr.transcript) : null;
  const opening = openingLine(transcript, r.caption ?? null);
  const source = handleFromUrl(r.inputUrl) ?? (r.ownerUsername ?? "unknown").toLowerCase();
  const plays = cleanCount(r.videoPlayCount);
  const out: Reel = {
    reel_id: String(r.id), short_code: r.shortCode, url: `https://www.instagram.com/reel/${r.shortCode}/`,
    source_page: source, owner_handle: r.ownerUsername ?? null,
    is_collab_post: !!r.ownerUsername && r.ownerUsername.toLowerCase() !== source,
    published_at: r.timestamp ?? null, collected_from: r.inputUrl ?? "",
    plays, likes: cleanCount(r.likesCount), comments: cleanCount(r.commentsCount), shares: null, saves: null,
    duration_s: typeof r.videoDuration === "number" ? round(r.videoDuration, 1) : null,
    is_pinned: typeof r.isPinned === "boolean" ? r.isPinned : null,
    paid_partnership: typeof r.paidPartnership === "boolean" ? r.paidPartnership : null,
    caption: r.caption ?? null, hashtags: Array.isArray(r.hashtags) ? r.hashtags : [],
    audio_name: r["musicInfo.song_name"] ?? r.musicInfo?.song_name ?? null,
    original_audio: r["musicInfo.uses_original_audio"] ?? r.musicInfo?.uses_original_audio ?? null,
    transcript, transcript_status: tr ? tr.status : "not_requested", language: tr?.language ?? null,
    opening_line: opening.text, opening_source: opening.source,
    provenance: { dataset_id: "CB3SNYD4LPQW3BiyO", transcript_dataset_id: tr ? "4XrYkhay87CuwWHgw" : null,
      method: "apify instagram reel scraper (existing run), re-read via Apify MCP on 2026-10-22", fields_missing: [] },
  };
  const missing: string[] = ["followers_at_collection", "shares", "saves", "visual_analysis"];
  if (out.likes === null) missing.push("likes(hidden)");
  if (out.comments === null) missing.push("comments");
  if (!out.transcript) missing.push("transcript");
  if (out.plays === null) missing.push("plays");
  out.provenance.fields_missing = missing;
  return out;
});

// ---------------------------------------------------------------- baselines
const byPage = new Map<string, Reel[]>();
for (const r of reels) (byPage.get(r.source_page) ?? byPage.set(r.source_page, []).get(r.source_page)!).push(r);

interface Baseline {
  page: string; n_reels: number; n_with_plays: number; observation_window: { from: string | null; to: string | null };
  median_plays: number | null; p25_plays: number | null; p75_plays: number | null;
  median_likes: number | null; median_comments: number | null; likes_coverage: number;
  posts_per_30_days: number | null; reliable: boolean; reliability_note: string;
  consistency: { share_at_or_above_typical: number | null; breakouts: number; top_reel_share_of_total_plays: number | null; pattern: string };
  follower_relative_median: number | null; collected_at: string;
}
const baselines = new Map<string, Baseline>();
for (const [page, rs] of byPage) {
  const plays = rs.map((r) => r.plays).filter((x): x is number => x !== null);
  const dates = rs.map((r) => r.published_at).filter((x): x is string => !!x).sort();
  const med = median(plays);
  const multiples = plays.map((p) => relativeMultiple(p, med)!);
  const breakouts = multiples.filter((m) => m >= THRESHOLDS.breakout).length;
  const total = plays.reduce((a, b) => a + b, 0);
  const topShare = total > 0 ? Math.max(...plays) / total : null;
  const typicalOrBetter = multiples.length ? multiples.filter((m) => m >= THRESHOLDS.typical).length / multiples.length : null;
  const likes = rs.map((r) => r.likes).filter((x): x is number => x !== null);
  const comments = rs.map((r) => r.comments).filter((x): x is number => x !== null);
  const reliable = plays.length >= MIN_BASELINE_SAMPLE;
  let pattern = "insufficient data";
  if (reliable && typicalOrBetter !== null) {
    if (breakouts >= 3 && typicalOrBetter >= 0.6) pattern = "repeatable: several breakouts and mostly at-or-above typical";
    else if (breakouts <= 1 && (topShare ?? 0) > 0.5) pattern = "isolated outlier: one reel carries over half of all plays";
    else pattern = "mixed";
  }
  const followers = NOTES[page]?.followers ?? null;
  baselines.set(page, {
    page, n_reels: rs.length, n_with_plays: plays.length,
    observation_window: { from: dates[0] ?? null, to: dates[dates.length - 1] ?? null },
    median_plays: round(med, 0), p25_plays: round(quantile(plays, 0.25), 0), p75_plays: round(quantile(plays, 0.75), 0),
    median_likes: round(median(likes), 0), median_comments: round(median(comments), 0),
    likes_coverage: rs.length ? round(likes.length / rs.length, 2)! : 0,
    posts_per_30_days: round(postsPer30Days(dates), 1), reliable,
    reliability_note: reliable ? `Baseline from ${plays.length} reels (minimum ${MIN_BASELINE_SAMPLE}).`
      : `Only ${plays.length} reels collected; need ${MIN_BASELINE_SAMPLE}. Multiples for this page are shown but excluded from pattern statistics.`,
    consistency: { share_at_or_above_typical: round(typicalOrBetter, 2), breakouts, top_reel_share_of_total_plays: round(topShare, 2), pattern },
    follower_relative_median: followers && med ? round(med / followers, 3) : null,
    collected_at: NOW,
  });
}

// ---------------------------------------------------------------- teardown records
const strongest = (cs: string[]) => cs[0];
const teardowns: any[] = reels.map((r) => {
  const b = baselines.get(r.source_page)!;
  const multiple = relativeMultiple(r.plays, b.median_plays);
  const pagePlays = byPage.get(r.source_page)!.map((x) => x.plays).filter((x): x is number => x !== null);
  const cls = classify(multiple);
  const hook = classifyHook(r.opening_line);
  const cta = classifyCtas(r.caption, r.transcript);
  const format = classifyFormat(r.caption, r.transcript, r.hashtags);
  const flags = weakOpeningFlags(r.opening_line, cta.types as any, r.caption, r.duration_s);
  const followers = NOTES[r.source_page]?.followers ?? null;
  const basis = r.transcript ? "caption + transcript" : "caption only";
  const confidence = !b.reliable ? "low" : r.transcript ? "medium" : "low";
  return {
    reel_id: r.reel_id, short_code: r.short_code, url: r.url, page: r.source_page,
    performance: {
      plays: r.plays, baseline_median_plays: b.median_plays, baseline_n: b.n_with_plays, baseline_reliable: b.reliable,
      multiple: round(multiple, 2), class: cls, percentile_within_page: r.plays === null ? null : round(percentileWithin(r.plays, pagePlays), 2),
      likes_per_play: round(perPlay(r.likes, r.plays), 4), comments_per_play: round(perPlay(r.comments, r.plays), 5),
      shares_per_play: null, saves_per_play: null,
      plays_per_follower: followers && r.plays !== null ? round(r.plays / followers, 3) : null,
      plays_per_follower_note: "Descriptive ratio only. Plays include repeat views, so this is not unique reach.",
    },
    hook: { type: hook, opening_line: r.opening_line, opening_source: r.opening_source,
      hook_delivered_check: "not assessed (no video access)" },
    format: { type: format, basis: "caption/transcript keywords; visuals not analysed" },
    cta: { types: cta.types, primary: strongest(cta.types), keyword: cta.keyword },
    duration_s: r.duration_s,
    weak_opening_flags: flags,
    coverage: { transcript: !!r.transcript, caption: !!r.caption, visual_analysis: false, analysis_basis: basis },
    analysis_method: "rule-based v1 (regex over opening line, caption, transcript). No LLM, no video.",
    confidence,
    causal_status: "observed association only; no causal claim",
    learn: null as string | null, avoid_copying: null as string | null, suggested_experiment: null as string | null,
  };
});

// ---------------------------------------------------------------- merge cached LLM teardowns (optional)
const llm = new Map<string, any>();
const LLM_CACHE = join(ROOT, "cache", "llm_teardowns.jsonl");
for (const r of readJsonl(LLM_CACHE)) llm.set(r.reel_id, r);
let llmApplied = 0;
for (const t of teardowns) {
  const l = llm.get(t.reel_id);
  if (!l) continue;
  llmApplied++;
  t.hook.rule_based_type = t.hook.type; t.hook.type = l.hook_type;
  t.format.rule_based_type = t.format.type; t.format.type = l.format; t.format.basis = "LLM reading of caption/transcript; visuals not analysed";
  if (l.cta_types?.length) { t.cta.rule_based_types = t.cta.types; t.cta.types = l.cta_types; t.cta.primary = l.cta_types[0]; }
  t.audience = { description: l.audience, buyer_type: l.buyer_type };
  t.content_signals = { has_price_or_number: l.has_price_or_number, uses_locality_or_infrastructure: l.uses_locality_or_infrastructure };
  t.strengths = l.strengths; t.weaknesses = l.weaknesses; t.likely_drivers = l.likely_drivers;
  t.analysis_method = `LLM teardown (${l.model}, ${l.prompt_version}) over caption and transcript; rule-based flags kept. No video.`;
  t.confidence = t.performance.baseline_reliable ? (l.confidence === "high" && t.coverage.transcript ? "medium" : "low") : "low";
}

// ---------------------------------------------------------------- grouped statistics
const usable = teardowns.filter((t) => t.performance.baseline_reliable && t.performance.multiple !== null);
function groupStats(rows: any[], key: (t: any) => string[]) {
  const groups = new Map<string, any[]>();
  for (const t of rows) for (const k of key(t)) (groups.get(k) ?? groups.set(k, []).get(k)!).push(t);
  return [...groups.entries()].map(([name, ts]) => {
    const m = ts.map((t) => t.performance.multiple as number);
    const pages = new Set(ts.map((t) => t.page));
    const sortedByM = [...ts].sort((a, b) => b.performance.multiple - a.performance.multiple);
    const dropTop = sortedByM.slice(1).map((t) => t.performance.multiple as number);
    return {
      name, n: ts.length, pages: pages.size,
      median_multiple: round(median(m), 2), p25_multiple: round(quantile(m, 0.25), 2), p75_multiple: round(quantile(m, 0.75), 2),
      median_multiple_without_top_reel: round(median(dropTop), 2),
      breakout_share: round(m.filter((x) => x >= THRESHOLDS.breakout).length / m.length, 2),
      underperform_share: round(m.filter((x) => x < THRESHOLDS.typical).length / m.length, 2),
      evidence_level: evidenceLevel(ts.length, pages.size),
      top_examples: sortedByM.slice(0, 3).map((t) => ({ reel_id: t.reel_id, url: t.url, page: t.page, multiple: t.performance.multiple, opening_line: t.hook.opening_line })),
      lowest_examples: sortedByM.slice(-2).map((t) => ({ reel_id: t.reel_id, url: t.url, page: t.page, multiple: t.performance.multiple, opening_line: t.hook.opening_line })),
      median_duration_s: round(median(ts.map((t) => t.duration_s).filter((x): x is number => x !== null)), 0),
    };
  }).sort((a, b) => (Number(b.n >= 4) - Number(a.n >= 4)) || ((b.median_multiple ?? 0) - (a.median_multiple ?? 0)));
}
const overallMedian = round(median(usable.map((t) => t.performance.multiple)), 2);

const hookStats = groupStats(usable, (t) => [t.hook.type]);
const formatStats = groupStats(usable, (t) => [t.format.type]);
const ctaStats = groupStats(usable, (t) => t.cta.types);
const durationBucket = (d: number | null) => d === null ? "unknown" : d <= 15 ? "0-15s" : d <= 30 ? "16-30s" : d <= 60 ? "31-60s" : d <= 90 ? "61-90s" : "90s+";
const durationStats = groupStats(usable, (t) => [durationBucket(t.duration_s)]);
const marketOf = (page: string) => BENGALURU_PAGES.has(page) ? "Bengaluru" : (NOTES[page]?.market ?? "unclassified");
const marketStats = groupStats(usable, (t) => [marketOf(t.page)]);
const commentKeywordLift = (() => {
  const w = usable.filter((t) => t.cta.types.includes("comment_keyword"));
  const wo = usable.filter((t) => !t.cta.types.includes("comment_keyword"));
  const cm = (ts: any[]) => round(median(ts.map((t) => t.performance.comments_per_play).filter((x: any) => x !== null)), 5);
  return { with_keyword_cta: { n: w.length, median_comments_per_play: cm(w), median_multiple: round(median(w.map((t) => t.performance.multiple)), 2) },
    without: { n: wo.length, median_comments_per_play: cm(wo), median_multiple: round(median(wo.map((t) => t.performance.multiple)), 2) } };
})();

// ---------------------------------------------------------------- failure library
const underperf = usable.filter((t) => t.performance.multiple < THRESHOLDS.typical);
const severe = usable.filter((t) => t.performance.multiple < THRESHOLDS.severe);
const breakoutRows = usable.filter((t) => t.performance.multiple >= THRESHOLDS.breakout);
const failureDefs: { id: string; name: string; test: (t: any) => boolean; why: string; rule: string; better: string }[] = [
  { id: "F1", name: "Spec-line or project-name opening", test: (t) => t.weak_opening_flags.starts_with_project_or_spec,
    why: "Opens with facts the viewer has no reason to care about yet, so there is no curiosity or promise.",
    rule: "Never open on the project name, BHK or area spec. Open on a person, a number with a story, or a question.", better: "Replace '3 & 4 BHK from 1,850 sq ft' with a buyer-specific hook such as 'Working near Manyata and tired of a 90-minute drive?'" },
  { id: "F2", name: "Presenting / announcement opening", test: (t) => t.weak_opening_flags.presenting_style || t.hook.type === "announcement",
    why: "Announcement language signals an advert, which viewers swipe past.", rule: "Do not start with 'Presenting', 'Introducing' or 'New launch'.", better: "Lead with the reason the launch matters to one buyer type." },
  { id: "F3", name: "Plain listing description as the hook", test: (t) => t.hook.type === "plain_listing",
    why: "A description with no tension or number; the viewer learns what it is but not why to keep watching.", rule: "A listing fact is a supporting beat, not the hook.", better: "Turn the single most unusual fact into a question or a number with a consequence." },
  { id: "F4", name: "Phone number as the only CTA", test: (t) => t.weak_opening_flags.phone_only_cta,
    why: "Asks for a high-effort action with no engagement signal.", rule: "Pair any phone number with a comment-keyword or save CTA.", better: "Comment a keyword; the DM carries the number." },
  { id: "F5", name: "No visible CTA", test: (t) => t.weak_opening_flags.no_visible_cta,
    why: "Nothing invites the next step; may be fine for pure reach content, not for lead generation.", rule: "Add exactly one CTA to every lead-focused reel.", better: "One keyword CTA at the end." },
  { id: "F6", name: "Very short or empty caption", test: (t) => t.weak_opening_flags.caption_very_short,
    why: "No story, keyword or context in the caption.", rule: "Put the story and CTA keyword in the caption.", better: "Two or three lines with the project fact and one keyword." },
  { id: "F7", name: "Long runtime (90s or more) without a strong hook", test: (t) => t.weak_opening_flags.long_runtime && !["bold_money_number", "pattern_interrupt_question", "audience_callout"].includes(t.hook.type),
    why: "Long videos need a hook that earns attention across the length.", rule: "Keep under 60 seconds unless the hook is a number, interruption or call-out.", better: "Cut to the best 30 to 45 seconds." },
];
const failureLibrary = failureDefs.map((f) => {
  const inUnder = underperf.filter(f.test);
  const inAll = usable.filter(f.test);
  const inBreak = breakoutRows.filter(f.test);
  const prevUnder = underperf.length ? inUnder.length / underperf.length : 0;
  const prevAll = usable.length ? inAll.length / usable.length : 0;
  const pages = new Set(inUnder.map((t) => t.page)).size;
  const lift = prevAll > 0 ? prevUnder / prevAll : null;
  return {
    id: f.id, pattern: f.name, why_it_may_fail: f.why, evidence_type: "hypothesis checked against data",
    underperformers_with_pattern: inUnder.length, underperformers_total: underperf.length,
    prevalence_among_underperformers: round(prevUnder, 3), prevalence_among_all_reels: round(prevAll, 3),
    lift_vs_base_rate: round(lift, 2),
    median_multiple_when_present: round(median(inAll.map((t) => t.performance.multiple)), 2),
    breakouts_that_still_have_pattern: inBreak.length,
    verdict: lift === null ? "no occurrences" : lift >= 1.3 ? "more common among underperformers" : lift <= 0.77 ? "not associated with underperformance" : "no clear association",
    confidence: evidenceLevel(inUnder.length, pages) === "established" && lift !== null && Math.abs(lift - 1) > 0.3 ? "medium" : "low",
    supporting_examples: inUnder.sort((a, b) => a.performance.multiple - b.performance.multiple).slice(0, 4).map((t) => ({ reel_id: t.reel_id, url: t.url, page: t.page, multiple: t.performance.multiple, opening_line: t.hook.opening_line })),
    counterexamples: inBreak.sort((a, b) => b.performance.multiple - a.performance.multiple).slice(0, 3).map((t) => ({ reel_id: t.reel_id, url: t.url, page: t.page, multiple: t.performance.multiple, opening_line: t.hook.opening_line })),
    prevention_rule: f.rule, improved_alternative: f.better,
  };
}).sort((a, b) => (b.lift_vs_base_rate ?? 0) - (a.lift_vs_base_rate ?? 0));

// ---------------------------------------------------------------- winning patterns (hook x format, and single dims)
const hookByFormat = groupStats(usable, (t) => [`${t.hook.type} + ${t.format.type}`]).filter((g) => g.n >= 4);
const winningPatterns = {
  definition: "A pattern is 'established' with at least 8 reels from at least 3 pages, 'emerging' with at least 4 reels from 2 pages, otherwise a 'hypothesis'. Ranked by median multiple, not by best single result.",
  overall_median_multiple: overallMedian,
  note: "Median multiple across all reels is about 1 by construction. Anything meaningfully above 1 with a decent sample is worth testing; none of this proves cause.",
  by_hook: hookStats, by_format: formatStats, by_hook_and_format: hookByFormat.slice(0, 15), by_duration: durationStats, by_market: marketStats,
};

// ---------------------------------------------------------------- other output artifacts
const handleSet = new Set<string>([...byPage.keys(), ...Object.keys(NOTES)]);
const creatorUniverse = [...handleSet].sort().map((h) => {
  const b = baselines.get(h);
  const n = NOTES[h];
  return {
    handle: h, profile_url: `https://www.instagram.com/${h}/`,
    category: n?.kind ?? "unclassified", category_status: n ? "from project notes (not re-verified)" : "unclassified",
    market: BENGALURU_PAGES.has(h) ? "Bengaluru" : (n?.market ?? "unknown"), market_status: n ? "from project notes" : "unknown",
    followers: n?.followers ?? null, followers_status: n ? "from project notes dated 2026-10-21; collection timestamp not in dataset" : "not collected",
    reels_collected: b?.n_reels ?? 0, median_plays: b?.median_plays ?? null, median_likes: b?.median_likes ?? null, median_comments: b?.median_comments ?? null,
    posts_per_30_days: b?.posts_per_30_days ?? null, baseline_reliable: b?.reliable ?? false,
    in_benchmark_set: !!n, source: "input pages scraped for dataset CB3SNYD4LPQW3BiyO", last_successful_collection: b ? "2026-10-21" : null,
    status: b ? (b.reliable ? "covered" : "thin: fewer than 8 reels") : "not collected",
    inferred_content_formats: b ? [...new Set(teardowns.filter((t) => t.page === h).map((t) => t.format.type))].slice(0, 4) : [],
  };
});

const transcribed = reels.filter((r) => r.transcript).length;
const pagesCovered = [...baselines.values()];
const reliablePages = pagesCovered.filter((b) => b.reliable);
const meta = {
  pipeline_version: PIPELINE_VERSION, built_at: NOW,
  sources: { reels_dataset: "CB3SNYD4LPQW3BiyO", transcripts_dataset: "4XrYkhay87CuwWHgw", collection_dates: "2026-10-21 (reels and transcripts); read again 2026-10-22" },
  counts: {
    raw_reel_rows: rawReels.length, duplicates_dropped: duplicatesDropped, reels_normalized: reels.length,
    pages_in_data: byPage.size, pages_with_reliable_baseline: reliablePages.length, pages_thin: byPage.size - reliablePages.length,
    reels_used_for_pattern_stats: usable.length, transcript_rows: rawTranscripts.length, reels_with_transcript: transcribed,
    llm_teardowns_applied: llmApplied, llm_coverage: round(llmApplied / reels.length, 3),
    transcript_coverage: round(transcribed / reels.length, 3), visual_analysis_coverage: 0,
    likes_hidden: reels.filter((r) => r.likes === null).length, comments_missing: reels.filter((r) => r.comments === null).length,
    collab_posts_attributed_to_source_page: reels.filter((r) => r.is_collab_post).length,
    bengaluru_reels: reels.filter((r) => BENGALURU_PAGES.has(r.source_page)).length,
    indian_pages_in_data: [...byPage.keys()].filter((p) => BENGALURU_PAGES.has(p) || ["rsquarereality", "make_my_investment", "mgdesyandevelopments"].includes(p)),
  },
  thresholds: THRESHOLDS, minimum_baseline_sample: MIN_BASELINE_SAMPLE,
  baseline_definition: "Median plays of all reels collected for a page in this dataset (about the latest 20 per page). Observation window per page is in account_performance_baselines.json.",
  limitations: [
    "Mostly US pages. Bengaluru is covered by 2 benchmark pages, so findings are not proven for Indian developers.",
    "One-day snapshot. No metric history yet; each re-run should add a snapshot.",
    "Rule-based classification of hooks, formats and CTAs from caption and transcript. No video, audio or on-screen text was analysed (visual coverage 0%).",
    llmApplied < reels.length ? `LLM teardowns cover ${llmApplied} of ${reels.length} reels; the rest use rule-based labels, which are coarser.` : "Hook, format and CTA labels come from an LLM reading caption and transcript, with rule-based flags kept alongside.",
    `Only ${transcribed} of ${reels.length} reels have a transcript, so hook type for the rest comes from the caption's first line.`,
    "Likes are hidden (-1) on many reels and treated as unavailable, never zero. Shares, saves and follower counts at collection time are not in the dataset.",
    "Follower counts, market and category labels come from project notes, not from the scrape.",
    "Possible paid boosts are invisible in the data. Breakout reels may be boosted.",
    "Associations only. Nothing here shows that a hook or format caused the views.",
  ],
};

// per-reel teardown learn/avoid/experiment text (short, templated from the evidence)
const hookNote: Record<string, string> = {
  bold_money_number: "A concrete money figure in the first line gives a reason to keep watching.",
  pattern_interrupt_question: "An unexpected question creates an immediate information gap.",
  audience_callout: "Names the viewer directly, filtering for the right buyer.",
  place_transformation: "A place the viewer knows changing creates curiosity and local belonging.",
  curiosity_superlative: "A superlative promises something unusual; works only if the payoff matches.",
  confession_insider: "Insider framing promises information the viewer is not supposed to hear.",
  list_promise: "A numbered list sets a clear end point.",
  relatable_humour: "Humour reaches a broad audience; check it attracts buyers and not only laughs.",
  plain_listing: "Describes the property without tension; the weakest hook family in this data when compared with the page's own reels.",
  announcement: "Reads as an advert.", rare_feature: "A rare feature gives a specific reason to watch.", question: "A generic question.", other: "No standard hook detected.", unknown: "No opening text available.",
};
for (const t of teardowns) {
  const m = t.performance.multiple;
  t.learn = m === null ? "Not enough data." : `${hookNote[t.hook.type] ?? ""} This reel sits at ${m}x its page's median (${t.performance.class}); treat as an association, not a cause.`;
  t.avoid_copying = t.performance.class === "breakout" && ["ryanserhant", "realtordotcom", "thebrokeagent"].includes(t.page)
    ? "Do not copy the celebrity, news or comedy angle; the reach came from a famous brand or a broad entertainment audience rather than property intent."
    : t.weak_opening_flags.starts_with_project_or_spec ? "Do not open on the project name or a spec line." : "Do not copy wording; copy the mechanism only.";
  t.suggested_experiment = t.hook.type === "plain_listing" || t.hook.type === "announcement"
    ? "Re-cut the same footage with a number-led or buyer-call-out hook and compare plays against this reel."
    : `Test the same ${t.hook.type.replace(/_/g, " ")} hook on a different buyer type or locality and compare to the page baseline.`;
}

// ---------------------------------------------------------------- playbook
const est = (arr: any[]) => arr.filter((x) => x.evidence_level === "established");
const topHooks = hookStats.filter((h) => h.n >= 4 && !["other", "unknown"].includes(h.name)).slice(0, 6);
const playbookPatterns = topHooks.map((h) => ({
  pattern: h.name, kind: "hook", evidence_level: h.evidence_level, observations: h.n, pages: h.pages,
  performance: { median_multiple: h.median_multiple, p25: h.p25_multiple, p75: h.p75_multiple, median_without_top_reel: h.median_multiple_without_top_reel, breakout_share: h.breakout_share, underperform_share: h.underperform_share },
  suggested_duration_s: h.median_duration_s, supporting_reels: h.top_examples, counterexamples: h.lowest_examples,
  hook_template: ({
    bold_money_number: "We bought [X acres] in [area] for ₹[X] Cr. Here's the math.",
    pattern_interrupt_question: "Why are 60 trucks outside our site at 5 a.m.?",
    audience_callout: "Working at [IT park] and tired of a 90-minute commute? Stop scrolling.",
    place_transformation: "This 3 km of [road] will look unrecognisable by 2028.",
    curiosity_superlative: "This is the only project in [area] with [feature].",
    rare_feature: "Something you almost never see in a Bengaluru apartment: [feature].",
    confession_insider: "Nobody tells you this about buying under-construction.",
    list_promise: "Three things to check before you pay a booking amount.",
    relatable_humour: "POV: your parents see the 3 BHK and ask about parking first.",
    construction_spectacle: "Tonight we pour [X] cubic metres of concrete. Here is why it cannot stop.",
    founder_insight: "I have built [N] projects in Bengaluru. The one thing I would check first is...",
    market_proof: "Here is the real number for [area] right now: [fact from a document].",
    buyer_misconception: "Most people think [common belief] about under-construction homes. Here is what the paperwork shows.",
    question_analogy: "Would you buy a phone from a spec sheet? Then why buy a home from one?",
    story_emotional: "This family waited [N] years for this key. Here is their story.",
  } as Record<string, string>)[h.name] ?? null,
  cta_options: ["comment keyword (default)", "save for later", "send this to someone who..."],
  when_not_to_use: "When the brochure has no verifiable fact to back the hook, or the sample for this hook is a single page.",
  confidence: h.evidence_level === "established" ? "medium" : "low",
}));

const playbook = {
  version: PIPELINE_VERSION, built_at: NOW, based_on: { reels_used: usable.length, pages: reliablePages.length },
  honesty: "Findings are associations from a one-day, mostly-US snapshot with caption/transcript-only analysis. 'Established' means repeated in this dataset, not proven for Bengaluru.",
  patterns: playbookPatterns,
  rules: [
    { id: "R1", rule: "Open on a hook type, never the project name, a spec line or 'Presenting'.", evidence: failureLibrary.filter((f) => ["F1", "F2", "F3"].includes(f.id)).map((f) => ({ failure_id: f.id, lift: f.lift_vs_base_rate, verdict: f.verdict })), type: "evidence-checked" },
    { id: "R2", rule: "Use one comment-keyword CTA per lead-focused reel.", evidence: [{ comments_per_play_with_keyword: commentKeywordLift.with_keyword_cta.median_comments_per_play, without: commentKeywordLift.without.median_comments_per_play }], type: "evidence-checked; comments are not qualified leads" },
    { id: "R3", rule: "Put the specific number or fact in the first line, then add a new fact every 3 to 5 seconds.", evidence: [], type: "carried from project playbook v1; transcripts too few to verify here" },
    { id: "R4", rule: "Prefer a person on camera over brand-only visuals.", evidence: [], type: "carried from project playbook v1; presenter presence not measurable without video" },
  ],
  segments: {
    note: "Analytical segments, not a requirement that every reel target all of them. Hook suggestions are creative hypotheses until tested on Indian audiences.",
    under_construction: "construction-spectacle and developer-math hooks (number first, then the build milestone).",
    apartments_and_villas: "rare-feature or audience call-out hooks; one unusual feature per reel.",
    new_launches: "audience call-out with a locality fact; avoid 'Presenting'.",
    construction_updates: "pattern-interrupt question about something visible on site.",
    locality_and_infrastructure: "place-and-transformation hook with a dated fact.",
    investment_education: "bold money number, then the arithmetic.",
    first_time_homebuyers: "audience call-out naming the commute or budget.",
    families_upgrading: "lifestyle story with one concrete room or school fact.",
    nris_and_investors: "rental yield or e-Khata explainer with a number.",
    luxury: "curiosity plus one rare feature; show restraint on specs.",
  },
  experiments_to_run: [
    "Same footage, two hooks: spec line vs number-led. Compare plays against the page median.",
    "Comment-keyword CTA vs phone number CTA on matched reels; compare comments per play and DMs received.",
    "Indian developer math reel (land cost to price per sq ft) since no Bengaluru page in the data uses it.",
  ],
};

// ---------------------------------------------------------------- opportunities
const hookSaturation = hookStats.map((h) => ({ hook: h.name, reels: h.n, share_of_dataset: round(h.n / usable.length, 3) }));
const bengaluruReels = teardowns.filter((t) => BENGALURU_PAGES.has(t.page));
const bengaluruHooks = groupStats(bengaluruReels.filter((t) => t.performance.multiple !== null), (t) => [t.hook.type]);
const opportunities = {
  established: "None claimed beyond the hook, format and CTA statistics in winning_patterns.json.",
  emerging: [
    `Bengaluru pages (${bengaluruReels.length} reels) lean on: ${bengaluruHooks.slice(0, 3).map((h) => `${h.name} (${h.n})`).join(", ") || "n/a"}.`,
  ],
  creative_hypotheses: [
    { idea: "Developer math in rupees", why: "Strong abroad; no Bengaluru benchmark page uses it in this data.", audience: "investors and first-time buyers", hook: "We bought this land for ₹X Cr. Here's what each square foot costs us.", cta: "comment MATH", test: "3 reels, compare to page median" },
    { idea: "Construction spectacle with a record number", why: "Highest multiples in the dataset come from site content.", audience: "under-construction buyers", hook: "Why are 60 trucks outside our site at 5 a.m.?", cta: "comment SITE", test: "one slab-casting night" },
    { idea: "Founder answers one buyer objection on site", why: "People beat logos in the data.", audience: "families", hook: "Nobody tells you this about buying under-construction.", cta: "save for later", test: "five objections, five reels" },
  ],
  hook_mix_in_dataset: hookSaturation,
  note: "Saturation figures show what the dataset contains, not what the whole market does.",
};

// ---------------------------------------------------------------- write
writeJsonl("instagram_reels_normalized.jsonl", reels);
writeJson("account_performance_baselines.json", [...baselines.values()].sort((a, b) => (b.median_plays ?? 0) - (a.median_plays ?? 0)));
writeJson("creator_universe.json", creatorUniverse);
writeJsonl("reel_teardowns.jsonl", teardowns);
writeJson("winning_patterns.json", winningPatterns);
writeJson("failure_library.json", failureLibrary);
writeJson("hook_taxonomy.json", hookStats.map((h) => ({ ...h, definition: hookNote[h.name] ?? "" })));
writeJson("format_taxonomy.json", formatStats);
writeJson("cta_intelligence.json", { by_cta_type: ctaStats, comment_keyword_comparison: commentKeywordLift,
  limitations: ["High comment counts are not qualified leads.", "Likes hidden on many reels; comments per play is the only engagement ratio with decent coverage.", "Shares and saves not available."] });
writeJson("social_playbook.json", playbook);
writeJson("opportunities.json", opportunities);
writeJson("research_metadata.json", meta);

// human-readable playbook
const md: string[] = [];
md.push(`# RealBrain Social Playbook (${PIPELINE_VERSION})`, "", `Built ${NOW}. Based on ${usable.length} reels from ${reliablePages.length} pages with a reliable baseline.`, "", `> ${playbook.honesty}`, "");
md.push("## Patterns (ranked by median multiple of the page's own median plays)", "");
for (const p of playbookPatterns) {
  md.push(`### ${p.pattern} (${p.evidence_level}, n=${p.observations}, ${p.pages} pages)`,
    `- Median multiple ${p.performance.median_multiple}x (middle half ${p.performance.p25}x to ${p.performance.p75}x; without the top reel ${p.performance.median_without_top_reel}x). Breakout share ${p.performance.breakout_share}, underperform share ${p.performance.underperform_share}.`,
    p.hook_template ? `- Template: "${p.hook_template}"` : "",
    `- Examples: ${p.supporting_reels.map((e: any) => `${e.page} ${e.multiple}x ${e.url}`).join("; ")}`,
    `- Lowest in group: ${p.counterexamples.map((e: any) => `${e.page} ${e.multiple}x ${e.url}`).join("; ")}`,
    `- When not to use: ${p.when_not_to_use}`, "");
}
md.push("## Failure patterns checked against the data", "");
for (const f of failureLibrary) md.push(`- **${f.pattern}**: ${f.verdict} (lift ${f.lift_vs_base_rate}, ${f.underperformers_with_pattern}/${f.underperformers_total} underperformers; ${f.breakouts_that_still_have_pattern} breakouts still have it). Rule: ${f.prevention_rule}`);
md.push("", "## Rules", "", ...playbook.rules.map((r) => `- ${r.id}: ${r.rule} (${r.type})`));
md.push("", "## Experiments to run", "", ...playbook.experiments_to_run.map((e) => `- ${e}`));
md.push("", "## Limitations", "", ...meta.limitations.map((l) => `- ${l}`), "");
writeFileSync(join(OUT, "social_playbook.md"), md.filter((x) => x !== undefined).join("\n"));

// ---------------------------------------------------------------- validation report
const checks: { name: string; ok: boolean; detail: string }[] = [];
const chk = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });
chk("No duplicate reels after normalization", new Set(reels.map((r) => r.short_code)).size === reels.length, `${reels.length} unique of ${rawReels.length} raw (${duplicatesDropped} dropped)`);
chk("Hidden likes stay null, not zero", reels.every((r) => r.likes === null || r.likes >= 0) && reels.filter((r) => r.likes === null).length === rawReels.filter((r) => r.likesCount === -1 || r.likesCount == null).length, `${meta.counts.likes_hidden} reels with likes unavailable`);
chk("Every reel has a collection source and timestamp field", reels.every((r) => r.provenance.dataset_id && r.collected_from), "provenance recorded per reel");
chk("Every baseline states window and sample size", [...baselines.values()].every((b) => b.n_with_plays > 0 && b.observation_window.from), `${baselines.size} pages`);
chk("Multiples recompute from plays / page median", teardowns.every((t) => t.performance.multiple === null || Math.abs(t.performance.multiple - round(t.performance.plays / t.performance.baseline_median_plays, 2)!) < 0.011), "spot check on all reels");
chk("Every teardown links to a reel URL", teardowns.every((t) => t.url.startsWith("https://www.instagram.com/reel/")), "traceable");
chk("Visual analysis is not claimed", teardowns.every((t) => t.coverage.visual_analysis === false), "coverage 0%, stated on every record");
chk("Playbook patterns cite example reels", playbookPatterns.every((p) => p.supporting_reels.length > 0), `${playbookPatterns.length} patterns`);
chk("Underperformers analysed as well as winners", underperf.length > 0 && breakoutRows.length > 0, `${underperf.length} underperformers (${severe.length} severe), ${breakoutRows.length} breakouts`);
chk("LLM teardown coverage", llmApplied === reels.length, `${llmApplied}/${reels.length}`);
chk("Transcript coverage", transcribed / reels.length > 0.5, `${transcribed}/${reels.length} (${round(100 * transcribed / reels.length, 1)}%)`);
chk("Bengaluru sample large enough for conclusions", meta.counts.bengaluru_reels >= 100, `${meta.counts.bengaluru_reels} reels from 2 pages`);
chk("Video / visual analysis available", false, "no video was accessed; hook delivery and editing pace are not assessed");
const vr = ["# Social Brain validation report", "", `Built ${NOW} (${PIPELINE_VERSION})`, "", "| Check | Result | Detail |", "|---|---|---|", ...checks.map((c) => `| ${c.name} | ${c.ok ? "PASS" : "FAIL / GAP"} | ${c.detail} |`), "",
  "## Needs human review", "- Spot-check 20 teardown labels (hook, format, CTA) against the actual reels; the labels come from text only.",
  "- Confirm follower counts and categories in creator_universe.json; they come from project notes, not the scrape.",
  "- Treat every pattern as an association from a mostly-US, one-day snapshot.", ""];
writeFileSync(join(OUT, "validation_report.md"), vr.join(String.fromCharCode(10)));
console.log(checks.map((c) => (c.ok ? "PASS " : "GAP  ") + c.name + " - " + c.detail).join(String.fromCharCode(10)));
console.log(JSON.stringify({ ...meta.counts, overall_median_multiple: overallMedian }, null, 2));
