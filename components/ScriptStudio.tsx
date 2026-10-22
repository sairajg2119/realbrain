"use client";

import type { AnalyzeResponse } from "@/lib/types";
import { DEMO_NOTICE } from "@/lib/mock";
import { BriefPanel } from "./BriefPanel";
import { FactsCard } from "./FactsCard";
import { ScriptCard } from "./ScriptCard";
import { IconAlert, IconArrow, IconBack } from "./Icons";

type Ok = Extract<AnalyzeResponse, { status: "ok" }>;

export function ScriptStudio({
  result,
  demo,
  selected,
  onChoose,
  onContinue,
  onBack,
}: {
  result: Ok;
  demo: boolean;
  selected: number | null;
  onChoose: (i: number) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="screen">
      <button className="back" onClick={onBack}>
        <IconBack size={16} /> Back to your project
      </button>
      <p className="eyebrow">02 · Script studio</p>
      <h1 className="display display-md" data-focus>Three ways to tell your project&apos;s story.</h1>
      <p className="screen-lead">Each script takes a different creative angle. Choose the one that best fits your buyer.</p>

      {demo && <div className="banner info" role="note"><IconAlert size={18} /><span><strong>Sample project.</strong> {DEMO_NOTICE}</span></div>}
      {result.rulesStale && <div className="banner warn" role="note"><IconAlert size={18} /><span>Compliance rules need re-checking. Please check with your legal advisor before posting.</span></div>}
      {result.notes.map((n) => (
        <div key={n} className="banner warn" role="note"><IconAlert size={18} /><span>{n}</span></div>
      ))}

      <FactsCard facts={result.facts} />
      {result.brief && <BriefPanel brief={result.brief} />}

      <div className="scripts">
        {result.scripts.map((item, i) => (
          <ScriptCard key={i} index={i} item={item} selected={selected === i} onChoose={() => onChoose(i)} />
        ))}
      </div>

      <div className={`action-bar${selected !== null ? " show" : ""}`}>
        <div className="action-bar-in">
          <p>{selected !== null ? <>Script <strong>0{selected + 1}</strong> is selected. Nothing is created until you approve it.</> : "Choose a script to continue."}</p>
          <button className="btn btn-gold btn-lg" onClick={onContinue} disabled={selected === null}>
            Continue to approval <IconArrow size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
