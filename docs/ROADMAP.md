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
- Wired (2026-10-22): `/api/analyze` builds an on-screen RERA plan from the verified facts (number, K-RERA website, AI label; top right, whole video), runs `scanScript()` on every script, treats blocked claims as hard failures (one rewrite attempt), and returns a `compliance` report. The script card and approval screen show on-screen text, 'confirm before you post' items and advisor questions; approval needs a tick when there are items. The preview overlays the on-screen RERA text.
- Not verified live: the full PDF upload path through the new route (Gemini overload during the last attempts). Script writing plus scan was run against the live model and the screens were checked in the browser using the sample project. The on-screen text is shown in the preview only; the real video render does not burn it in yet (video is not built).

### Stage 3: Additional layers: **partial**
- Done (2026-10-22): property intelligence brief (`lib/brief.ts`, `components/BriefPanel.tsx`). After the brochure is read and before scripts are written, the app drafts a brief (overview, ranked selling points, content angles with hook, format, CTA and reel evidence, limitations and missing information, buyer personas, verification steps, compliance flags). Every item carries its basis (brochure claim, verified, inference, unverified). The model may only cite numbered brochure facts; the code removes anything it cannot back and flags numbers not in the facts. Angles with blocked wording or unsupported numbers are not passed to the script writer. If the brief fails or takes over 40 s, scripts are written without it and a note says so.
- Not done: location research. No external research is run at request time. The brief says which locality facts are needed and shows only facts from `brain/localities.json` (verified) or marked unverified. All five demo localities are still empty, so every brief says location research is needed. No comparison with other projects (no reliable comparison data exists). No live K-RERA lookup: the RERA number is always a human check. No time-sensitive or festival angles (nothing verifies them yet). Briefs are not stored per project: the app has no user-data store (Stage 4), so a brief lives in the browser for that session.
- Not started: buyer-type models, news and market context.

### Stage 4: Complete application: **partial** (MVP)
- Done: brochure upload, fact extraction, 3 checked scripts, evidence line, 4-screen UI, health check, sample project.
- Done (2026-10-22): new visual identity and landing page (see DECISIONS D21): ember accent, grotesque type, full-bleed hero, stats strip, split panels, light evidence band, sample script, floating call to action. Workspace screens restyled through the shared tokens only.
- Done (2026-10-22): full scripts. Each script is a list of timed beats (Hook, Build or Proof beats, CTA), each with what is said, what is shown and any text on screen, with a total length of 28 to 60 seconds (aim 30 to 45, 80 to 110 spoken words). Seconds are worked out by code from the words at 2.5 words a second. RealBrain chooses who each script suits best (families, first-time buyers, investors, NRI buyers, everyone) with a reason, and the audience picker defaults to 'Best fit', so only the brochure is needed. The property analysis sits collapsed behind the scripts. Too-short scripts (under 28 s) and too-long ones (over 60 s) fail and are rewritten once.
- Done (2026-10-22): any size of text-based PDF. A PDF over 4 MB (or over 20 MB even with Blob) is read in the visitor's browser with pdf.js and only its text is sent to `/api/analyze`, so no upload, no Blob store and no 4.5 MB request limit is involved. Smaller PDFs still go to the server whole so the model also sees the drawings. Tested in the browser with the real 26 MB Nambiar brochure: 13 pages read on the device, three full scripts in 34 to 42 s. A banner tells the person the file was read from text only.
- Not done: scanned PDFs that are too big to upload (no text layer, so the text path refuses with a clear message; they would need OCR). pdf.js is loaded from cdnjs at runtime, so the text path needs internet access to that CDN. Not yet tested on the live Vercel site (the change is not pushed). Floor-plan drawings and photos are not read on the text path.
- Not done: avatar video (`lib/video.ts` returns an honest preview state), persistence of user data (projects, approved scripts, video jobs), accounts.

### Stage 5: Testing and deployment: **partial**
- Done: unit tests, live deploy of the MVP, proof-of-progress folder.
- Not done: full upload test after the brain change (Gemini was overloaded; see PROJECT_KNOWLEDGE), load and failure testing.

## Next steps, in order
1. Push, redeploy, run one full brochure upload on the live link with the brief step. (Before the brief, a live upload returned all three scripts in 259 s, dominated by Gemini 503 waits; `askJson` now switches model after two quick retries.)
1b. Research the 5 demo localities with named sources and store them as unverified facts in `brain/localities.json`; a human marks a locality verified.
2. Avatar video with fallback (`lib/video.ts`), then the demo-day assets.
3. Burn the on-screen RERA text and AI label into the rendered video (with the avatar step). Store escalation records when a data store exists.
4. Finish Stage 2 gaps (localities, khata and approvals, newer circulars) with a human check of each rule.
5. Spot-check teardown labels; add Indian pages to the Social Brain.
