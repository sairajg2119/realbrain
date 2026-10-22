# RealBrain

AI content intelligence and creation platform for Bengaluru real estate developers: study what works on Instagram, check it against RERA and the brochure, write reel scripts, make AI avatar video. One product, built brain first, application second.

@AGENTS.md

## Read first
- `docs/PROJECT_VISION.md` what and why. `docs/ROADMAP.md` stages and status. `docs/ARCHITECTURE.md` how the pieces connect. `docs/DATA_DICTIONARY.md` every file and field. `docs/DECISIONS.md` why we chose what we chose. `docs/PROJECT_KNOWLEDGE.md` findings, with what is verified and what is not.
- Also in `docs/` but private and gitignored: `build-brief.md`, `mvp-scope.*`, `ui-mock*`.

## Rules of the road
1. **Three data zones. Never mix them.** Raw source data (`social-brain/raw/`, never edited, not in git). Derived research (`social-brain/brain/`, rebuilt by scripts, in git). App-facing brain (`brain/`, small, deployed with the app, written only by an export script or a human-approved edit).
2. **The app reads only `brain/` through `lib/brain.ts`.** It never reads `social-brain/`. New knowledge layers follow the same path: research store, export, `brain/`.
3. **Say what is verified.** Label every claim as verified, from project notes (unverified), a hypothesis, or a plan. Patterns from data are associations, not causes. Never invent a fact, number, source or locality detail.
4. **Compliance statuses are set by humans.** Rules live in `realestate-brain/brain/compliance_rules.json` with a status (verified_primary, secondary_reported, unverified) and a source in the register. Never invent a legal rule, number, approval or project fact; never mark anything verified yourself; never treat a brochure as proof; escalate unclear legal questions (see `realestate-brain/brain/checklist.json`). `brain/localities.json` is still unverified and empty.
5. **Secrets stay in `.env.local` and Vercel env vars.** Never print, log or commit a key. Other people's captions and transcripts stay out of git (`social-brain/raw/`, `social-brain/cache/`, the full normalized file).
6. **Pipelines are idempotent and resumable.** Re-running must not duplicate records or repeat paid LLM calls (the cache is keyed by reel and prompt version).
7. **Do not break the working MVP** (brochure to facts to 3 checked scripts). Run `npm test` and `npm run brain:test` and `npx tsc --noEmit` before committing.
8. After each meaningful task update the docs it touches, then run `npm run brain:backup` if research data changed.

## Commands
```
npm run dev             app on :3000
npm test                app checks and compliance wiring (19 tests)
npm run brain:all       enrich (LLM), build, test, export
npm run brain:build     raw -> derived research files
npm run brain:enrich    LLM teardown pass (needs GEMINI_API_KEY; cached)
npm run brain:export    research -> brain/ (the app-facing files)
npm run brain:backup    manifest + copy of untracked data to ../realbrain-backups/<date>/
npm run brain:verify    check untracked data against social-brain/MANIFEST.json
npm run re:test         compliance layer tests (17)
npm run re:export       compliance layer -> brain/rules.json and brain/compliance_claims.json
```

## Conventions
- TypeScript with erasable syntax only for scripts (run by `node --experimental-strip-types`). Plain words in UI copy: warm, no corporate phrases.
- Dates are ISO. IDs are stable: Instagram `shortCode` for reels, `RERA-*`/`AI-*` for rules.
- The user has hackathon deadlines; prefer small verified steps over big rewrites. Report what was not verified.
