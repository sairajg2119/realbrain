# RealBrain

An AI reel agent for real estate developers. Upload a project brochure, pick a buyer type, and get three ready-to-post Instagram reel scripts built on patterns from top-performing real estate reels. No agency, no shoot.

**Status (22 Oct 2026, hackathon build):** Phase 1 works end to end (brochure → facts → 3 checked scripts). Phase 2 (AI avatar video) is **not built yet**: the "Make video" button is shown but disabled.

## Job to be done

> When a mid-size Bengaluru developer is marketing a project, I want to upload the project brochure and get ready-to-post reel scripts and an AI avatar video, so I can post data-backed reels without briefing an agency or booking a shoot.

## The 3 tests

| # | Test | Status |
|---|------|--------|
| 1 | Upload a real brochure PDF + choose a buyer type, and within 60 seconds see the extracted facts and 3 scripts with 3 different hook patterns. Each has hook, body, CTA, a caption with the RERA number and rera.karnataka.gov.in, and a "why this works" line citing a real reel. | **Passes** on the fictional sample brochure (28 s in the last run; 25–105 s across runs, depends on the free Gemini plan's speed) |
| 2 | Approve a script, upload a render image, click "Make video", and within about 5 minutes get a playable avatar video labelled "AI-generated". | **Not built** (Phase 2) |
| 3 | A non-brochure PDF, or a brochure with no RERA number, gives a clear message and no scripts. Any number in a script that is not in the brochure is flagged in red. | **Passes** for both bad inputs. Red flagging is covered by unit tests; I have not yet seen it fire on a live model output. |

## Workflow: today vs with RealBrain

**Today:** brief the agency → agency writes the script → developer approves it without being able to judge it → hire a presenter → book a videographer → shoot on site (1–4 hours) → edit rounds → post with a phone number as the call to action.

**With RealBrain:** upload the brochure → AI extracts facts → AI writes 3 scripts → code checks the rules → developer approves one → avatar video (Phase 2) → post with a comment-keyword call to action.

## Architecture: Input → AI → Logic → Action → Output

| Stage | What happens |
|---|---|
| **Input** | The developer uploads a brochure PDF in the browser and picks a buyer type. With Vercel Blob configured, the PDF goes straight from the browser to Blob (Vercel functions reject bodies over ~4.5 MB). Without it, PDFs under 4 MB are sent directly (local testing). |
| **AI call 1** | Gemini reads the PDF directly (no PDF library) and returns structured facts as JSON. |
| **Logic 1** | Code stops with a clear message if the PDF is not a brochure or has no RERA number. It looks up verified locality facts. |
| **AI call 2** | Gemini gets the facts, buyer type, playbook, reel teardowns, verified locality facts and the rules, and writes exactly 3 scripts with 3 different hook types. |
| **Logic 2** | Plain code checks each script (below). A script that fails a hard check is sent back once for a rewrite; if it still fails, it is shown with the failure marked. |
| **Action** | The developer approves one script (a human decision: under RERA Section 12 the developer is liable for false claims). Video rendering is Phase 2. |
| **Output** | Facts card, 3 script cards with red numbers, warnings and the "why this works" line. |

Checks done in plain code, not by AI:

- The RERA number is in the caption.
- The caption includes rera.karnataka.gov.in.
- Every number in the hook, body, CTA and caption appears in the brochure facts. This includes numbers written as words ("seventy"). Anything else is shown in red.
- The spoken text is no longer than about 2.5 words per second of the target length.
- The cited reel id exists in `brain/teardowns.json`. The page and multiple shown to the user are copied from the file, not from the model.
- Risky phrases ("guaranteed returns", "double your money", ...) show a warning.
- Hook types are all different.
- A banner appears when the rules file has not been re-checked within `stale_after_days`.

### Background brain loop (designed, not built)

The plan is for n8n and Apify to refresh the reel data weekly, news daily and rule pages weekly, with a human approving each change before it lands as a versioned file in GitHub. In this MVP the brain is four static files in `/brain` and nothing refreshes automatically.

## Where AI is used, what stays human

| Step | Type | Why |
|---|---|---|
| Read the brochure | AI | Every brochure has a different layout, so a fixed parser breaks on the second one. |
| Locality context | Lookup | Only entries marked `verified: true` in `localities.json` are used. Currently none are verified, so no locality facts are used. |
| Write scripts | AI | Matching the project to the right hook pattern and writing specific copy needs judgment. |
| Compliance and fact checks | Code | Pass/fail checks are more reliable in code than in a model. |
| Approve a script | Human | The developer is liable for what they post. |
| Make the video | AI (avatar API), Phase 2 | Removes the presenter, camera and editor. |

## Failure cases handled

| Failure | What the app does |
|---|---|
| Model invents a number | Shown in red, the script is sent back once for a rewrite, then flagged if it still fails. |
| Not a brochure / no RERA number | A clear message, no scripts. |
| Scanned image PDF with no readable RERA number | Treated as "no RERA number found". |
| File too large | A message with the 20 MB limit. |
| Model returns invalid JSON | Retried once, then a friendly error. |
| Missing or wrong API key | A "Setup problem" message instead of a blank screen. |
| Free-plan limit or Google busy (429, 503) | 503 is retried with a pause. A used-up daily quota moves to the next Gemini model. If all are used up, the user sees "wait a minute and try again". |

## Where the brain data came from, and its limits

This is the honest part. **The brain in this repo is a rebuilt sample, not the original research.**

- `brain/teardowns.json`: 7 real reels scraped from Instagram on 2026-10-22 with Apify, from three US pages (jayroberts, ryanserhant, tomferry; only the first two are cited). Play counts are real. The "multiple vs median" uses the median of the reels sampled in that run (about 17–19 per page), not a full-history median. Five Indian developer pages were tried and returned nothing usable. For 5 of the 7 reels the hook is the first line of the caption, not the spoken line (marked `hook_source`).
- `brain/playbook.md`: rebuilt from the project brief (formats, hook templates, CTAs and the 10 rules). It is **not** built from the original 485-reel, 25-page, 48-transcript analysis.
- `brain/rules.json`: the 8 rules from the brief (RERA Act §11(2) and §12, India's IT Amendment Rules 2026). Sources and effective dates are marked "to verify", and `last_checked` is deliberately old so the app shows "Compliance rules need re-checking". **A human, ideally a lawyer, must verify these before real use.**
- `brain/localities.json`: 5 localities (Jakkur, Jayanagar, Whitefield, Sarjapur Road, Hebbal), all empty and `verified: false`. The AI never invents locality facts.

## What is simulated or unfinished

- **No video yet.** Phase 2 (HeyGen start-and-poll, "AI-generated" label) is not implemented. No video provider is live.
- **Test brochures are fictional.** `test-inputs/` holds a made-up "Lakeview Residences" brochure (with and without a RERA number) and a recipe PDF. The RERA number in it is fake. It has not been tested on a real developer's brochure.
- **Vercel Blob upload is untested.** The code is written but needs a `BLOB_READ_WRITE_TOKEN` and has not been run against a live Blob store. The direct-upload fallback is what was tested.
- **Free Gemini plan.** The free plan has a small daily limit per model (20 requests/day on the model I used), and each upload uses 2 to 5 requests. A busy demo can run out.
- **"Why this works" is a guess.** The model picks a reel with a similar hook or format and gives one plain reason. The numbers are real; the reasoning is not proof of cause. The cited reel does not always match the hook type exactly.
- **Not built, by design:** login, database, history, posting to Instagram, Kannada/Hindi voiceover, n8n automation, extracting images from the PDF.

**Later (v2):** virality score, tracking which reels bring enquiries, consented digital twins of the developer's own team, WhatsApp lead handoff, Indian pages in the brain, automated weekly brain refresh.

## Run it locally

You need Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
npm test                     # unit tests for the plain-code checks
```

Environment variables (names only; put values in `.env.local`, which is git-ignored, and in Vercel's Environment Variables when deploying):

- `GEMINI_API_KEY`: required. A free key from aistudio.google.com/apikey.
- `GEMINI_MODEL`: optional; defaults to `gemini-3.6-flash`, with automatic fallback to other Flash models.
- `BLOB_READ_WRITE_TOKEN`: for large PDF uploads on Vercel Blob. Without it, only PDFs under 4 MB work.
- `VIDEO_PROVIDER`, `HEYGEN_API_KEY`: Phase 2 only, not used yet.

## Project layout

```
app/page.tsx              the one screen
app/api/analyze/          facts + scripts + checks
app/api/upload/           Vercel Blob upload permission
components/               FactsCard, ScriptCard
lib/gemini.ts             the Gemini calls and prompts
lib/checks.ts             all plain-code rules (+ checks.test.ts)
lib/brain.ts              loads the /brain files on the server
brain/                    playbook, teardowns, rules, localities
test-inputs/              fictional sample PDFs
```
