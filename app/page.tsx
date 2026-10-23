"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ApprovalScreen } from "@/components/ApprovalScreen";
import { HouseStage, type SceneState } from "@/components/HouseStage";
import { Landing } from "@/components/Landing";
import { ProjectScreen } from "@/components/ProjectScreen";
import { ScriptStudio } from "@/components/ScriptStudio";
import { loadDemoResult } from "@/lib/mock";
import { extractPdfText } from "@/lib/pdftext";
import type { LightId } from "@/lib/scene/timeOfDay";
import type { AnalyzeResponse, BuyerChoice } from "@/lib/types";
import { startVideo, type VideoState } from "@/lib/video";
import { activeStep, SERVER_PDF_BYTES, type Stage } from "@/lib/workflow";

const DIRECT_LIMIT = 4 * 1024 * 1024; // what we can send through the server without Blob

export default function Home() {
  const [stage, setStage] = useState<Stage>("landing");
  // The house: outside (garden, front door), entering (the walk through the door), inside (the hall, kept behind the workspace).
  const [phase, setPhase] = useState<"outside" | "entering" | "inside">("outside");
  const [light, setLight] = useState<LightId>("golden");
  const [scene, setScene] = useState<SceneState>("pending");
  const [still, setStill] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [buyer, setBuyer] = useState<BuyerChoice>("auto");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [onDevice, setOnDevice] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [pages, setPages] = useState<{ done: number; total: number } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [demo, setDemo] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [approved, setApproved] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<VideoState>({ kind: "idle" });
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
    setNotes("");
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
        return fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, buyer, notes }) });
      }
      // One send, as a function, so it can be repeated if the AI service is busy.
      const send = async (): Promise<Response> => {
        if (file.size > SERVER_PDF_BYTES) return viaText();
        try {
          const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload" });
          setUploaded(true);
          return await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfUrl: blob.url, buyer, notes }),
          });
        } catch {
          // No Blob store: small files go straight to the server, bigger ones are read on the device.
          if (file.size > DIRECT_LIMIT) return viaText();
          setUploaded(true);
          const form = new FormData();
          form.set("file", file);
          form.set("buyer", buyer);
          form.set("notes", notes);
          return fetch("/api/analyze", { method: "POST", body: form });
        }
      };
      let res = await send();
      // 503 = every AI model was overloaded. Wait a moment and try once more before showing an error.
      if (res.status === 503) {
        setRetrying(true);
        await new Promise((r) => setTimeout(r, 12_000));
        res = await send();
        setRetrying(false);
      }
      const data = (await res.json()) as AnalyzeResponse;
      setResult(data);
      if (data.status === "ok") setStage("script");
    } catch (e) {
      setResult({ status: "error", message: e instanceof Error ? e.message : "Something went wrong. Please try again." });
    } finally {
      setRetrying(false);
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

  const stageEl = (
    <HouseStage
      light={light}
      phase={stage === "landing" ? phase : "inside"}
      still={still}
      calm={stage !== "landing"}
      scene={scene}
      onScene={setScene}
      onArrive={() => setPhase("inside")}
    />
  );

  if (stage === "landing") {
    return (
      <div ref={root} className="app-root">
        {stageEl}
        <div className="app-layer">
          <Landing
            phase={phase}
            light={light}
            onLight={setLight}
            scene={scene}
            onEnter={() => (still ? setPhase("inside") : setPhase("entering"))}
            onSkip={() => setPhase("inside")}
            onStart={() => setStage("project")}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={root} className="workspace" data-scene={scene}>
      {stageEl}
      <AppHeader
        step={step}
        onHome={() => { setPhase("inside"); setStage("landing"); }}
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
            notes={notes}
            onNotes={setNotes}
            busy={busy}
            uploaded={uploaded}
            onDevice={onDevice}
            retrying={retrying}
            pages={pages}
            seconds={seconds}
            result={result}
            onSubmit={createScripts}
            onDemo={exploreSample}
            onBack={() => { setPhase("inside"); setStage("landing"); }}
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
