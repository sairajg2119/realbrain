import fs from "node:fs";
import path from "node:path";
import type { Teardown } from "./types.ts";
import { rulesAreStale } from "./checks.ts";
import type { Claim, Rule } from "../realestate-brain/lib/claims.ts";

interface Locality {
  name: string;
  aliases: string[];
  facts: { text: string; source_url: string }[];
  verified: boolean;
}

function readBrain(file: string): string {
  const p = path.join(process.cwd(), "brain", file);
  if (!fs.existsSync(p)) {
    throw new Error(`Setup problem: brain/${file} is missing. Copy the brain files into the brain/ folder.`);
  }
  return fs.readFileSync(p, "utf8");
}

export function loadBrain() {
  const playbook = readBrain("playbook.md");
  const teardownFile = JSON.parse(readBrain("teardowns.json")) as { reels: Teardown[] };
  const rules = JSON.parse(readBrain("rules.json")) as {
    last_checked: string;
    stale_after_days: number;
    rules: unknown[];
  };
  const localities = (JSON.parse(readBrain("localities.json")) as { localities: Locality[] }).localities;
  // Exported by realestate-brain/scripts/export.ts. The app reads only brain/, never realestate-brain/.
  const claims = (JSON.parse(readBrain("compliance_claims.json")) as { claims: Claim[] }).claims;
  return {
    claims,
    rules: rules.rules as Rule[],
    playbook,
    teardowns: teardownFile.reels,
    rulesJson: JSON.stringify(rules.rules),
    rulesStale: rulesAreStale(rules.last_checked, rules.stale_after_days),
    localities,
  };
}

/**
 * Researched but not yet human-verified facts for the matched locality (facts with text, in a locality not marked verified).
 * Shown in the property brief as 'unverified'. Never used in scripts.
 */
export function localityUnverified(localities: Locality[], match: string | null, location: string | null): { name: string | null; facts: { text: string; source_url: string }[] } {
  const hay = `${match ?? ""} ${location ?? ""}`.toLowerCase();
  for (const l of localities) {
    if ([l.name, ...l.aliases].some((a) => hay.includes(a.toLowerCase()))) {
      return { name: l.name, facts: l.verified ? [] : l.facts.filter((f) => f.text.trim()) };
    }
  }
  return { name: null, facts: [] };
}

/** Verified facts for the matched locality, or an empty list. Never invents anything. */
export function localityFacts(localities: Locality[], match: string | null, location: string | null): string[] {
  const hay = `${match ?? ""} ${location ?? ""}`.toLowerCase();
  for (const l of localities) {
    if (!l.verified) continue;
    if ([l.name, ...l.aliases].some((a) => hay.includes(a.toLowerCase()))) {
      return l.facts.filter((f) => f.text.trim()).map((f) => f.text);
    }
  }
  return [];
}
