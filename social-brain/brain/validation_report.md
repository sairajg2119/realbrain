# Social Brain validation report

Built 2026-10-22T11:17:37.580Z (social-brain-1.0.0)

| Check | Result | Detail |
|---|---|---|
| No duplicate reels after normalization | PASS | 487 unique of 487 raw (0 dropped) |
| Hidden likes stay null, not zero | PASS | 90 reels with likes unavailable |
| Every reel has a collection source and timestamp field | PASS | provenance recorded per reel |
| Every baseline states window and sample size | PASS | 25 pages |
| Multiples recompute from plays / page median | PASS | spot check on all reels |
| Every teardown links to a reel URL | PASS | traceable |
| Visual analysis is not claimed | PASS | coverage 0%, stated on every record |
| Playbook patterns cite example reels | PASS | 6 patterns |
| Underperformers analysed as well as winners | PASS | 158 underperformers (77 severe), 97 breakouts |
| LLM teardown coverage | FAIL / GAP | 486/487 |
| Transcript coverage | FAIL / GAP | 41/487 (8.4%) |
| Bengaluru sample large enough for conclusions | FAIL / GAP | 40 reels from 2 pages |
| Video / visual analysis available | FAIL / GAP | no video was accessed; hook delivery and editing pace are not assessed |

## Needs human review
- Spot-check 20 teardown labels (hook, format, CTA) against the actual reels; the labels come from text only.
- Confirm follower counts and categories in creator_universe.json; they come from project notes, not the scrape.
- Treat every pattern as an association from a mostly-US, one-day snapshot.
