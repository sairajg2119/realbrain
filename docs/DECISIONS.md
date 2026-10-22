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
**Chose:** leave localities `verified: false`; do not present unverified law as verified. **Why:** project notes said rules were checked on 21 Oct, but the repo copy was a draft with no source URLs. **Update (D10):** the rules have now been sourced; localities remain unverified.

## D8: Project docs are tracked, planning docs stay private (2026-10-22)
**Chose:** `.gitignore` uses `docs/*` with explicit un-ignores for the six project documents; `build-brief.md`, `mvp-scope.*` and UI mocks remain private. **Why:** the repo is the source of truth for the product, but the brief and scope contain private planning.

## D9: `CLAUDE.md` lives in `realbrain/` (2026-10-22)
**Chose:** a project-level `CLAUDE.md` that imports `AGENTS.md` (managed by `next dev`). The parent folder's `CLAUDE.md` belongs to a different project (Brewmark) and does not apply here.

## D10: Compliance layer: hand-curated, level-separated, human-gated (2026-10-22)
**Chose:** `realestate-brain/` as a hand-curated store (not scraped), with every rule tagged by level (legal requirement, regulator direction, internal best practice, needs legal review) and status (verified_primary, secondary_reported, unverified), every source in a register, and an escalation process. Tests enforce that unverified rules cannot be called legal requirements and that every rule cites a real source. **Why:** legal text must not be invented or blended with opinion; the brochure alone is not proof. **Cost:** slow to extend; only a human may change a status. **Revisit:** when a lawyer reviews it, record that in the register.

## D11: The RERA number goes on screen, not only in the caption (2026-10-22)
**Chose:** treat K-RERA's 2019 circular as applying to reels as the safe reading, while recording that it is an interpretation. **Why:** the circular covers "any other visual medium" and electronic media and asks for the number top right at half the project-name size. The existing script rule 8 (number in the caption) is necessary under s11(2) but may not be enough. **Implemented 2026-10-22:** `onScreenPlan()` in `lib/compliance.ts` builds the on-screen lines from the verified number; the preview shows them. The real render must burn them in (not built).

## D12: Replaced the draft QR-placement rule (2026-10-22)
**Chose:** `KRERA-QR-PLACEMENT` is now an info note: no Karnataka QR-code requirement was found; QR rules are from Maharashtra and Kerala. **Why:** the draft implied a Karnataka QR rule that the primary source does not contain.

## D13: Only blocked claims stop a script; everything else is shown and acknowledged (2026-10-22)
**Chose:** claims with action `block` (guaranteed returns, pre-launch selling, invented people) become hard failures and get one rewrite; `flag` and `needs_evidence` items appear as 'confirm before you post' and advisor questions, and approval needs a tick. Only blocks and flags can raise a legal question; plain price or amenity mentions do not. **Why:** the scan is pattern matching, so it must not pretend to be a legal ruling or cry wolf on every price. **Cost:** most real scripts carry at least one confirm item (an amenity needs the sanctioned plan), so the tick is common. **Revisit:** when a lawyer reviews the claim classes, or if the tick becomes a habit users click through.

## D14: Property brief before scripts, with citations the code checks (2026-10-22)
**Chose:** an AI call drafts the brief from numbered brochure facts; `lib/brief.ts` keeps only items that cite real fact ids, moves the rest to 'limitations' as removed claims, flags numbers not in the facts, scans wording with the claim scanner, and hands only clean angles to the script writer. Every item shows its basis. **Why:** the brief must not become a second place where facts get invented. **Costs:** one more AI call (about 16 s on `gemini-3.1-flash-lite`); the 40 s timeout means scripts can still be written without it. **Not done, on purpose:** no live web research at request time, no K-RERA lookup, no competitor comparison, no festival or news angles, because none could be verified in the app and the rule is never to present unverified material as fact. Location facts need a human-verified `localities.json` entry; unresearched localities show a research-needed note.

## D15: Briefs are not stored yet (2026-10-22)
**Chose:** return the brief to the browser and keep it for the session. **Why:** the app has no store for user data (D1 revisits at Stage 4), Vercel's filesystem is read-only, and committing a user's project to git is wrong. The brief schema is stable so a store can persist it later, keyed by RERA number. **Cost:** research is repeated per upload, and a refresh loses it.

## D16: Switch Gemini model after two quick 503 retries (2026-10-22)
**Chose:** on 503, retry the same model twice (2 s, 4 s), then move to the next model, and only after the last model fall back to longer waits. **Why:** a live upload took 259 s because each call could wait 4+8+12+16 s on a busy model. **Cost:** a later model may be lower quality. **Not fixed here:** if the first model's quota is exhausted, setting `GEMINI_MODEL` in Vercel to a model with quota left skips the fallback chain entirely.
