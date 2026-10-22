"use client";

import type { VideoState } from "@/lib/video";
import { CopyButton } from "./ScriptCard";
import { IconAlert } from "./Icons";

/**
 * Shows the honest state of the video. A real <video> appears only when a provider
 * returned one ("ready"). "preview" is used while no avatar provider is connected.
 */
export function VideoPanel({
  state,
  imageUrl,
  caption,
  hook,
  onRetry,
}: {
  state: VideoState;
  imageUrl: string | null;
  caption: string;
  hook: string;
  onRetry: () => void;
}) {
  if (state.kind === "idle") return null;

  if (state.kind === "rendering") {
    return (
      <section className="video-panel" role="status" aria-live="polite">
        <p className="eyebrow">Rendering</p>
        <h2 className="h2">Your video is being created.</h2>
        <div className={`bar${state.progress === null ? " indeterminate" : ""}`} aria-hidden="true">
          <div style={state.progress === null ? undefined : { width: `${state.progress}%` }} />
        </div>
        <p className="hint">This can take several minutes. You can leave this page open. There is no need to click again.</p>
      </section>
    );
  }

  if (state.kind === "failed") {
    return (
      <section className="video-panel">
        <div className="banner error" role="alert">
          <IconAlert size={20} />
          <div>
            <strong>The video did not finish</strong>
            <p>{state.message} Your script is saved.</p>
          </div>
        </div>
        <button className="btn btn-gold" onClick={onRetry}>Try again</button>
      </section>
    );
  }

  const isReady = state.kind === "ready";
  return (
    <section className="video-panel" aria-label={isReady ? "Your video" : "Video preview"}>
      <p className="eyebrow">{isReady ? "Ready" : "Preview mode"}</p>
      {!isReady && (
        <div className="banner info" role="note">
          <IconAlert size={18} />
          <span><strong>Preview mode: avatar rendering is not connected.</strong> No video has been made. Below is what will go into your video once rendering is connected.</span>
        </div>
      )}
      <div className="video-stage">
        <div className="phone-frame">
          {isReady ? (
            <video src={state.url} controls playsInline poster={imageUrl ?? undefined} />
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Your project render, the planned video background" />
          ) : null}
          {isReady ? <span className="ai-label">AI-generated</span> : <span className="ai-label muted">Preview · not a video</span>}
          {!isReady && <p className="phone-hook">{hook}</p>}
        </div>
        <div className="video-side">
          <h3 className="h3">Caption</h3>
          <p className="caption">{caption}</p>
          <CopyButton text={caption} label="Copy caption" done="Caption copied" />
        </div>
      </div>
    </section>
  );
}
