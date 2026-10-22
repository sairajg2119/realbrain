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

## Regulation (researched 2026-10-22; detail in realestate-brain/README.md and brain/source_register.json)
**Verified from primary sources [verified]:**
- RERA Act s3(1): no advertising, marketing, booking or selling before registration. s11(2): ads must show the authority website and the registration number. s12: a buyer who relies on a false statement gets compensation, or a refund with interest if withdrawing. s13: no more than 10% advance without a registered agreement for sale. s4(2)(l)(D): 70% of buyer money in a separate account. s18: refund or interest for late possession. Penalties: s59 up to 10% of project cost for unregistered marketing, s61 up to 5% for other breaches.
- K-RERA circular RERA/ADM/CR-4/2019-20 (14 Nov 2019): number top right, at least half the project-name size, K-RERA website mentioned, no "subject to change" disclaimer, number prominently mentioned for electronic media and SMS. K-RERA publishes a list of projects that violated advertisement guidelines (136 records), so enforcement is real.
- Karnataka FAQ: Rules notified 10 July 2017; interest is SBI highest MCLR plus 2%; registration needs plan approval and a commencement certificate first; only a promoter can register.
**Secondary only [official text not read]:** IT Amendment Rules 2026 (label and provenance duties, mainly on platforms and tool providers; continuous-label draft reported as proposed); CPA 2019 ss.2(28), 21, 89 and the CCPA 2022 guidelines; assured-return law (BUDS Act, SEBI); e-Khata, GBA and B-khata regularisation.
**Corrections to earlier notes [verified]:** the notes' s11(2) and s12 summaries match the Act. A Karnataka QR-code rule was not found (QR rules are Maharashtra and Kerala). The Act's 500 sq m / eight-apartment exemption is worded "or"; practice may differ. The repo's old rules.json was an unreviewed draft; it is replaced by sourced rules.
**Open questions [hypothesis, needs a lawyer]:** does the 2019 circular apply to reels; is there a newer circular; advertiser's direct AI-label duty; CPA applicability to developers; legal character of rental guarantees.

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
- Latency swings: the same script-writing call took 9 s, 11 s and once 128 s on `gemini-3.1-flash-lite`, so any time limit depends on Google's load, not only on prompt size. [verified]
- After the brain change, script writing was verified directly (3 scripts, all citing new teardowns, no hard-check failures). The full upload path was not re-verified. [verified]
- Apify tool results exceed the model's size limit, so large datasets are pulled in pages of 100 with selected fields. [verified]

## External sources not yet imported [plan]
Original playbook v1, page stats, reel teardown sheets and rules.json live in a Google Drive folder named in the founder's notes. They are not in the repo. Import and reconcile them with the rebuilt Social Brain as a Stage 1 follow-up.
