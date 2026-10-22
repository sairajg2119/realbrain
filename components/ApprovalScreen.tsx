"use client";

import { useEffect, useState } from "react";
import type { CheckedScript } from "@/lib/types";
import type { VideoState } from "@/lib/video";
import { MAX_IMAGE_BYTES } from "@/lib/workflow";
import { needsAcknowledgement } from "@/lib/compliance";
import { DEMO_NOTICE } from "@/lib/mock";
import { IconAlert, IconBack, IconCheck } from "./Icons";
import { ComplianceNotes } from "./ComplianceNotes";
import { scriptAsText } from "@/lib/script";
import { CopyButton, FullScript } from "./ScriptCard";
import { UploadZone } from "./UploadZone";
import { VideoPanel } from "./VideoPanel";

/** The honest life of a script, in order. Failed appears only when something failed. */
function Timeline({ approved, video }: { approved: boolean; video: VideoState }) {
  const rendering = video.kind === "rendering";
  const ready = video.kind === "ready";
  const failed = video.kind === "failed";
  const steps = [
    { label: "Selected", on: true },
    { label: "Approved", on: approved },
    { label: "Rendering", on: rendering || ready || failed, now: rendering },
    { label: failed ? "Failed" : "Ready", on: ready || failed, bad: failed },
  ];
  return (
    <ol className="timeline" aria-label="Status of your script">
      {steps.map((s) => (
        <li key={s.label} className={`${s.on ? "on" : ""}${s.bad ? " bad" : ""}${s.now ? " now" : ""}`} aria-current={s.now ? "step" : undefined}>
          {s.on && !s.now && !s.bad && <IconCheck size={13} />} {s.label}
        </li>
      ))}
    </ol>
  );
}

export function ApprovalScreen({
  item,
  index,
  demo,
  approved,
  onApprove,
  image,
  onImage,
  video,
  onCreateVideo,
  onBack,
}: {
  item: CheckedScript;
  index: number;
  demo: boolean;
  approved: boolean;
  onApprove: () => void;
  image: File | null;
  onImage: (f: File | null) => void;
  video: VideoState;
  onCreateVideo: () => void;
  onBack: () => void;
}) {
  const { script: s, checks } = item;
  const red = new Set(checks.redNumbers);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const mustAck = needsAcknowledgement(item.compliance);
  useEffect(() => {
    if (!image) return setImageUrl(null);
    const u = URL.createObjectURL(image);
    setImageUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [image]);

  const canCreate = approved && !!image && video.kind === "idle";
  const started = video.kind !== "idle";

  return (
    <div className="screen">
      <button className="back" onClick={onBack} disabled={video.kind === "rendering"}>
        <IconBack size={16} /> Choose a different script
      </button>
      <p className="eyebrow">03 · Approval</p>
      <h1 className="display display-md" data-focus>Your story. Ready for the spotlight.</h1>
      <p className="screen-lead">Review your chosen script, add your project visual, and bring it to life.</p>

      {demo && <div className="banner info" role="note"><IconAlert size={18} /><span><strong>Sample project.</strong> {DEMO_NOTICE}</span></div>}
      <Timeline approved={approved} video={video} />

      <div className="approval-grid">
        <article className="review" aria-label="Your chosen script">
          <div className="script-top">
            <span className="script-n">0{index + 1}</span>
            <div className="script-labels">
              <span className="label-gold">{s.format}</span>
              <span className="label-dim">{s.hook_type}</span>
            </div>
          </div>
          <h2 className="script-hook">{s.hook}</h2>
          <FullScript s={s} red={red} />
          <CopyButton text={scriptAsText(s)} label="Copy full script" done="Script copied" />
          <ComplianceNotes item={item} open />
        </article>

        <div className="approval-side">
          <section className="panel" aria-labelledby="approve-title">
            <h2 id="approve-title" className="h3">1. Approve your script</h2>
            <p className="hint">Under RERA Section 12 you are responsible for what is posted. Read every number before you approve.</p>
            {!approved && mustAck && (
              <label className="ack">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                <span>I have checked the compliance notes with the project documents or my legal advisor.</span>
              </label>
            )}
            {approved ? (
              <p className="pill good approved-pill"><IconCheck size={14} /> Script approved</p>
            ) : (
              <button className="btn btn-gold btn-lg full" onClick={onApprove} disabled={mustAck && !ack}>Approve this script</button>
            )}
          </section>

          <section className={`panel${approved ? "" : " locked"}`} aria-labelledby="visual-title" aria-disabled={!approved}>
            <h2 id="visual-title" className="h3">2. Give your reel its visual identity</h2>
            <p className="hint">Upload a render of your project to use as the video background.</p>
            {approved ? (
              <>
                <UploadZone kind="image" file={image} maxBytes={MAX_IMAGE_BYTES} onChange={onImage} disabled={started} />
                {!started && (
                  <button className="btn btn-gold btn-lg full" onClick={onCreateVideo} disabled={!canCreate}>
                    Create my video
                  </button>
                )}
                {!started && !image && <p className="hint">Add a render to continue.</p>}
              </>
            ) : (
              <p className="locked-note">Approve your script first to unlock this step.</p>
            )}
          </section>
        </div>
      </div>

      <VideoPanel state={video} imageUrl={imageUrl} caption={s.caption} hook={s.hook} onScreen={s.on_screen} onRetry={onCreateVideo} />
    </div>
  );
}
