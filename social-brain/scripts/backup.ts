// Preserve and verify the research data that is NOT in git (raw Instagram text, LLM cache).
//   npm run brain:backup   writes social-brain/MANIFEST.json (checksums, row counts, sources) and copies the
//                          untracked data to ../realbrain-backups/<date>/ (a sibling folder, outside the repo).
//   npm run brain:verify   checks every file against MANIFEST.json and fails if anything changed or is missing.
// The manifest is committed, so integrity can be checked on any machine that holds a copy of the data.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SB = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(SB, "..");
const MANIFEST = join(SB, "MANIFEST.json");

// Everything that cannot be rebuilt for free: raw source records and paid LLM output.
const TRACKED_DATA = [
  { path: "raw/instagram_reels_raw.jsonl", kind: "raw", source: "apify dataset CB3SNYD4LPQW3BiyO (selected fields)", in_git: false },
  { path: "raw/instagram_transcripts_raw.jsonl", kind: "raw", source: "apify dataset 4XrYkhay87CuwWHgw", in_git: false },
  { path: "cache/llm_teardowns.jsonl", kind: "llm_cache", source: "gemini teardown-v1 over normalized reels", in_git: false },
  { path: "brain/instagram_reels_normalized.jsonl", kind: "derived_full_text", source: "build.ts from raw", in_git: false },
];

const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const rows = (p: string) => readFileSync(p, "utf8").split("\n").filter(Boolean).length;

function entries() {
  return TRACKED_DATA.filter((e) => existsSync(join(SB, e.path))).map((e) => {
    const full = join(SB, e.path);
    return { ...e, sha256: sha(full), rows: rows(full), bytes: readFileSync(full).length };
  });
}

function verify(): number {
  if (!existsSync(MANIFEST)) { console.error("No MANIFEST.json. Run npm run brain:backup first."); return 2; }
  const m = JSON.parse(readFileSync(MANIFEST, "utf8"));
  let bad = 0;
  for (const e of m.files) {
    const full = join(SB, e.path);
    if (!existsSync(full)) { console.error(`MISSING ${e.path}`); bad++; continue; }
    // The LLM cache is append-only and may legitimately grow; every other file must match exactly.
    if (e.kind === "llm_cache") {
      const now = rows(full);
      console.log(`${now >= e.rows ? "OK     " : "SHRUNK "} ${e.path} (${now} rows, manifest ${e.rows})`);
      if (now < e.rows) bad++;
      continue;
    }
    const ok = sha(full) === e.sha256;
    console.log(`${ok ? "OK     " : "CHANGED"} ${e.path}`);
    if (!ok) bad++;
  }
  return bad ? 1 : 0;
}

function backup() {
  const files = entries();
  const manifest = {
    schema: 1, written_at: new Date().toISOString(),
    note: "Checksums of research data that is not committed to git. Raw files are append-only source records and must never be edited.",
    apify_retention_warning: "The Apify datasets are unnamed and are deleted after the account's retention period. This local copy may become the only copy.",
    files,
  };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = join(REPO, "..", "realbrain-backups", stamp);
  for (const e of files) {
    const to = join(dest, "social-brain", e.path);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(join(SB, e.path), to);
  }
  copyFileSync(MANIFEST, join(dest, "MANIFEST.json"));
  console.log(`manifest: ${files.length} files. backup copied to ${relative(join(REPO, ".."), dest)} (${readdirSync(dest).length} entries).`);
}

if (process.argv.includes("--verify")) process.exit(verify());
else backup();
