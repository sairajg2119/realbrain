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

### Stage 2: Real estate knowledge and compliance: **partial**
- Done (2026-10-22): `realestate-brain/` with a source register (12 sources), 25 rules (17 verified from primary sources, 8 secondary), 15 claim classes with a scanner, misleading-script examples, RERA verification and advertisement checklists, an escalation process, glossary and knowledge base, 17 tests. Exported to `brain/rules.json` and `brain/compliance_claims.json`.
- Primary sources read: RERA Act text, Karnataka Rules FAQ, K-RERA advertisement circular of 14 Nov 2019, K-RERA advertisement-violation list.
- Not done: Karnataka Rules full text (Kannada copy unreadable), newer K-RERA circulars, khata/e-khata/GBA, land conversion and planning approvals, stamp duty, CPA and CCPA official text, ASCI, the AI-label duty of advertisers, 5 verified localities (`brain/localities.json` still empty and unverified).
- Not wired: `scanText()` is not yet called by the app. The app enforces only its existing code checks. The new rule that the RERA number must be on screen is not yet in the script spec.

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
3. Wire the compliance layer into the script engine: on-screen RERA number in the script spec, `scanText()` in `/api/analyze` and the approval screen, escalation message.
4. Finish Stage 2 gaps (localities, khata and approvals, newer circulars) with a human check of each rule.
5. Spot-check teardown labels; add Indian pages to the Social Brain.
