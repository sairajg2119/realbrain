"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useState } from "react";
import { FactsCard } from "@/components/FactsCard";
import { ScriptCard } from "@/components/ScriptCard";
import { BUYER_TYPES, type AnalyzeResponse, type BuyerType } from "@/lib/types";

const MAX_BYTES = 20 * 1024 * 1024;
const DIRECT_LIMIT = 4 * 1024 * 1024; // what we can send through the server without Blob

const BUYER_LABEL: Record<BuyerType, string> = {
  family: "Family",
  investor: "Investor",
  nri: "NRI",
  "first-time buyer": "First-time buyer",
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [buyer, setBuyer] = useState<BuyerType | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [approved, setApproved] = useState<number | null>(null);

  useEffect(() => {
    if (!busy) return;
    const t1 = setTimeout(() => setProgress("Reading your brochure…"), 4000);
    const t2 = setTimeout(() => setProgress("Writing three scripts…"), 18000);
    const t3 = setTimeout(() => setProgress("Checking every number against your brochure…"), 40000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [busy]);

  function pick(f: File | null) {
    setResult(null);
    setApproved(null);
    if (!f) return setFile(null);
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      return setResult({ status: "error", message: "Please choose a PDF file." });
    }
    if (f.size > MAX_BYTES) {
      setFile(null);
      return setResult({ status: "error", message: `This file is ${(f.size / 1048576).toFixed(1)} MB. The limit is 20 MB.` });
    }
    setFile(f);
  }

  async function run() {
    if (!file || !buyer) return;
    setBusy(true);
    setResult(null);
    setApproved(null);
    setProgress("Uploading your brochure…");
    try {
      let res: Response;
      try {
        const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload" });
        setProgress("Reading your brochure…");
        res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfUrl: blob.url, buyer }),
        });
      } catch (uploadError) {
        // No Blob token (local testing): send small files straight to the server.
        if (file.size > DIRECT_LIMIT) {
          throw new Error("Upload is not set up yet (missing BLOB_READ_WRITE_TOKEN), and this file is too big to send directly.");
        }
        void uploadError;
        const form = new FormData();
        form.set("file", file);
        form.set("buyer", buyer);
        res = await fetch("/api/analyze", { method: "POST", body: form });
      }
      const data = (await res.json()) as AnalyzeResponse;
      setResult(data);
    } catch (e) {
      setResult({ status: "error", message: e instanceof Error ? e.message : "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <main>
      <h1>RealBrain</h1>
      <p className="sub">Upload your project brochure. Get three reel scripts built on what works on Instagram.</p>

      <h2>Step 1 · Upload your brochure</h2>
      <label className="drop">
        <input type="file" accept="application/pdf,.pdf" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        {file ? (
          <strong>{file.name}</strong>
        ) : (
          <>
            <strong>Tap here to choose your brochure (PDF)</strong>
            <div className="sub" style={{ margin: 0 }}>Up to 20 MB</div>
          </>
        )}
      </label>

      <h2>Who is this reel for?</h2>
      <div className="row" role="group" aria-label="Buyer type">
        {BUYER_TYPES.map((b) => (
          <button key={b} className="chip" aria-pressed={buyer === b} onClick={() => setBuyer(b)}>
            {BUYER_LABEL[b]}
          </button>
        ))}
      </div>

      <button className="btn" onClick={run} disabled={!file || !buyer || busy}>
        {busy ? progress || "Working…" : "Create scripts"}
      </button>
      {!busy && (!file || !buyer) && <p className="sub" style={{ marginTop: 8 }}>Choose a brochure and a buyer type to continue.</p>}
      {busy && <p className="sub" style={{ marginTop: 8 }}>This takes up to a minute. Please keep this page open.</p>}

      {result?.status === "error" && <div className="msg error" role="alert">{result.message}</div>}

      {result?.status === "rejected" && (
        <>
          <div className="msg error" role="alert">{result.message}</div>
          {result.facts && (
            <>
              <h2>What I could read</h2>
              <FactsCard facts={result.facts} />
            </>
          )}
        </>
      )}

      {result?.status === "ok" && (
        <>
          {result.rulesStale && <div className="msg info">Compliance rules need re-checking.</div>}
          {result.notes.map((n) => (
            <div key={n} className="msg info">{n}</div>
          ))}
          <h2>What I read from your brochure</h2>
          <FactsCard facts={result.facts} />

          <h2>Your three scripts</h2>
          <div className="scripts">
            {result.scripts.map((item, i) => (
              <ScriptCard
                key={i}
                item={item}
                reelUrl={result.reelLinks[item.script.why_this_works.reel_id]}
                selected={approved === i}
                onApprove={() => setApproved(i)}
              />
            ))}
          </div>

          <h2>Step 2 · Make the video</h2>
          <div className="card">
            <p style={{ marginTop: 0 }}>
              {approved === null
                ? "Approve one script above first. You are responsible for what you post, so please read it carefully."
                : "Script approved. Next you will add a project render and make the video."}
            </p>
            <button className="btn" disabled>Make video · Coming next</button>
          </div>
        </>
      )}
    </main>
  );
}
