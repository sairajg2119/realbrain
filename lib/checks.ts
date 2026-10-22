import type { CheckCode, Facts, Script, ScriptChecks, Teardown } from "./types.ts";

const NUMBER_RE = /\d[\d,]*(?:\.\d+)?/g;
export const RERA_SITE = /rera\.karnataka\.gov\.in/i;
const RISKY_PHRASES = [
  "guaranteed return",
  "assured return",
  "assured appreciation",
  "double your money",
  "risk-free",
  "risk free",
];

/** "1,650" -> "1650", "2.5" stays "2.5". Trailing commas/dots are dropped. */
export function normaliseNumber(n: string): string {
  return n.replace(/,/g, "").replace(/\.$/, "");
}

const UNITS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** Numbers written as words ("seventy", "twenty five", "two"), as digits. "one" is skipped: it is mostly plain English ("one place"). */
function wordNumbers(text: string): string[] {
  const words = text.toLowerCase().replace(/-/g, " ").match(/[a-z]+/g) ?? [];
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w in TENS) {
      const next = words[i + 1];
      if (next in UNITS && UNITS[next] < 10) {
        out.push(String(TENS[w] + UNITS[next]));
        i++;
      } else out.push(String(TENS[w]));
    } else if (w in UNITS) out.push(String(UNITS[w]));
  }
  return out;
}

export function extractNumbers(text: string): string[] {
  const digits = (text.match(NUMBER_RE) ?? []).map(normaliseNumber).filter(Boolean);
  return [...digits, ...wordNumbers(text)];
}

/** Every number that appears anywhere in the extracted facts. */
export function factNumbers(facts: Facts): Set<string> {
  const pieces = [
    ...facts.key_numbers,
    ...facts.configurations,
    ...facts.amenities,
    facts.price ?? "",
    facts.rera_number ?? "",
    facts.project_name ?? "",
    facts.location ?? "",
  ];
  const out = new Set<string>();
  for (const p of pieces) for (const n of extractNumbers(p)) out.add(n);
  return out;
}

function squash(s: string): string {
  return s.replace(/[\s\-/]/g, "").toLowerCase();
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function checkScript(script: Script, facts: Facts, teardowns: Teardown[]): ScriptChecks {
  const hardFailures: string[] = [];
  const warnings: string[] = [];
  const failedCodes: CheckCode[] = [];

  // RERA-REG-NO
  if (!facts.rera_number || !squash(script.caption).includes(squash(facts.rera_number))) {
    hardFailures.push("The caption does not contain the RERA registration number.");
    failedCodes.push("rera");
  }
  // RERA-AUTHORITY-WEBSITE
  if (!RERA_SITE.test(script.caption)) {
    hardFailures.push("The caption does not mention rera.karnataka.gov.in.");
    failedCodes.push("website");
  }

  // RERA-NO-FALSE-CLAIMS: every number must come from the brochure facts.
  const known = factNumbers(facts);
  const spoken = `${script.hook} ${script.body} ${script.cta} ${script.caption}`;
  const red = [...new Set(extractNumbers(spoken).filter((n) => !known.has(n)))];
  if (red.length) {
    hardFailures.push(`These numbers are not in the brochure: ${red.join(", ")}.`);
    failedCodes.push("numbers");
  }

  // Length: about 2.5 words a second.
  const words = wordCount(`${script.hook} ${script.body} ${script.cta}`);
  const limit = Math.floor(2.5 * script.target_duration_s);
  if (words > limit) {
    hardFailures.push(`Too long: ${words} spoken words for ${script.target_duration_s} seconds (limit ${limit}).`);
    failedCodes.push("length");
  }

  // The cited reel must be real.
  if (!teardowns.some((t) => t.id === script.why_this_works.reel_id)) {
    hardFailures.push(`The cited reel "${script.why_this_works.reel_id}" is not in the teardowns.`);
    failedCodes.push("citation");
  }

  // NO-GUARANTEED-RETURNS (warning)
  const lower = spoken.toLowerCase();
  for (const p of RISKY_PHRASES) {
    if (lower.includes(p)) warnings.push(`Risky phrase: "${p}". Check this with your legal advisor.`);
  }

  return { failedCodes, hardFailures, warnings, redNumbers: red, rewritten: false };
}

/** Replace what Claude said about the cited reel with the real numbers from the file. */
export function fixCitation(script: Script, teardowns: Teardown[]): Script {
  const t = teardowns.find((x) => x.id === script.why_this_works.reel_id);
  if (!t) return script;
  return {
    ...script,
    why_this_works: {
      ...script.why_this_works,
      page: t.page,
      multiple_vs_median: t.multiple_vs_median,
    },
  };
}

export function hasDistinctHookTypes(scripts: Script[]): boolean {
  return new Set(scripts.map((s) => s.hook_type.trim().toLowerCase())).size === scripts.length;
}

export function rulesAreStale(lastChecked: string, staleAfterDays: number, now = new Date()): boolean {
  const t = Date.parse(lastChecked);
  if (Number.isNaN(t)) return true;
  return (now.getTime() - t) / 86_400_000 > staleAfterDays;
}
