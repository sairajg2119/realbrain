"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import { FactsCard } from "@/components/FactsCard";
import { ProgressPanel } from "@/components/ProgressPanel";
import { ScriptCard } from "@/components/ScriptCard";
import { Stepper } from "@/components/Stepper";
import { BUYER_TYPES, type AnalyzeResponse, type BuyerType } from "@/lib/types";

const MAX_BYTES = 20 * 1024 * 1024;
const DIRECT_LIMIT = 4 * 1024 * 1024; // what we can send through the server without Blob

const BUYERS: Record<BuyerType, { label: string; blurb: string }> = {
  family: { label: "Family", blurb: "Space, schools, safety" },
  investor: { label: "Investor", blurb: "Numbers and location" },
  nri: { label: "NRI", blurb: "Trust and ease from abroad" },
  "first-time buyer": { label: "First-time buyer", blurb: "Simple and reassuring" },
};

function size(bytes: number) {
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [buyer, setBuyer] = useState<BuyerType | null>(null);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [analyzeFrom, setAnalyzeFrom] = useState<number | null>(null); // second at which upload finished
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [approved, setApproved] = useState<number | null>(null);
  const videoRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!busy) return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const stage = analyzeFrom === null ? 0 : seconds - analyzeFrom < 14 ? 1 : seconds - analyzeFrom < 40 ? 2 : 3;
  const ok = result?.status === "ok" ? result : null;
  const step = approved !== null ? 2 : ok ? 1 : 0;

  function pick(f: File | null, sample = false) {
    setResult(null);
    setApproved(null);
    setIsSample(sample);
    if (!f) return setFile(null);
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      return setResult({ status: "error", message: "That is not a PDF. Please choose your brochure as a PDF file." });
    }
    if (f.size > MAX_BYTES) {
      setFile(null);
      return setResult({ status: "error", message: `This file is ${size(f.size)}. The limit is 20 MB. Please upload a smaller PDF.` });
    }
    setFile(f);
  }

  async function useSample() {
    try {
      const res = await fetch("/sample-brochure.pdf");
      const blob = await res.blob();
      pick(new File([blob], "sample-brochure.pdf", { type: "application/pdf" }), true);
    } catch {
      setResult({ status: "error", message: "Could not load the sample brochure. Please try again." });
    }
  }

  function startOver() {
    setFile(null);
    setIsSample(false);
    setResult(null);
    setApproved(null);
    setAnalyzeFrom(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function run() {
    if (!file || !buyer) return;
    setBusy(true);
    setResult(null);
    setApproved(null);
    setAnalyzeFrom(null);
    let elapsed = 0;
    const clock = setInterval(() => elapsed++, 1000);
    try {
      let res: Response;
      try {
        const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload" });
        setAnalyzeFrom(elapsed);
        res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfUrl: blob.url, buyer }),
        });
      } catch {
        // No Blob token (local testing or not set up): send small files straight to the server.
        if (file.size > DIRECT_LIMIT) {
          throw new Error("Large file upload is not set up yet (missing BLOB_READ_WRITE_TOKEN). Please try a PDF under 4 MB.");
        }
        setAnalyzeFrom(elapsed);
        const form = new FormData();
        form.set("file", file);
        form.set("buyer", buyer);
        res = await fetch("/api/analyze", { method: "POST", body: form });
      }
      setResult((await res.json()) as AnalyzeResponse);
    } catch (e) {
      setResult({ status: "error", message: e instanceof Error ? e.message : "Something went wrong. Please try again." });
    } finally {
      clearInterval(clock);
      setBusy(false);
    }
  }

  function approve(i: number) {
    setApproved(i);
    setTimeout(() => videoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  const showForm = !busy && !ok;
  const approvedScript = ok && approved !== null ? ok.scripts[approved].script : null;
  const allClear = ok ? ok.scripts.every((s) => s.checks.hardFailures.length === 0) : false;

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">R</span> RealBrain
          </div>
          <span className="tag-line">Reel scripts from your brochure</span>
        </div>
      </header>

      <main className="wrap">
        <Stepper current={step} />

        {showForm && (
          <div className="hero">
            <h1>Turn your brochure into 3 reel scripts that follow what works on Instagram.</h1>
            <p>Upload a project brochure. We read it, write three scripts, and check every number against it. No agency, no shoot.</p>
          </div>
        )}

        {busy && (
          <div style={{ marginTop: 24 }}>
            <ProgressPanel stage={stage} seconds={seconds} />
          </div>
        )}

        {showForm && (
          <>
            <h2 className="section-title">1. Your brochure</h2>
            {file ? (
              <div className="file-row">
                <span aria-hidden="true" style={{ fontSize: "1.6rem" }}>📄</span>
                <div className="grow">
                  <div className="name">{file.name}</div>
                  <div className="meta">
                    {size(file.size)}
                    {isSample && " · fictional sample project"}
                  </div>
                </div>
                <button className="link-btn" onClick={() => pick(null)}>Change</button>
              </div>
            ) : (
              <>
                <label
                  className={`drop${dragging ? " drag" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    pick(e.dataTransfer.files?.[0] ?? null);
                  }}
                >
                  <input type="file" accept="application/pdf,.pdf" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
                  <span className="icon" aria-hidden="true">⬆️</span>
                  <span className="big">Tap to choose your brochure</span>
                  <span className="hint">PDF, up to 20 MB. Or drag it here.</span>
                </label>
                <div style={{ marginTop: 8 }}>
                  <span className="hint">No brochure handy? </span>
                  <button className="link-btn" onClick={useSample}>Try a sample brochure</button>
                </div>
              </>
            )}

            <h2 className="section-title">2. Who is this reel for?</h2>
            <div className="buyers" role="radiogroup" aria-label="Buyer type">
              {BUYER_TYPES.map((b) => (
                <button key={b} className="buyer" role="radio" aria-checked={buyer === b} onClick={() => setBuyer(b)}>
                  <span className="t">{BUYERS[b].label}</span>
                  <span className="d">{BUYERS[b].blurb}</span>
                </button>
              ))}
            </div>

            {result?.status === "error" && (
              <div className="msg error" role="alert">
                <span className="ic" aria-hidden="true">✕</span>
                <span>{result.message}</span>
              </div>
            )}
            {result?.status === "rejected" && (
              <>
                <div className="msg error" role="alert">
                  <span className="ic" aria-hidden="true">✕</span>
                  <span>{result.message}</span>
                </div>
                {result.facts && (
                  <>
                    <h2 className="section-title">What I could read</h2>
                    <FactsCard facts={result.facts} />
                  </>
                )}
              </>
            )}

            <div className="cta-row">
              <button className="btn" onClick={run} disabled={!file || !buyer}>
                Create my 3 scripts
              </button>
              {(!file || !buyer) && (
                <p className="hint" style={{ margin: "8px 0 0" }}>
                  {!file ? "Choose a brochure" : "Pick who the reel is for"} to continue.
                </p>
              )}
            </div>
          </>
        )}

        {ok && (
          <>
            {ok.rulesStale && (
              <div className="msg info">
                <span className="ic" aria-hidden="true">⚠</span>
                <span>Compliance rules need re-checking.</span>
              </div>
            )}
            {ok.notes.map((n) => (
              <div key={n} className="msg info">
                <span className="ic" aria-hidden="true">⚠</span>
                <span>{n}</span>
              </div>
            ))}

            <div className="facts-head" style={{ marginTop: 24 }}>
              <h2 className="section-title" style={{ margin: 0 }}>What I read from your brochure</h2>
              <button className="btn ghost small" onClick={startOver}>Start over</button>
            </div>
            <FactsCard facts={ok.facts} />

            <h2 className="section-title">Your 3 scripts</h2>
            <p className="hint" style={{ margin: "-6px 0 14px" }}>
              Read each one, then approve the one you want to post. Numbers shown in <span className="red">red</span> are not in your brochure.
            </p>
            <div className="scripts">
              {ok.scripts.map((item, i) => (
                <ScriptCard
                  key={i}
                  index={i}
                  item={item}
                  reelUrl={ok.reelLinks[item.script.why_this_works.reel_id]}
                  approved={approved === i}
                  onApprove={() => approve(i)}
                />
              ))}
            </div>
            <div className="summary">
              {allClear ? (
                <span className="badge good">✓ All 3 scripts passed the RERA and number checks</span>
              ) : (
                <span className="badge bad">✕ Some scripts failed a check. Read the marks above before posting.</span>
              )}
            </div>

            <section ref={videoRef} aria-label="Make the video">
              <h2 className="section-title">3. Make the video</h2>
              <div className="card video-card">
                {approvedScript ? (
                  <div className="preview">
                    <strong>Approved script</strong>
                    <p>{approvedScript.hook}</p>
                  </div>
                ) : (
                  <p style={{ margin: 0 }}>Approve one script above first. You are responsible for what you post, so please read it carefully.</p>
                )}
                <button className="btn" disabled>
                  Make video · Coming next
                </button>
                <span className="hint">The AI presenter video is the next feature. For now, copy your approved script and caption above.</span>
              </div>
            </section>
          </>
        )}

        <p className="disclaimer">
          Scripts are written by AI from your brochure. You approve what is posted and you are responsible for it under RERA Section 12. Check with your legal advisor before publishing.
        </p>
      </main>
    </>
  );
}
