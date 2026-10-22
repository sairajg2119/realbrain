import { NextResponse } from "next/server";
import { loadBrain, localityFacts } from "@/lib/brain";
import { checkScript, fixCitation, hasDistinctHookTypes } from "@/lib/checks";
import { extractFacts, isRateLimit, rewriteScript, SetupError, writeScripts } from "@/lib/gemini";
import { BUYER_TYPES, type AnalyzeResponse, type BuyerType, type CheckedScript } from "@/lib/types";

export const maxDuration = 300;

const MAX_PDF_BYTES = 20 * 1024 * 1024;

function reply(body: AnalyzeResponse, status = 200) {
  return NextResponse.json(body, { status });
}

async function getPdf(request: Request): Promise<{ b64: string; buyer: BuyerType } | { error: string }> {
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
    const body = (await request.json()) as { pdfUrl?: string; buyer?: string };
    buyer = body.buyer;
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
  if (!BUYER_TYPES.includes(buyer as BuyerType)) return { error: "Please choose a buyer type." };
  if (bytes.length > MAX_PDF_BYTES) return { error: "This PDF is over the 20 MB limit. Please upload a smaller one." };
  if (bytes.subarray(0, 5).toString() !== "%PDF-") return { error: "That file is not a PDF." };
  return { b64: bytes.toString("base64"), buyer: buyer as BuyerType };
}

export async function POST(request: Request) {
  try {
    const input = await getPdf(request);
    if ("error" in input) return reply({ status: "error", message: input.error }, 400);

    const brain = loadBrain();

    // AI call 1: read the brochure.
    const t0 = Date.now();
    const facts = await extractFacts(input.b64);
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

    // AI call 2: write 3 scripts (once more if the hook types repeat).
    const loc = localityFacts(brain.localities, facts.locality_match, facts.location);
    const common = { facts, buyer: input.buyer, playbook: brain.playbook, teardowns: brain.teardowns, localityFacts: loc, rulesJson: brain.rulesJson };
    const notes: string[] = [];
    let scripts = await writeScripts(common);
    console.log(`[timing] scripts done at ${Date.now() - t0}ms`);
    if (!hasDistinctHookTypes(scripts)) {
      scripts = await writeScripts({ ...common, extraNote: "Last time two scripts shared a hook type. Every script must use a different hook type." });
      if (!hasDistinctHookTypes(scripts)) notes.push("Two scripts use the same hook type.");
    }

    // Logic 2: check every script; rewrite failures once.
    const checked: CheckedScript[] = await Promise.all(
      scripts.map(async (raw) => {
        let script = fixCitation(raw, brain.teardowns);
        let checks = checkScript(script, facts, brain.teardowns);
        if (checks.hardFailures.length) {
          try {
            const rewritten = fixCitation(
              await rewriteScript({ facts, buyer: input.buyer, script, failures: checks.hardFailures, teardowns: brain.teardowns }),
              brain.teardowns,
            );
            script = rewritten;
            checks = { ...checkScript(rewritten, facts, brain.teardowns), rewritten: true };
          } catch (e) {
            if (e instanceof SetupError || isRateLimit(e)) throw e;
            // keep the original script with its failures showing
          }
        }
        return { script, checks };
      }),
    );

    console.log(`[timing] checks done at ${Date.now() - t0}ms`);
    const reelLinks = Object.fromEntries(brain.teardowns.map((t) => [t.id, t.url]));
    return reply({ status: "ok", facts, scripts: checked, rulesStale: brain.rulesStale, reelLinks, notes });
  } catch (e) {
    if (e instanceof SetupError || (e instanceof Error && e.message.startsWith("Setup problem"))) {
      return reply({ status: "error", message: e.message }, 500);
    }
    if (isRateLimit(e)) {
      return reply({ status: "error", message: "The AI service is busy (free-plan limit). Please wait a minute and try again." }, 429);
    }
    console.error(e);
    return reply({ status: "error", message: "Something went wrong while reading the brochure. Please try again." }, 500);
  }
}
