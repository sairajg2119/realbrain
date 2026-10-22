# Roadmap

Last updated 2026-10-22. Status words: **done**, **partial**, **not started**. A step is "done" only if it ran and was checked.

## Hackathon deadlines (ForgeX, Mesa School)
| When | Deliverable | Status |
|---|---|---|
| Thu 22 Oct 12:30 PM | GitHub + prototype + proof of progress | Repo and proof folder exist; latest commit local only until pushed |
| Thu 22 Oct 7:30 PM | Live Vercel link | Live at realbrain-five.vercel.app; new brain files deploy only after a push |
| Fri 23 Oct 12:30 to 1:00 PM | Loom, pitch deck, LinkedIn post | Not started |
| Fri 23 Oct 2 PM | 1:1 pitch (7 + 7 min) | Not started |

## Stages
### Stage 1: Social media intelligence: **partial**
- Done: 487 reels from 25 pages normalized, per-page baselines, LLM teardowns (486 of 487, text only), winning patterns, failure library, hook/format/CTA breakdowns, playbook, validation report, 15 tests, export to `brain/`.
- Not done: video or visual analysis (0%), Bengaluru depth (40 reels, 2 pages), transcripts (41 of 487), metric history snapshots, new pages beyond the original 25, human spot-check of labels, import of the original playbook v1 and teardown sheets from Google Drive.

### Stage 2: Real estate knowledge and compliance: **not started** (drafts only)
- `brain/rules.json` and `brain/localities.json` are unverified drafts. Needed: sourced, dated Karnataka RERA and advertising rules; 5 verified localities (Jakkur, Jayanagar, Whitefield, Sarjapur Road, Hebbal); documentation basics (A-khata, e-khata, OC, CC).
- Plan: follow the same pattern as Stage 1: `realestate-brain/` research store with raw sources, structured derived files, an export script into `brain/`.

### Stage 3: Additional layers: **not started**
Buyer-type models, factual validation extensions, video script constraints, news and market context.

### Stage 4: Complete application: **partial** (MVP)
- Done: brochure upload, fact extraction, 3 checked scripts, evidence line, 4-screen UI, health check, sample project.
- Not done: avatar video (`lib/video.ts` returns an honest preview state), persistence of user data (projects, approved scripts, video jobs), accounts.

### Stage 5: Testing and deployment: **partial**
- Done: unit tests, live deploy of the MVP, proof-of-progress folder.
- Not done: full upload test after the brain change (Gemini was overloaded; see PROJECT_KNOWLEDGE), load and failure testing.

## Next steps, in order
1. Push, redeploy, run one full brochure upload on the live link.
2. Avatar video with fallback (`lib/video.ts`), then the demo-day assets.
3. Stage 2 knowledge base, starting with verifying `rules.json` against sources.
4. Spot-check teardown labels; add Indian pages to the Social Brain.
