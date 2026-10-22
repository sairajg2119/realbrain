import { NextResponse } from "next/server";
import { loadBrain, localityFacts, localityUnverified } from "@/lib/brain";
import { anglesForScripts, avoidForScripts, buildBrief, factList } from "@/lib/brief";
import { checkScript, fixCitation, hasDistinctHookTypes, hasMixedAudiences } from "@/lib/checks";
import { applyCompliance, scanScript, withOnScreen } from "@/lib/compliance";
import { AiError, extractFacts, extractFactsFromText, isRateLimit, rewriteScript, SetupError, writeBrief, writeScripts } from "@/lib/gemini";
import { TEXT_ONLY_NOTE, validateBrochureText } from "@/lib/textInput";
import { BUYER_TYPES, type AnalyzeResponse, type BuyerChoice, type BuyerType, type CheckedScript, type PropertyBrief } from "@/lib/types";

export const maxDuration = 300;

const MAX_PDF_BYTES = 20 * 1024 * 1024;

function reply(body: AnalyzeResponse, status = 200) {
  return NextResponse.json(body, { status });
}

type Input = { kind: "pdf"; b64: string; buyer: BuyerChoice } | { kind: "text"; text: string; buyer: BuyerChoice } | { error: string };

/** The audience: "auto" (or nothing chosen) lets RealBrain pick the audiences the property suits. */
function parseBuyer(buyer: unknown): BuyerChoice | null {
  if (buyer === undefined || buyer === null || buyer === "") return "auto";
  if (buyer === "auto" || BUYER_TYPES.includes(buyer as BuyerType)) return buyer as BuyerChoice;
  return null;
}

async function getInput(request: Request): Promise<Input> {
  let buyer: unknown;
  let bytes: Buffer;
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data")) {
    // Local fallback only (no Blob token): fine for small files, too big for Vercel's request limit.
    const form = await request.formData();
    buyer = form.get("buyer");
    const file = form.get("file");
    if (!(file instanceof File)) return { error: "No PDF received." };
    bytes = Buffer.from(await file.arrayBuffer());
  } else {
    const body = (await request.json()) as { pdfUrl?: string; text?: string; buyer?: string };
    buyer = body.buyer;
    // A PDF too big to upload is read in the browser and only its text is sent.
    if (typeof body.text === "string") {
      const b = parseBuyer(buyer);
      if (!b) return { error: "That audience is not one we write for." };
      const t = validateBrochureText(body.text);
      if (!t.ok) return { error: t.error };
      return { kind: "text", text: t.text, buyer: b };
    }
    let url: URL;
    try {
      url = new URL(body.pdfUrl ?? "");
    } catch {
      return { error: "No PDF received." };
    }
    if (url.protocol !== "https:" || !url.hostname.endsWith(".public.blob.vercel-storage.com")) {
      return { error: "That file link is not allowed." };
    }
    const res = await fetch(url);
    if (!res.ok) return { error: "Could not read the uploaded file. Please upload it again." };
    bytes = Buffer.from(await res.arrayBuffer());
  }
  const b = parseBuyer(buyer);
  if (!b) return { error: "That audience is not one we write for." };
  if (bytes.length > MAX_PDF_BYTES) return { error: "This PDF is over the 20 MB limit. Please upload a smaller one." };
  if (bytes.subarray(0, 5).toString() !== "%PDF-") return { error: "That file is not a PDF." };
  return { kind: "pdf", b64: bytes.toString("base64"), buyer: b };
}

export async function POST(request: Request) {
  try {
    const input = await getInput(request);
    if ("error" in input) return reply({ status: "error", message: input.error }, 400);

    const brain = loadBrain();

    // AI call 1: read the brochure.
    const t0 = Date.now();
    const facts = input.kind === "pdf" ? await extractFacts(input.b64) : await extractFactsFromText(input.text);
    console.log(`[timing] extract ${Date.now() - t0}ms`);

    // Logic 1: stop early with an honest message.
    if (!facts.is_real_estate_brochure) {
      return reply({
        status: "rejected",
        facts: null,
        message: "This does not look like a real estate project brochure, so I have not written any scripts. Please upload the project's brochure PDF.",
      });
    }
    if (!facts.rera_number) {
      return reply({
        status: "rejected",
        facts,
        message:
          "I could not find a RERA registration number in this brochure, so I have not written any scripts. A reel caption must carry the RERA number. If your brochure has one, it may be inside an image I cannot read: please upload a text-based PDF that prints it.",
      });
    }

    // AI call 2: the property intelligence brief, built BEFORE any script. It is validated in code and never blocks the scripts:
    // if it fails or takes too long, the scripts are written without it and a note says so.
    const loc = localityFacts(brain.localities, facts.locality_match, facts.location);
    const notes: string[] = input.kind === "text" ? [TEXT_ONLY_NOTE] : [];
    let brief: PropertyBrief | null = null;
    const buyer = input.buyer;
    async function buildBriefSafe() {
      const unverified = localityUnverified(brain.localities, facts.locality_match, facts.location);
      const hookTypes = [...new Set(brain.teardowns.map((t) => t.hook_type))];
      const list = factList(facts);
      const draft = await Promise.race([
        writeBrief({
          facts: list.map((f) => ({ id: f.id, text: f.text })), buyer, hookTypes, location: facts.location,
          exampleReels: brain.teardowns.map((t) => ({ id: t.id, hook_type: t.hook_type, hook: t.hook })),
        }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("brief timeout")), 40_000)),
      ]);
      return buildBrief(draft.raw, {
        facts, hookTypes, teardownIds: brain.teardowns.map((t) => t.id), claims: brain.claims, rules: brain.rules, modelNote: `Drafted by ${draft.model}; every citation checked in code.`,
        location: {
          name: unverified.name ?? facts.locality_match,
          verified: loc.map((text, i) => ({ id: `L${i + 1}`, text, basis: "verified_external" as const, source: "brain/localities.json (human-verified)" })),
          unverified: unverified.facts.map((f, i) => ({ id: `U${i + 1}`, text: f.text, basis: "unverified" as const, source: f.source_url || "source not recorded" })),
        },
      });
    }
    // The brief is a bonus. When the AI has already been slow, skip it so the scripts still arrive in good time.
    const slowStart = Date.now() - t0 > 45_000;
    if (slowStart) notes.push("The AI was slow, so the property analysis was skipped this time. The scripts were written from the brochure facts.");
    try {
      if (slowStart) throw new Error("skipped: slow start");
      brief = await buildBriefSafe();
      console.log(`[timing] brief done at ${Date.now() - t0}ms`);
    } catch (e) {
      if (e instanceof SetupError) throw e;
      if (!slowStart) {
        console.error("brief failed:", e instanceof Error ? e.message : e);
        notes.push("The property brief could not be prepared this time, so the scripts were written from the brochure facts alone.");
      }
    }

    // AI call 3: write 3 scripts (once more if the hook types repeat).
    const common = { facts, buyer: input.buyer, playbook: brain.playbook, teardowns: brain.teardowns, localityFacts: loc, rulesJson: brain.rulesJson, angles: anglesForScripts(brief), avoid: avoidForScripts(brief) };
    let scripts = await writeScripts(common);
    console.log(`[timing] scripts done at ${Date.now() - t0}ms`);
    // When RealBrain chooses the audiences, one more try if every script is for the same one.
    if (input.buyer === "auto" && !hasMixedAudiences(scripts) && Date.now() - t0 < 150_000) {
      const retry = await writeScripts({ ...common, extraNote: "Every script was for the same audience. Write for at least two different audiences. For example first-time buyers (sizes, layouts, what is included) or everyone (open space, lifestyle), whichever the facts support." });
      if (hasMixedAudiences(retry)) scripts = retry;
    }
    if (!hasDistinctHookTypes(scripts)) {
      scripts = await writeScripts({ ...common, extraNote: "Last time two scripts shared a hook type. Every script must use a different hook type." });
      if (!hasDistinctHookTypes(scripts)) notes.push("Two scripts use the same hook type.");
    }

    // Logic 2: code checks plus the compliance scan. The on-screen RERA plan is built by code from the facts.
    // A rewrite is attempted once for hard failures, including blocked claims (guaranteed returns, pre-launch selling, invented people).
    const evaluate = (s: Parameters<typeof withOnScreen>[0]): CheckedScript => {
      const script = withOnScreen(fixCitation(s, brain.teardowns), facts);
      const compliance = scanScript(script, facts, brain.claims, brain.rules);
      return { script, checks: applyCompliance(checkScript(script, facts, brain.teardowns), compliance), compliance };
    };
    const checked: CheckedScript[] = await Promise.all(
      scripts.map(async (raw) => {
        let item = evaluate(raw);
        // A rewrite is another AI call. Late in a slow request the script is shown with its failure marked instead, so the request always finishes.
        if (item.checks.hardFailures.length && Date.now() - t0 < 200_000) {
          try {
            const rewritten = await rewriteScript({ facts, buyer: input.buyer, script: item.script, failures: item.checks.hardFailures, teardowns: brain.teardowns });
            const again = evaluate(rewritten);
            item = { ...again, checks: { ...again.checks, rewritten: true } };
          } catch (e) {
            if (e instanceof SetupError || isRateLimit(e)) throw e;
            // keep the original script with its failures showing
          }
        }
        return item;
      }),
    );

    console.log(`[timing] checks done at ${Date.now() - t0}ms`);
    const reelLinks = Object.fromEntries(brain.teardowns.map((t) => [t.id, t.url]));
    return reply({ status: "ok", facts, brief, scripts: checked, rulesStale: brain.rulesStale, reelLinks, notes });
  } catch (e) {
    if (e instanceof SetupError || (e instanceof Error && e.message.startsWith("Setup problem"))) {
      return reply({ status: "error", message: e.message }, 500);
    }
    if (isRateLimit(e)) {
      return reply({ status: "error", message: "The AI service is busy (free-plan limit). Please wait a minute and try again." }, 429);
    }
    // A short reference printed in the server log and shown to the person, so a failure can be found afterwards.
    const ref = Math.random().toString(36).slice(2, 8);
    console.error(`[error ${ref}]`, e);
    if (e instanceof AiError) {
      const message =
        e.kind === "timeout"
          ? "The AI is taking too long to answer right now. Please try again in a minute."
          : e.kind === "bad_output"
            ? "The AI answered in a form we could not use. Please try again."
            : "The AI service is overloaded or unreachable right now. Please try again in a minute.";
      return reply({ status: "error", message: `${message} (reference ${ref})` }, 503);
    }
    return reply({ status: "error", message: `Something went wrong while creating your scripts. Please try again. (reference ${ref})` }, 500);
  }
}
