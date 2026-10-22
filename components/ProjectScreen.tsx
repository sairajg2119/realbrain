"use client";

import type { AnalyzeResponse, BuyerType } from "@/lib/types";
import { MAX_PDF_BYTES } from "@/lib/workflow";
import { BuyerPicker } from "./BuyerPicker";
import { FactsCard } from "./FactsCard";
import { IconAlert, IconArrow, IconBack } from "./Icons";
import { ProgressPanel } from "./ProgressPanel";
import { UploadZone } from "./UploadZone";

export function ProjectScreen({
  file,
  onFile,
  buyer,
  onBuyer,
  busy,
  uploaded,
  seconds,
  result,
  onSubmit,
  onDemo,
  onBack,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  buyer: BuyerType | null;
  onBuyer: (b: BuyerType) => void;
  busy: boolean;
  uploaded: boolean;
  seconds: number;
  result: AnalyzeResponse | null;
  onSubmit: () => void;
  onDemo: () => void;
  onBack: () => void;
}) {
  if (busy) {
    return (
      <div className="screen narrow">
        <ProgressPanel uploaded={uploaded} seconds={seconds} />
      </div>
    );
  }
  const ready = !!file && !!buyer;
  return (
    <div className="screen">
      <button className="back" onClick={onBack}>
        <IconBack size={16} /> Back
      </button>
      <p className="eyebrow">01 · Your project</p>
      <h1 className="display display-md" data-focus>Let&apos;s start with your project.</h1>
      <p className="screen-lead">Upload your brochure. We&apos;ll turn the details into a story worth telling.</p>

      <div className="project-grid">
        <section aria-labelledby="up-title">
          <h2 id="up-title" className="h3">Your brochure</h2>
          <UploadZone kind="pdf" file={file} maxBytes={MAX_PDF_BYTES} onChange={onFile} />
          <p className="sample-line">
            No brochure to hand? <button className="text-btn" onClick={onDemo}>Explore with a sample project</button>
            <span className="hint"> (a fictional project, clearly labelled)</span>
          </p>

          {result && result.status !== "ok" && (
            <div className="banner error" role="alert">
              <IconAlert size={20} />
              <div>
                <strong>{result.status === "rejected" ? "We could not use this brochure" : "Something went wrong"}</strong>
                <p>{result.message}</p>
              </div>
            </div>
          )}
          {result?.status === "rejected" && result.facts && (
            <div className="rejected-facts">
              <FactsCard facts={result.facts} defaultOpen />
              <p className="hint">No scripts were written. Nothing above is used to create content.</p>
            </div>
          )}
        </section>

        <section aria-labelledby="buyer-title">
          <h2 id="buyer-title" className="h3">Who are we speaking to?</h2>
          <p className="hint buyer-hint">We&apos;ll shape the story around the buyer you want to reach.</p>
          <BuyerPicker value={buyer} onChange={onBuyer} />
          <div className="submit-row">
            <button className="btn btn-gold btn-lg" onClick={onSubmit} disabled={!ready}>
              Create my scripts <IconArrow size={18} />
            </button>
            {!ready && <p className="hint">{!file ? "Add your brochure to continue." : "Choose who you are speaking to."}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
