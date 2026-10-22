import test from "node:test";
import assert from "node:assert/strict";
import {
  median, quantile, classify, relativeMultiple, percentileWithin, cleanCount, perPlay,
  handleFromUrl, dedupeBy, evidenceLevel, postsPer30Days,
} from "../lib/metrics.ts";
import { classifyHook, classifyCtas, classifyFormat, openingLine, weakOpeningFlags } from "../lib/classify.ts";

test("median handles odd, even, empty and non-finite input", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), null);
  assert.equal(median([1, NaN, 3]), 2);
});

test("quantile interpolates", () => {
  assert.equal(quantile([0, 10], 0.5), 5);
  assert.equal(quantile([], 0.5), null);
});

test("relative multiple divides by account median and refuses a zero baseline", () => {
  assert.equal(relativeMultiple(200, 100), 2);
  assert.equal(relativeMultiple(200, 0), null);
  assert.equal(relativeMultiple(null, 100), null);
});

test("classification thresholds match the spec", () => {
  assert.equal(classify(2), "breakout");
  assert.equal(classify(1.99), "strong");
  assert.equal(classify(1.25), "strong");
  assert.equal(classify(1.0), "typical");
  assert.equal(classify(0.75), "typical");
  assert.equal(classify(0.74), "underperforming");
  assert.equal(classify(0.5), "underperforming");
  assert.equal(classify(0.49), "severe");
  assert.equal(classify(null), null);
});

test("percentile is relative to the page's other reels", () => {
  assert.equal(percentileWithin(30, [10, 20, 30]), 1);
  assert.equal(percentileWithin(10, [10, 20, 30]), 0);
  assert.equal(percentileWithin(5, [5]), null);
});

test("hidden likes (-1) are unavailable, never zero", () => {
  assert.equal(cleanCount(-1), null);
  assert.equal(cleanCount(undefined), null);
  assert.equal(cleanCount(0), 0);
  assert.equal(perPlay(null, 100), null);
  assert.equal(perPlay(5, 0), null);
  assert.equal(perPlay(5, 100), 0.05);
});

test("handle is read from the source URL", () => {
  assert.equal(handleFromUrl("https://www.instagram.com/Luxury_Listings/"), "luxury_listings");
  assert.equal(handleFromUrl(null), null);
});

test("dedupe keeps the first record and counts drops", () => {
  const r = dedupeBy([{ k: "a", v: 1 }, { k: "a", v: 2 }, { k: "b", v: 3 }], (x) => x.k);
  assert.equal(r.kept.length, 2);
  assert.equal(r.dropped, 1);
  assert.equal(r.kept[0].v, 1);
});

test("evidence levels", () => {
  assert.equal(evidenceLevel(8, 3), "established");
  assert.equal(evidenceLevel(40, 1), "hypothesis"); // one page is never more than a hypothesis
  assert.equal(evidenceLevel(4, 2), "emerging");
  assert.equal(evidenceLevel(3, 3), "hypothesis");
});

test("posting frequency needs two dates", () => {
  assert.equal(postsPer30Days(["2026-01-01T00:00:00Z"]), null);
  const f = postsPer30Days(["2026-01-01T00:00:00Z", "2026-01-31T00:00:00Z", "2026-01-16T00:00:00Z"]);
  assert.equal(Math.round(f!), 2);
});

test("hook classification", () => {
  assert.equal(classifyHook("Last year, I bought a site on the water for $30 million."), "bold_money_number");
  assert.equal(classifyHook("First time homebuyer in Milwaukee? Stop scrolling"), "audience_callout");
  assert.equal(classifyHook("Gil, what the hell is going on here right now?"), "pattern_interrupt_question");
  assert.equal(classifyHook("This stretch of Miami River is in the middle of a massive transformation."), "place_transformation");
  assert.equal(classifyHook(null), "unknown");
});

test("CTA classification finds keyword CTAs and ignores 'comment below'", () => {
  const a = classifyCtas("Comment STONEMANOR and I'll send the details", null);
  assert.equal(a.types[0], "comment_keyword");
  assert.equal(a.keyword, "STONEMANOR");
  assert.ok(!classifyCtas("Let me know, comment below", null).types.includes("comment_keyword"));
  assert.deepEqual(classifyCtas("Beautiful home", null).types, ["none_visible"]);
});

test("format classification", () => {
  assert.equal(classifyFormat("Behind these double doors, full walkthrough", null), "walkthrough_or_tour");
  assert.equal(classifyFormat("Office prank 😂", null), "humour_or_skit");
});

test("opening line prefers transcript and records its source", () => {
  assert.deepEqual(openingLine("Hello there. Second sentence.", "Caption line"), { text: "Hello there.", source: "transcript" });
  assert.deepEqual(openingLine(null, "Caption line\nmore"), { text: "Caption line", source: "caption" });
  assert.deepEqual(openingLine(null, null), { text: null, source: null });
});

test("weak opening flags", () => {
  const f = weakOpeningFlags("3 & 4 BHK starting 2,000 sq ft", ["phone_number"], "Call +91 98450 12345", 20);
  assert.equal(f.spec_line, true);
  assert.equal(f.phone_only_cta, true);
  assert.equal(f.caption_very_short, true);
});
