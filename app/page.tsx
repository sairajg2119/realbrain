"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ApprovalScreen } from "@/components/ApprovalScreen";
import { Landing } from "@/components/Landing";
import { ProjectScreen } from "@/components/ProjectScreen";
import { ScriptStudio } from "@/components/ScriptStudio";
import { loadDemoResult } from "@/lib/mock";
import { extractPdfText } from "@/lib/pdftext";
import type { AnalyzeResponse, BuyerChoice } from "@/lib/types";
import { startVideo, type VideoState } from "@/lib/video";
import { activeStep, SERVER_PDF_BYTES, type Stage } from "@/lib/workflow";

const DIRECT_LIMIT = 4 * 1024 * 1024; // what we can send through the server without Blob

export default function Home() {
  const [stage, setStage] = useState<Stage>("landing");
  const [file, setFile] = useState<File | null>(null);
  const [buyer, setBuyer] = useState<BuyerChoice>("auto");
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [onDevice, setOnDevice] = useState(false);
  const [pages, setPages] = useState<{ done: number; total: number } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [demo, setDemo] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [approved, setApproved] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<VideoState>({ kind: "idle" });
  const root = useRef<HTMLDivElement>(null);

  // Real elapsed time while the brochure is being processed.
  useEffect(() => {
    if (!busy) return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  // On every screen change: scroll to the top and move keyboard focus to the new heading.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const h = root.current?.querySelector<HTMLElement>("[data-focus]");
    if (h) {
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    }
  }, [stage]);

  const ok = result?.status === "ok" ? result : null;

  function resetJourney() {
    setFile(null);
    setBuyer("auto");
    setResult(null);
    setDemo(false);
    setSelected(null);
    setApproved(false);
    setImage(null);
    setVideo({ kind: "idle" });
    setUploaded(false);
  }

  function pickFile(f: File | null) {
    setFile(f);
    setResult(null);
  }

  async function createScripts() {
    if (!file) return;
    setBusy(true);
    setUploaded(false);
    setOnDevice(false);
    setPages(null);
    setResult(null);
    setDemo(false);
    setSelected(null);
    setApproved(false);
    try {
      // Big PDFs are read in the browser and only their text is sent, so any real estate PDF works with or without Blob.
      async function viaText(): Promise<Response> {
        setOnDevice(true);
        setPages(null);
        const text = await extractPdfText(file!, (done, total) => setPages({ done, total }));
        setUploaded(true);
        return fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, buyer }) });
      }
      let res: Response;
      if (file.size > SERVER_PDF_BYTES) {
        res = await viaText();
      } else {
        try {
          const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload" });
          setUploaded(true);
          res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfUrl: blob.url, buyer }),
          });
        } catch {
          // No Blob store: small files go straight to the server, bigger ones are read on the device.
          if (file.size > DIRECT_LIMIT) {
            res = await viaText();
          } else {
            setUploaded(true);
            const form = new FormData();
            form.set("file", file);
            form.set("buyer", buyer);
            res = await fetch("/api/analyze", { method: "POST", body: form });
          }
        }
      }
      const data = (await res.json()) as AnalyzeResponse;
      setResult(data);
      if (data.status === "ok") setStage("script");
    } catch (e) {
      setResult({ status: "error", message: e instanceof Error ? e.message : "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function exploreSample() {
    try {
      const data = await loadDemoResult();
      setFile(null);
      setSelected(null);
      setApproved(false);
      setImage(null);
      setVideo({ kind: "idle" });
      setResult(data);
      setDemo(true);
      if (data.status === "ok") setStage("script");
    } catch (e) {
      setResult({ status: "error", message: e instanceof Error ? e.message : "Could not load the sample project." });
    }
  }

  function chooseScript(i: number) {
    if (selected !== i) {
      setApproved(false);
      setVideo({ kind: "idle" });
    }
    setSelected(i);
  }

  const chosen = ok && selected !== null ? ok.scripts[selected] : null;
  const step = activeStep(stage, approved, video.kind !== "idle");

  if (stage === "landing") {
    return (
      <div ref={root}>
        <Landing onStart={() => setStage("project")} />
      </div>
    );
  }

  return (
    <div ref={root} className="workspace">
      <AppHeader
        step={step}
        onHome={() => setStage("landing")}
        onStartOver={() => {
          resetJourney();
          setStage("project");
        }}
        canStartOver={!busy && (!!file || !!result || stage !== "project")}
      />
      <main className="workspace-main">
        {stage === "project" && (
          <ProjectScreen
            file={file}
            onFile={pickFile}
            buyer={buyer}
            onBuyer={setBuyer}
            busy={busy}
            uploaded={uploaded}
            onDevice={onDevice}
            pages={pages}
            seconds={seconds}
            result={result}
            onSubmit={createScripts}
            onDemo={exploreSample}
            onBack={() => setStage("landing")}
          />
        )}
        {stage === "script" && ok && (
          <ScriptStudio
            result={ok}
            demo={demo}
            selected={selected}
            onChoose={chooseScript}
            onContinue={() => selected !== null && setStage("approval")}
            onBack={() => setStage("project")}
          />
        )}
        {stage === "approval" && chosen && selected !== null && (
          <ApprovalScreen
            item={chosen}
            index={selected}
            demo={demo}
            approved={approved}
            onApprove={() => setApproved(true)}
            image={image}
            onImage={setImage}
            video={video}
            onCreateVideo={() => setVideo(startVideo())}
            onBack={() => {
              setApproved(false);
              setVideo({ kind: "idle" });
              setStage("script");
            }}
          />
        )}
      </main>
      <p className="disclaimer">
        Scripts are written by AI from your brochure. You approve what is posted and you are responsible for it under RERA Section 12. Check with your legal advisor before publishing.
      </p>
    </div>
  );
}
