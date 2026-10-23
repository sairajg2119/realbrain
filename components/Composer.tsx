"use client";

import { useId, useRef, useState } from "react";
import { BUYER_TYPES, type BuyerChoice } from "@/lib/types";
import { BUYER_COPY, formatSize, MAX_PDF_BYTES } from "@/lib/workflow";
import { IconArrow, IconClose, IconDoc } from "./Icons";

const CHOICES: BuyerChoice[] = ["auto", ...BUYER_TYPES];
const MAX_AUDIENCES = 3;

/** Best fit on its own, or up to three buyer types together. Choosing Best fit clears the others; clearing them all returns to Best fit. */
export function toggleAudience(current: BuyerChoice[], b: BuyerChoice): BuyerChoice[] {
  if (b === "auto") return ["auto"];
  const named = current.filter((x) => x !== "auto");
  if (named.includes(b)) {
    const left = named.filter((x) => x !== b);
    return left.length ? left : ["auto"];
  }
  return named.length >= MAX_AUDIENCES ? named : [...named, b];
}
const MAX_NOTES = 800;

function isPdf(f: File) {
  return f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
}

/**
 * The one place a job starts, laid out like a chat box: type a line or two about the property, attach the brochure,
 * choose who to speak to if you want, send. Only the brochure is needed. The notes guide emphasis and tone; they are
 * never treated as facts (the server says so to the AI as well).
 */
export function Composer({
  file,
  onFile,
  notes,
  onNotes,
  buyers,
  onBuyers,
  onSubmit,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  notes: string;
  onNotes: (n: string) => void;
  buyers: BuyerChoice[];
  onBuyers: (b: BuyerChoice[]) => void;
  onSubmit: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function take(f: File | null | undefined) {
    if (!f) return;
    if (!isPdf(f)) return setError("That is not a PDF. Please attach your brochure as a PDF file.");
    if (f.size > MAX_PDF_BYTES) return setError(`This file is ${formatSize(f.size)}. The limit is ${formatSize(MAX_PDF_BYTES)}. Please choose a smaller file.`);
    setError(null);
    onFile(f);
  }

  return (
    <form
      className={`cmp${drag ? " drag" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (file) onSubmit();
      }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
    >
      {file && (
        <div className="cmp-file">
          <span className="cmp-doc"><IconDoc size={20} /></span>
          <span className="cmp-fmeta"><strong>{file.name}</strong><span>{formatSize(file.size)} · ready</span></span>
          <button type="button" className="icon-btn" aria-label={`Remove ${file.name}`} onClick={() => { onFile(null); setError(null); }}>
            <IconClose size={18} />
          </button>
        </div>
      )}

      <label htmlFor={`${id}-notes`} className="sr-only">About the property (optional)</label>
      <textarea
        id={`${id}-notes`}
        className="cmp-text"
        rows={3}
        maxLength={MAX_NOTES}
        value={notes}
        placeholder={file ? "Anything you want us to lean on? For example: a launch for first-time buyers, play up the clubhouse. (optional)" : "Drop your brochure here, or tell me about the property. A line or two is plenty."}
        onChange={(e) => onNotes(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && file) { e.preventDefault(); onSubmit(); } }}
      />

      <div className="cmp-bar">
        <input ref={input} id={id} type="file" className="sr-only" accept="application/pdf,.pdf" aria-label="Project brochure" onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" className="cmp-attach" onClick={() => input.current?.click()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M21 11.5l-8.6 8.6a5 5 0 01-7.1-7.1l8.6-8.6a3.4 3.4 0 014.8 4.8l-8.6 8.6a1.7 1.7 0 01-2.4-2.4l7.9-7.9" /></svg>
          {file ? "Replace brochure" : "Attach brochure"}
        </button>
        <span className="cmp-count" aria-hidden="true">{notes.length > 0 ? `${notes.length}/${MAX_NOTES}` : "PDF, any size"}</span>
        <button type="submit" className="cmp-send" disabled={!file} aria-label="Create my scripts">
          <span>Create scripts</span> <IconArrow size={18} />
        </button>
      </div>

      <div className="cmp-aud" role="group" aria-label="Who should the scripts speak to? Choose Best fit, or up to three.">
        <span className="cmp-aud-l">Speak to</span>
        {CHOICES.map((b) => {
          const on = buyers.includes(b);
          const full = !on && b !== "auto" && buyers.filter((x) => x !== "auto").length >= MAX_AUDIENCES;
          return (
            <button key={b} type="button" aria-pressed={on} className="cmp-chip" title={BUYER_COPY[b].blurb} disabled={full} onClick={() => onBuyers(toggleAudience(buyers, b))}>
              {on && b !== "auto" && <span aria-hidden="true">✓ </span>}{BUYER_COPY[b].label}
            </button>
          );
        })}
        <span className="cmp-aud-hint">{buyers.includes("auto") ? "We choose the audiences this property suits." : buyers.length > 1 ? "Scripts will be written across these buyers." : "All three scripts for this buyer."}</span>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      {!file && <p className="hint cmp-need">Add your brochure to continue. The audience stays on Best fit unless you choose up to three.</p>}
    </form>
  );
}
