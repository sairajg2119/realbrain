"use client";

import type { AnalyzeResponse, BuyerChoice } from "@/lib/types";
import { Composer } from "./Composer";
import { FactsCard } from "./FactsCard";
import { IconAlert, IconBack } from "./Icons";
import { ProgressPanel } from "./ProgressPanel";

export function ProjectScreen({
  file,
  onFile,
  buyers,
  onBuyers,
  notes,
  onNotes,
  busy,
  uploaded,
  seconds,
  onDevice,
  retrying,
  pages,
  result,
  onSubmit,
  onDemo,
  onBack,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  buyers: BuyerChoice[];
  onBuyers: (b: BuyerChoice[]) => void;
  notes: string;
  onNotes: (n: string) => void;
  busy: boolean;
  uploaded: boolean;
  seconds: number;
  onDevice?: boolean;
  retrying?: boolean;
  pages?: { done: number; total: number } | null;
  result: AnalyzeResponse | null;
  onSubmit: () => void;
  onDemo: () => void;
  onBack: () => void;
}) {
  if (busy) {
    return (
      <div className="screen narrow">
        <ProgressPanel uploaded={uploaded} seconds={seconds} onDevice={onDevice} pages={pages} retrying={retrying} />
      </div>
    );
  }
  return (
    <div className="screen composer-screen">
      <button className="back" onClick={onBack}>
        <IconBack size={16} /> Back to the start
      </button>
      <p className="eyebrow">Welcome in</p>
      <h1 className="display display-md" data-focus>What are we <em>selling</em> today?</h1>
      <p className="screen-lead">Attach your brochure and tell us a little about the property if you like. We already know the market. We&apos;ll write the scripts.</p>

      <Composer file={file} onFile={onFile} notes={notes} onNotes={onNotes} buyers={buyers} onBuyers={onBuyers} onSubmit={onSubmit} />

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
    </div>
  );
}
