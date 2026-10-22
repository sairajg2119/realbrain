# Data dictionary

Last updated 2026-10-22. "null" means unavailable, never zero. Counts are from the build of 2026-10-22.

## Zone 1: raw (not in git; verify with `npm run brain:verify`)
| File | Rows | Source | Notes |
|---|---|---|---|
| `social-brain/raw/instagram_reels_raw.jsonl` | 487 | Apify dataset `CB3SNYD4LPQW3BiyO`, selected fields only | Fields: id, shortCode, type, productType, url, caption, hashtags, commentsCount, likesCount (-1 = hidden), videoPlayCount, timestamp, ownerUsername, ownerFullName, videoDuration, isPinned, paidPartnership, locationName, musicInfo.*, inputUrl. Signed media URLs were not saved. Collected 2026-10-21. |
| `social-brain/raw/instagram_transcripts_raw.jsonl` | 52 (41 transcribed) | Apify dataset `4XrYkhay87CuwWHgw` | status, transcript, hook3s, language, durationSeconds, plays, likes, comments |
| `social-brain/cache/llm_teardowns.jsonl` | 486 | Gemini `teardown-v1` | one record per reel_id; one reel failed labelling |
| `social-brain/MANIFEST.json` | in git | `brain:backup` | sha256, rows, bytes per file |

## Zone 2: derived research (`social-brain/brain/`, rebuilt by `npm run brain:build`)
| File | Key | Contents |
|---|---|---|
| `instagram_reels_normalized.jsonl` (not in git) | `short_code` | one clean record per reel: ids, `source_page` (from the scraped page, not the owner), `is_collab_post`, `plays`, `likes`, `comments` (null if hidden), `shares`/`saves` (always null), `duration_s`, caption, hashtags, transcript, `opening_line` + `opening_source`, `provenance.fields_missing` |
| `account_performance_baselines.json` | `page` | `median_plays`, p25, p75, medians of likes and comments, `n_with_plays`, `observation_window`, `posts_per_30_days`, `reliable` (needs 8+ reels), `consistency` |
| `reel_teardowns.jsonl` | `short_code` | `performance` (multiple, class, percentile_within_page, likes/comments per play, plays_per_follower), `hook` (type, opening_line, source), `format`, `cta` (types, keyword), `weak_opening_flags`, `coverage` (transcript, visual false), `analysis_method`, `confidence`, `causal_status`, learn/avoid/experiment, plus LLM `audience`, `strengths`, `weaknesses`, `likely_drivers` |
| `winning_patterns.json` | | stats by hook, format, hook+format, duration, market; each with n, pages, median multiple, median without top reel, breakout and underperform share, evidence level, example and lowest reels |
| `failure_library.json` | `id` F1 to F7 | pattern, prevalence, lift vs base rate, counterexamples, verdict, prevention rule |
| `hook_taxonomy.json`, `format_taxonomy.json`, `cta_intelligence.json` | | per-category statistics and limitations |
| `creator_universe.json` | `handle` | 25 benchmark pages with status flags. Followers, market and category come from project notes and are labelled so |
| `social_playbook.json`, `social_playbook.md` | | patterns, rules, segments, experiments, each with evidence level |
| `opportunities.json` | | established, emerging and hypothesis findings; hook mix |
| `research_metadata.json` | | counts, sources, thresholds, limitations |
| `validation_report.md` | | pass and gap checks from the last build |

**Definitions.** `multiple` = reel plays / median plays of that page's collected reels (about the latest 20). Classes: breakout 2x or more, strong 1.25x to 2x, typical 0.75x to 1.25x, underperforming below 0.75x, severe below 0.5x. Evidence levels: established (8+ reels, 3+ pages), emerging (4+ reels, 2+ pages), hypothesis (otherwise). `plays_per_follower` is descriptive, not unique reach.

## Zone 3: app-facing (`brain/`, deployed)
| File | Schema |
|---|---|
| `teardowns.json` | `{ scraped_at, _meta{source, selection, limits, built_at, reels_in_file}, reels[] }`. Reel: `id` (shortCode), `url`, `page`, `plays`, `page_median`, `multiple_vs_median`, `duration_s`, `format`, `hook_type`, `hook`, `hook_source`, `cta`, `why_it_worked` ("Plausible, not proven..."), `baseline_n`, `market`, `analysis_basis`. 32 reels, winners at 2x or more. Matches `Teardown` in `lib/types.ts`. |
| `playbook.md` | Markdown fed to the model: formats, hook templates, a "What the data says" section, CTAs, the 10 script rules, style |
| `rules.json` | `{ version, last_checked, stale_after_days, rules[] }`. Rule: id, rule, applies_to, enforcement (hard or warning), check, source_name, source_url, effective_date, last_checked, status. **Unverified draft**, `last_checked` deliberately old |
| `localities.json` | `{ localities[] }`: name, aliases, facts[{text, source_url}], `verified`. All five are unverified and empty |

## Backups
Original app files before the Social Brain export: `social-brain/backup/playbook.md`, `teardowns.json`. Off-repo copy of Zone 1: `../realbrain-backups/<date>/`.
