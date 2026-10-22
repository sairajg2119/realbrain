"use client";

import { useState } from "react";
import { normaliseNumber } from "@/lib/checks";
import type { CheckCode, CheckedScript } from "@/lib/types";

/** Show text with any number that is not in the brochure highlighted in red. */
function Marked({ text, red }: { text: string; red: Set<string> }) {
  const parts = text.split(/(\d[\d,]*(?:\.\d+)?)/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 && red.has(normaliseNumber(p)) ? (
          <span key={i} className="red" title="This number is not in the brochure">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard not available */
    }
  }
  return (
    <button className="btn ghost small" onClick={copy}>
      {copied ? "✓ Copied" : label}
    </button>
  );
}

const CHECKS: { label: string; codes: CheckCode[] }[] = [
  { label: "RERA number and rera.karnataka.gov.in in the caption", codes: ["rera", "website"] },
  { label: "Every number matches your brochure", codes: ["numbers"] },
  { label: "Fits the video length", codes: ["length"] },
];

export function ScriptCard({
  index,
  item,
  reelUrl,
  approved,
  onApprove,
}: {
  index: number;
  item: CheckedScript;
  reelUrl?: string;
  approved: boolean;
  onApprove: () => void;
}) {
  const { script: s, checks } = item;
  const red = new Set(checks.redNumbers);
  const spoken = `${s.hook}\n\n${s.body}\n\n${s.cta}`;

  return (
    <article className={`card script${approved ? " approved" : ""}`}>
      <div className="script-head">
        <span className="n">Script {index + 1}</span>
        <span className="badge">{s.hook_type}</span>
        <span className="badge">about {s.target_duration_s} sec</span>
      </div>

      <div className="label">Hook · the first 3 seconds</div>
      <p className="hook">
        <Marked text={s.hook} red={red} />
      </p>

      <div className="label">What the presenter says</div>
      <p>
        <Marked text={s.body} red={red} />
      </p>

      <div className="label">Call to action</div>
      <p>
        <Marked text={s.cta} red={red} />
      </p>

      <div className="label">Caption to post</div>
      <div className="caption">
        <Marked text={s.caption} red={red} />
      </div>

      <div className="actions">
        <CopyButton text={spoken} label="Copy script" />
        <CopyButton text={s.caption} label="Copy caption" />
      </div>

      <div className="checks" aria-label="Checks">
        {CHECKS.map((c) => {
          const failed = c.codes.some((code) => checks.failedCodes.includes(code));
          return (
            <div key={c.label} className={failed ? "no" : "ok"}>
              {failed ? "✕" : "✓"} {c.label}
            </div>
          );
        })}
        {checks.hardFailures.map((f) => (
          <div key={f} className="no">
            {f}
          </div>
        ))}
        {checks.warnings.map((w) => (
          <div key={w} className="warn">
            ⚠ {w}
          </div>
        ))}
        {checks.rewritten && !checks.hardFailures.length && <div className="hint">This script was rewritten once to pass the checks.</div>}
      </div>

      <div className="why">
        <strong>Why this works</strong>
        {s.why_this_works.reason}{" "}
        <span className="hint">
          A similar reel by @{s.why_this_works.page} got {s.why_this_works.multiple_vs_median}× that page's usual views.
        </span>
        {reelUrl && (
          <>
            {" "}
            <a href={reelUrl} target="_blank" rel="noreferrer">
              Watch that reel ↗
            </a>
          </>
        )}
      </div>

      <button className={`btn${approved ? " good" : ""}`} onClick={onApprove} disabled={approved}>
        {approved ? "✓ Approved" : "Approve this script"}
      </button>
    </article>
  );
}
