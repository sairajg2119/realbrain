# Real estate knowledge and compliance layer

Second intelligence layer of RealBrain. Not legal advice. Built 2026-10-22 from primary sources where they could be read, and labelled where they could not.

## What is here
| Path | Purpose |
|---|---|
| `sources/` | Copies of the primary sources read: the RERA Act text, the Karnataka Rules FAQ, K-RERA's advertisement circular (scanned pages) |
| `brain/source_register.json` | Every source, issuer, URL, jurisdiction, effective date, last-verified date and status. The anchor for everything else |
| `brain/compliance_rules.json` | 25 rules. Each says its level (legal requirement, regulator direction, internal best practice, needs legal review), enforcement, plain-English wording, legal basis, sources and status |
| `brain/claims_library.json` | 15 claim classes (prohibited, risky, conditional, safe) with detection patterns, why they are risky, safer wording and evidence needed |
| `brain/misleading_examples.json` | 5 misleading script examples with problems and safer rewrites (fictional) |
| `brain/checklist.json` | RERA verification steps, the "no number found" path, the advertisement checklist (who does each step) and the escalation process |
| `brain/glossary.json`, `brain/knowledge_base.json` | Plain-English terms, actors, the buying process, documents. Each item tagged verified_primary, secondary_reported or general_knowledge |
| `lib/claims.ts` | `scanText()` flags risky claims in script fields. `checkRequiredElements()` checks the RERA number, website, on-screen plan and AI label are present |
| `tests/` | 17 tests, including integrity checks (every rule cites a real source; unverified rules cannot be "legal requirements"; every example is caught; every safer rewrite passes) |
| `scripts/export.ts` | Writes the app-facing `brain/rules.json` and `brain/compliance_claims.json` |

## Status labels
- **verified_primary**: read from an official source on the last-verified date.
- **secondary_reported**: reported by law-firm, news or industry sources. Official text not read. Treat as likely, not certain.
- **unverified / general_knowledge**: not checked. Never state as fact in a script.

Only a human may change a rule's status, by editing `compliance_rules.json` and the source register.

## Findings that change how RealBrain scripts are written
1. **The RERA number must be in the reel itself, not only the caption.** K-RERA's 14 Nov 2019 circular (RERA/ADM/CR-4/2019-20) asks for it top right, at least half the project-name size, with the K-RERA website. The circular covers print, hoardings and "any other visual medium"; it does not name Instagram, so applying it to reels is an interpretation. The safe path is to follow it.
2. **No "subject to change" disclaimer.** Same circular, clause 1(c).
3. **Say "RERA registered", not "approved".** The circular's own wording; the Act speaks of registration.
4. **No Karnataka QR-code rule was found.** QR codes are a Maharashtra and Kerala requirement. The earlier draft rule `KRERA-QR-PLACEMENT` was misleading and is now an info note.
5. **No marketing before registration** (s3(1)). "Pre-launch" language is blocked unless the registration is confirmed.
6. **Penalties** (RERA Act): marketing an unregistered project up to 10% of project cost (s59); other breaches including advertisement rules up to 5% (s61). A buyer misled by a false statement can get compensation or a refund with interest (s12); Karnataka interest is SBI's highest MCLR plus 2%.

## Known uncertainties
See `brain/knowledge_base.json` (`known_uncertainties`) and `brain/source_register.json` (`not_yet_researched`). In short: a newer K-RERA advertisement circular may exist; the Karnataka Rules text was not readable; khata, GBA, land conversion and stamp duty are secondary only; the AI-label duty of an advertiser and the CPA applicability to developers are unresolved.

## Using it
```bash
npm run re:test     # 17 tests
npm run re:export   # refresh brain/rules.json and brain/compliance_claims.json
```
```ts
import { scanText, checkRequiredElements } from "./realestate-brain/lib/claims.ts";
const result = scanText({ hook, body, cta, caption }, claims, rules); // flags only
```
Wired into the app on 2026-10-22: `lib/compliance.ts` calls `scanText` and `checkRequiredElements` for every script in `/api/analyze`, builds the on-screen RERA plan, and the script card and approval screen show the result (see `docs/ARCHITECTURE.md`).
