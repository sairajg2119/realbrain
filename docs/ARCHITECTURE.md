# Architecture

Last updated 2026-10-22. Describes what exists, then what is planned. Planned parts are marked.

## Stack (existing, reused)
Next.js 16 app on Vercel, TypeScript, Gemini (`@google/genai`) for AI calls, Vercel Blob for large uploads, Apify for data collection. GitHub holds code and versioned brain files. No database.

## Storage architecture: files in git, three zones
```
Zone 1  RAW (source of truth, append-only, not in git)
        social-brain/raw/*.jsonl          untouched Apify records
        social-brain/cache/*.jsonl        paid LLM output, keyed by reel + prompt version
        social-brain/MANIFEST.json        checksums, row counts, sources (in git)
        ../realbrain-backups/<date>/      copy made by `npm run brain:backup`

Zone 2  DERIVED RESEARCH (rebuilt from Zone 1 by scripts, in git)
        social-brain/brain/*.json(l)      baselines, teardowns, patterns, failures, taxonomies, playbook
        realestate-brain/brain/           compliance rules, claims, sources, checklist, glossary (hand-curated, human-edited)
        realestate-brain/sources/         copies of the primary sources read (public law and circulars)

Zone 3  APP-FACING BRAIN (small, deployed with the app, read at runtime)
        brain/playbook.md  brain/teardowns.json  brain/rules.json  brain/localities.json
        written by `npm run brain:export` or by a human-approved edit; read only by lib/brain.ts
```
Data flows one way: Zone 1 to Zone 2 to Zone 3. The app never reads Zones 1 or 2.

### Why files, not a database (see DECISIONS.md D1)
The brain is about 3 MB, read-only at runtime, written by one person, and every change should be reviewable and versioned in git. A database would add cost and a deployment dependency with no benefit today. The trigger to add one is user data (projects, approved scripts, video jobs), which does not exist yet.

## Runtime flow (built)
Browser uploads PDF (Blob or direct) to `/api/analyze`, which calls Gemini to extract facts (`lib/gemini.ts`), stops early on non-brochures or a missing RERA number, looks up verified locality facts (`lib/brain.ts`), calls Gemini to write 3 scripts from the playbook and teardowns, then checks each script in plain code (`lib/checks.ts`) and returns facts, scripts, checks and evidence links.

## Research pipeline (built, `social-brain/`)
`raw` to `build.ts` (normalize, baselines, rule-based teardown, patterns, failures, validation) with `enrich.ts` (LLM labels, cached) to `export.ts` (app-facing files). `backup.ts` writes the manifest and the off-repo copy. Helpers are pure and unit-tested (`lib/metrics.ts`, `lib/classify.ts`).

## Production data loading
Committing a file does not make it available on Vercel by itself. `next.config.mjs` lists `./brain/**/*` in `outputFileTracingIncludes` for `/api/analyze`, so Zone 3 ships with that route. Zone 2 is not shipped and not needed at runtime. Any new folder the app reads must be added to that list and checked on a preview deploy. Secrets are Vercel environment variables, never files.

## Interfaces between layers
| Consumer | Needs | Provided by | Contract |
|---|---|---|---|
| Script generator | hook patterns, example reels with evidence | `brain/playbook.md`, `brain/teardowns.json` | schema in DATA_DICTIONARY (app teardown) |
| Script checker | rules with ids and enforcement | `brain/rules.json` | `enforcement`: hard or warning; `status` |
| Script generator and checker | verified locality facts | `brain/localities.json` | only `verified: true` entries are used |
| Evidence display | page, plays, multiple, url by reel id | `lib/evidence.ts` reads `brain/teardowns.json` | id = Instagram shortCode |
| Script generator | compact compliance rules with level and status | `brain/rules.json` (exported from `realestate-brain/brain/compliance_rules.json`) | `status`: verified_primary or secondary_reported; `level` separates law from best practice |
| (planned) Compliance scan before approval | claim patterns, checklist, escalation process | `brain/compliance_claims.json`, `realestate-brain/lib/claims.ts` | `scanText()` returns findings; a match is a flag, not a legal finding |
| (planned) Retrieval by hook, buyer or format | filtered teardowns from the full research set | `social-brain/brain/reel_teardowns.jsonl` | would need to be exported or loaded; see roadmap |
| (planned) Video step | approved script, render image, AI label rule | `lib/video.ts`, `AI-LABEL` rule | provider chosen by `VIDEO_PROVIDER` |

## Adding a new intelligence layer (checklist)
1. Create `<layer>/raw` (untracked), `<layer>/brain` (tracked), `<layer>/scripts`, `<layer>/tests`.
2. Record raw files in a manifest (extend `backup.ts`).
3. Write an export script into `brain/` with a documented schema; add the schema to DATA_DICTIONARY.
4. Read it only through `lib/brain.ts`; add the path to `outputFileTracingIncludes`.
5. Update ROADMAP, DECISIONS, PROJECT_KNOWLEDGE.

## Stage 4 plan (not built)
When user data appears, add one managed store (likely Vercel Postgres or Blob-backed JSON) for projects, approved scripts and video jobs. The brain stays in files. Decide at that time; do not pre-build.
