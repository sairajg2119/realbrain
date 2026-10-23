"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ApprovalScreen } from "@/components/ApprovalScreen";
import { Landing } from "@/components/landing/Landing";
import { ProjectScreen } from "@/components/ProjectScreen";
import { ScriptStudio } from "@/components/ScriptStudio";
import { loadDemoResult } from "@/lib/mock";
import { extractPdfText } from "@/lib/pdftext";
import type { AnalyzeResponse, BuyerChoice } from "@/lib/types";
import { startVideo, type VideoState } from "@/lib/video";
import { SERVER_PDF_BYTES, type Stage } from "@/lib/workflow";

const DIRECT_LIMIT = 4 * 1024 * 1024; // what we can send through the server without Blob

export default function Home() {
  const [stage, setStage] = useState<Stage>("landing");
  const [still, setStill] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [buyers, setBuyers] = useState<BuyerChoice[]>(["auto"]);
  const buyer = buyers.join(","); // the server reads "family,investor" as a mix
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
  const [view, setView] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Which step of the workspace is on screen, for the step bar.
  useEffect(() => {
    if (stage === "landing") return;
    const ids = ["ws-project", "ws-script", "ws-approval"];
    const onScroll = () => {
      let v = 0;
      ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) v = i;
      });
      const reel = document.querySelector(".video-panel");
      if (reel && reel.getBoundingClientRect().top < window.innerHeight * 0.5) v = 3;
      setView(v);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [stage]);

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
    setBuyers(["auto"]);
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
      if (data.status === "ok") reveal("ws-script");
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
      setStage("project");
      if (data.status === "ok") reveal("ws-script");
    } catch (e) {
      setResult({ status: "error", message: e instanceof Error ? e.message : "Could not load the sample project." });
    }
  }

  /** Once a step unlocks, bring it into view: the workspace is one page that grows downwards as the work is done. */
  function reveal(id: string) {
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" }), 140);
  }

  function chooseScript(i: number) {
    if (selected !== i) {
      setApproved(false);
      setVideo({ kind: "idle" });
    }
    setSelected(i);
  }

  const chosen = ok && selected !== null ? ok.scripts[selected] : null;
  // What is done: the project (scripts exist), the script (one chosen), the approval, the reel (a video exists).
  const progress = [!!ok, selected !== null, approved, video.kind === "ready"];

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
        progress={progress}
        view={view}
        onGo={(i) => reveal(WS_IDS[i])}
        onHome={() => setStage("landing")}
        onStartOver={() => {
          resetJourney();
          reveal("ws-project");
        }}
        canStartOver={!busy && (!!file || !!result)}
      />
      <main className="workspace-main">
        <section id="ws-project" className="ws-sec">
          <ProjectScreen
            file={file}
            onFile={pickFile}
            buyers={buyers}
            onBuyers={setBuyers}
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
            onBack={() => setStage("landing")}
          />
        </section>

        <section id="ws-script" className="ws-sec">
          {ok ? (
            <ScriptStudio
              result={ok}
              demo={demo}
              selected={selected}
              onChoose={chooseScript}
              onContinue={() => selected !== null && reveal("ws-approval")}
              onBack={() => reveal("ws-project")}
              hideBar={view >= 2}
            />
          ) : (
            <Locked n="02" title="Script studio" text="Your scripts appear here, right below, once your brochure has been read. Add it above and press Create scripts." />
          )}
        </section>

        <section id="ws-approval" className="ws-sec">
          {chosen && selected !== null ? (
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
              onBack={() => reveal("ws-script")}
            />
          ) : (
            <Locked n="03" title="Approval and your reel" text={ok ? "Choose one of the scripts above. It opens here for your review, and your reel follows once you approve it." : "This opens once you have scripts and have chosen one."} />
          )}
        </section>
      </main>
      <p className="disclaimer">
        Scripts are written by AI from your brochure. You approve what is posted and you are responsible for it under RERA Section 12. Check with your legal advisor before publishing.
      </p>
    </div>
  );
}

const WS_IDS = ["ws-project", "ws-script", "ws-approval", "ws-reel"];

/** A step that is not open yet: what will be here, and what opens it. */
function Locked({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="locked-sec" aria-disabled="true">
      <span className="locked-ico" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
      </span>
      <p className="eyebrow">{n} · {title}</p>
      <p className="locked-text">{text}</p>
    </div>
  );
}
