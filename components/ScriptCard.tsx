"use client";

import { useState } from "react";
import { normaliseNumber } from "@/lib/checks";
import { getEvidence } from "@/lib/evidence";
import type { CheckedScript } from "@/lib/types";
import { IconAlert, IconCheck, IconCopy, IconLink } from "./Icons";

/** Show text with any number that is not in the brochure highlighted in red. */
export function Marked({ text, red }: { text: string; red: Set<string> }) {
  const parts = text.split(/(\d[\d,]*(?:\.\d+)?)/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 && red.has(normaliseNumber(p)) ? (
          <mark key={i} className="red" title="This number is not in your brochure">{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard not available (for example an insecure page) */
    }
  }
  return (
    <button className="btn btn-ghost btn-sm" onClick={copy}>
      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}

/** Plain-words status for a script, from the code checks (never from the AI). */
export function scriptStatus(item: CheckedScript) {
  const { failedCodes, hardFailures } = item.checks;
  const numbersOk = !failedCodes.includes("numbers");
  const reraOk = !failedCodes.includes("rera") && !failedCodes.includes("website");
  return { ok: hardFailures.length === 0, numbersOk, reraOk };
}

export function ScriptCard({
  index,
  item,
  selected,
  onChoose,
}: {
  index: number;
  item: CheckedScript;
  selected: boolean;
  onChoose: () => void;
}) {
  const { script: s, checks } = item;
  const red = new Set(checks.redNumbers);
  const status = scriptStatus(item);
  const evidence = getEvidence(s.why_this_works.reel_id);
  const spoken = `${s.hook} ${s.body} ${s.cta}`;

  return (
    <article className={`script${selected ? " selected" : ""}${status.ok ? "" : " flagged"}`} aria-label={`Script option ${index + 1}`}>
      <div className="script-top">
        <span className="script-n">0{index + 1}</span>
        <div className="script-labels">
          <span className="label-gold">{s.format}</span>
          <span className="label-dim">{s.hook_type}</span>
        </div>
        {selected && <span className="pill good"><IconCheck size={14} /> Selected</span>}
      </div>

      <h3 className="script-hook"><Marked text={s.hook} red={red} /></h3>

      <div className="block">
        <h4>Spoken script</h4>
        <p><Marked text={s.body} red={red} /></p>
      </div>
      <div className="block">
        <h4>Call to action</h4>
        <p><Marked text={s.cta} red={red} /></p>
      </div>
      <div className="block">
        <h4>Instagram caption</h4>
        <p className="caption"><Marked text={s.caption} red={red} /></p>
      </div>

      <div className="why">
        <h4>Why this works</h4>
        <p className="why-text">&ldquo;{s.why_this_works.reason}&rdquo;</p>
        {evidence ? (
          <dl className="evidence">
            <div><dt>Source page</dt><dd>@{evidence.page}</dd></div>
            <div><dt>Recorded plays</dt><dd>{evidence.plays.toLocaleString("en-IN")}</dd></div>
            <div><dt>Versus page median</dt><dd>{evidence.multiple}×</dd></div>
            <div><a href={evidence.url} target="_blank" rel="noreferrer" className="evidence-link">View original reel <IconLink size={14} /></a></div>
          </dl>
        ) : (
          <p className="hint">Evidence unavailable: this reel is not in our dataset.</p>
        )}
      </div>

      <ul className="status" aria-label="Checks">
        {status.ok ? (
          <>
            <li className="good"><IconCheck size={15} /> Verified against brochure</li>
            <li className="good"><IconCheck size={15} /> RERA details present</li>
            <li className="good"><IconCheck size={15} /> Ready for review</li>
          </>
        ) : (
          <li className="bad"><IconAlert size={15} /> Needs attention</li>
        )}
        {checks.warnings.map((w) => (
          <li key={w} className="warn"><IconAlert size={15} /> {w}</li>
        ))}
      </ul>
      {!status.ok && (
        <div className="problem" role="note">
          {checks.hardFailures.map((f) => <p key={f}>{f}</p>)}
          {checks.redNumbers.length > 0 && <p>Numbers in <mark className="red">red</mark> above are not in your brochure, so this script cannot be used as it is.</p>}
        </div>
      )}
      {checks.rewritten && status.ok && <p className="hint">This script was rewritten once to pass the checks.</p>}

      <div className="script-actions">
        <CopyButton text={s.caption} label="Copy caption" done="Caption copied" />
        <CopyButton text={spoken} label="Copy script" done="Script copied" />
      </div>
      <button className={`btn ${selected ? "btn-good" : "btn-gold"} choose`} onClick={onChoose} disabled={!status.ok} aria-pressed={selected}>
        {selected ? <>Selected <IconCheck size={18} /></> : status.ok ? "Choose this script" : "Fix this script first"}
      </button>
    </article>
  );
}
