# Decisions

Format: what we chose, why, what would change it. Newest last.

## D1: Files in git, no database (2026-10-22)
**Chose:** JSON and JSONL files in three zones (raw, derived, app-facing). **Why:** the brain is about 3 MB, read-only at runtime, edited by one person, and every change should be reviewable and versioned. A database adds cost and a deploy dependency with no benefit. **Revisit when:** user data appears (projects, approved scripts, video jobs) or the retrieval set is too large to ship with the function.

## D2: The app reads only `brain/` (2026-10-22)
**Chose:** one narrow, documented interface (`lib/brain.ts`, `brain/`), fed by export scripts. **Why:** research can change shape freely without breaking the app, and Vercel ships only what the route needs. **Cost:** an export step to keep in sync.

## D3: Raw data is append-only and not in git, protected by a manifest (2026-10-22)
**Chose:** `social-brain/raw/` and `cache/` are gitignored; `MANIFEST.json` (checksums, row counts) is committed; `brain:backup` copies the data to `../realbrain-backups/<date>/`. **Why:** raw captions and transcripts are other people's words (ground rule: permission before sharing), but the data must not be lost. **Known risk:** the Apify datasets are unnamed and expire after the retention period, and the OneDrive folder is the only other copy. Mitigation: run `brain:backup` after data changes and keep the backup folder synced elsewhere. **Revisit:** private object storage if the data grows.

## D4: Performance is relative to the page's own median (2026-10-22)
**Chose:** multiple = plays / the page's median plays, with fixed thresholds and per-page reliability (8+ reels). **Why:** a 50k reel on a small page matters more than 100k on a big one. **Limit:** the window is the latest ~20 reels per page, one day, mostly US.

## D5: Rule-based plus LLM labelling, text only (2026-10-22)
**Chose:** regex flags and a cached Gemini pass (`gemini-3.1-flash-lite`, `teardown-v1`) over caption and transcript. **Why:** no video was available, and the cache avoids paying twice. **Limit:** labels are imperfect (a few are visibly off). Human spot-check pending. No causal claims are made.

## D6: Script exemplars are curated, not everything (2026-10-22)
**Chose:** 32 reels at 2x or more, at most 4 per hook type, openings of 20+ characters, excluding entertainment and famous-brand pages and humour or emotional-story hooks. **Why:** the model copies what it sees; fame-driven reach teaches the wrong lesson for developers. **Cost:** only 1 Bengaluru reel is in the set.

## D7: Compliance rules and localities stay "unverified" until sourced (2026-10-22)
**Chose:** leave `rules.json` `last_checked` old so the app shows its re-check banner; leave localities `verified: false`. **Why:** project notes say rules were checked on 21 Oct, but the repo copy is a draft with no source URLs. Do not present unverified law as verified.

## D8: Project docs are tracked, planning docs stay private (2026-10-22)
**Chose:** `.gitignore` uses `docs/*` with explicit un-ignores for the six project documents; `build-brief.md`, `mvp-scope.*` and UI mocks remain private. **Why:** the repo is the source of truth for the product, but the brief and scope contain private planning.

## D9: `CLAUDE.md` lives in `realbrain/` (2026-10-22)
**Chose:** a project-level `CLAUDE.md` that imports `AGENTS.md` (managed by `next dev`). The parent folder's `CLAUDE.md` belongs to a different project (Brewmark) and does not apply here.
