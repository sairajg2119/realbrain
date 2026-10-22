"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatSize } from "@/lib/workflow";
import { IconClose, IconDoc, IconImage } from "./Icons";

interface Props {
  kind: "pdf" | "image";
  file: File | null;
  maxBytes: number;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

const COPY = {
  pdf: {
    title: "Drop your project brochure here",
    hint: "PDF format · Any size, big files are read on your device",
    accept: "application/pdf,.pdf",
    wrong: "That is not a PDF. Please choose your brochure as a PDF file.",
    label: "Project brochure",
  },
  image: {
    title: "Drop a render of your project here",
    hint: "JPG, PNG or WebP · Up to 10 MB",
    accept: "image/jpeg,image/png,image/webp",
    wrong: "That is not a JPG, PNG or WebP image. Please choose a picture of your project.",
    label: "Project render",
  },
} as const;

function isAllowed(kind: "pdf" | "image", f: File): boolean {
  if (kind === "pdf") return f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
  return ["image/jpeg", "image/png", "image/webp"].includes(f.type);
}

/** Drag-and-drop or browse. Validates type and size and explains problems in plain words. */
export function UploadZone({ kind, file, maxBytes, onChange, disabled }: Props) {
  const c = COPY[kind];
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    if (kind !== "image" || !file) return setThumb(null);
    const url = URL.createObjectURL(file);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [kind, file]);

  function take(f: File | null | undefined) {
    if (!f) return;
    if (!isAllowed(kind, f)) return setError(c.wrong);
    if (f.size > maxBytes) return setError(`This file is ${formatSize(f.size)}. The limit is ${formatSize(maxBytes)}. Please choose a smaller file.`);
    setError(null);
    onChange(f);
  }

  function remove() {
    setError(null);
    onChange(null);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="upload">
      <input
        ref={input}
        id={id}
        type="file"
        className="sr-only"
        accept={c.accept}
        aria-label={c.label}
        disabled={disabled}
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {file ? (
        <div className="file-card">
          {thumb ? <img src={thumb} alt={`Preview of ${file.name}`} className="file-thumb" /> : <span className="file-icon"><IconDoc size={26} /></span>}
          <div className="file-meta">
            <strong>{file.name}</strong>
            <span>{formatSize(file.size)} · ready</span>
          </div>
          <div className="file-actions">
            <label htmlFor={id} className="text-btn" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}>
              Replace
            </label>
            <button className="icon-btn" onClick={remove} aria-label={`Remove ${file.name}`} disabled={disabled}>
              <IconClose size={18} />
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={`dropzone${drag ? " drag" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            take(e.dataTransfer.files?.[0]);
          }}
        >
          <span className="dz-icon">{kind === "pdf" ? <IconDoc size={30} /> : <IconImage size={30} />}</span>
          <span className="dz-title">{c.title}</span>
          <span className="dz-hint">{c.hint}</span>
          <span className="btn btn-ghost btn-sm dz-btn" aria-hidden="true">Browse files</span>
        </label>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
