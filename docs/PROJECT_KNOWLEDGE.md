# Project knowledge

Last updated 2026-10-22. Every item is tagged: **[verified]** checked in this repo or data, **[notes]** from the founder's project notes of 22 Oct (not re-verified), **[hypothesis]**, **[plan]**.

## Hackathon
- ForgeX AI Hackathon by Mesa School, 21 to 23 Oct 2026, individual. Judged on: AI does a real job; easy for a new person; works end to end on the live link; works with the evaluator's new brochure. 10 points each. [notes]
- Ground rules: honesty about what is simulated; no keys in GitHub; permission before sharing anyone's words; the builder can explain the AI workflow. [notes]

## Product and market (all [notes] unless stated)
- Core user: founders and marketing heads of mid-size Bengaluru residential developers; target segment about 590 developers (5 to 30 listed projects).
- Five conversations (3 developers, 2 agencies). Two of three documented contacts warned AI presenters can feel artificial; script help was welcomed. Willingness to pay not tested.
- Agency retainers cost Rs 30k to 2 lakh a month; an avatar render of a 45-second reel is estimated at Rs 65 to 380. These are estimates.
- Competitors: HeyGen (script you write), Synthesia, Creatify, VideoTour.ai (closest, US listings), Reel-E, AutoReel. Gap: under-construction projects, Indian buyers, hooks and CTAs that drive site visits.

## Regulation [notes, unverified]
- RERA Act 2016 s11(2): every project ad shows the RERA number and the state authority website. s12: a buyer misled by an incorrect ad can withdraw with refund and interest.
- IT Amendment Rules 2026 (in force 20 Feb 2026): AI-generated audio or video needs a prominent label and provenance metadata.
- Karnataka-specific advertising and QR rules not yet verified. `brain/rules.json` in the repo is an unverified draft with no source URLs. **Discrepancy:** notes say rules v1 was checked on 21 Oct; the repo file says otherwise. Treat as unverified until sourced.

## Instagram research (Stage 1)
**Dataset [verified]:** 487 reels from 25 pages (notes said 485), scraped 2026-10-21. 52 transcript rows, 41 usable (notes said 48). Likes hidden on 90 reels. 83 reels are collab posts attributed to the page that was scraped. Two Bengaluru pages (40 reels). Mostly US.

**Findings [verified as associations in this dataset, not causes]:**
- Confession or insider hooks had the strongest median result among well-sampled hook types: 1.71x the page's own median plays (n=20, 11 pages).
- Comment-keyword CTAs did not raise plays (0.99x vs 1.00x) but drew about 3x the comments per play. Comments are not qualified leads.
- Spec-line, "Presenting" and phone-only openings were not more common among underperformers. Only very short captions were (lift 1.54).
- No format or duration clearly wins. The largest breakouts come from famous-brand, news and entertainment pages, which do not transfer to developers.
- Winning formats in the original notes (developer math, construction spectacle, corridor tour) are supported by single reels from jayroberts and tradedmiami; sample sizes per format are small.

**Limits [verified]:** text only, no video analysis; one-day snapshot; possible paid boosts; baselines use about 20 reels per page; LLM labels imperfect (e.g. "Meet Brandon Lutnick..." tagged as an audience call-out).

**Hypotheses worth testing [hypothesis]:** developer math in rupees; construction spectacle with a record number; founder answering one buyer objection on site; keyword CTA versus phone CTA on matched reels.

## Engineering lessons
- Gemini free-tier quotas are per model and the service returned 503 and 429 during testing. The app falls back across models, so the full PDF upload can be slow (observed 25 to 105 s earlier, and a 295 s timeout during the brain-integration test). [verified]
- After the brain change, script writing was verified directly (3 scripts, all citing new teardowns, no hard-check failures). The full upload path was not re-verified. [verified]
- Apify tool results exceed the model's size limit, so large datasets are pulled in pages of 100 with selected fields. [verified]

## External sources not yet imported [plan]
Original playbook v1, page stats, reel teardown sheets and rules.json live in a Google Drive folder named in the founder's notes. They are not in the repo. Import and reconcile them with the rebuilt Social Brain as a Stage 1 follow-up.
