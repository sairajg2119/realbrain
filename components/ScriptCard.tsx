"use client";

import { useState } from "react";
import { normaliseNumber } from "@/lib/checks";
import type { CheckedScript } from "@/lib/types";

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

export function ScriptCard({
  item,
  reelUrl,
  selected,
  onApprove,
}: {
  item: CheckedScript;
  reelUrl?: string;
  selected: boolean;
  onApprove: () => void;
}) {
  const { script: s, checks } = item;
  const red = new Set(checks.redNumbers);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(s.caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <article className={`card${selected ? " selected" : ""}`}>
      <span className="tag">{s.hook_type}</span> <span className="tag">{s.target_duration_s} sec</span>
      <p className="hook">
        <Marked text={s.hook} red={red} />
      </p>
      <div className="label">What the presenter says</div>
      <p style={{ margin: "4px 0" }}>
        <Marked text={s.body} red={red} />
      </p>
      <div className="label">Call to action</div>
      <p style={{ margin: "4px 0" }}>
        <Marked text={s.cta} red={red} />
      </p>
      <div className="label">Caption</div>
      <div className="caption">
        <Marked text={s.caption} red={red} />
      </div>
      <button className="btn ghost small" style={{ marginTop: 8 }} onClick={copy}>
        {copied ? "Copied" : "Copy caption"}
      </button>

      <p className="why">
        <strong>Why this works:</strong> {s.why_this_works.reason} Seen on{" "}
        {reelUrl ? (
          <a href={reelUrl} target="_blank" rel="noreferrer">
            @{s.why_this_works.page}
          </a>
        ) : (
          <>@{s.why_this_works.page}</>
        )}
        : {s.why_this_works.multiple_vs_median}× that page's usual views.
      </p>

      {checks.hardFailures.map((f) => (
        <div key={f} className="flag fail">
          ✕ {f}
        </div>
      ))}
      {checks.warnings.map((w) => (
        <div key={w} className="flag warn">
          ⚠ {w}
        </div>
      ))}
      {checks.rewritten && !checks.hardFailures.length && (
        <div className="flag" style={{ color: "var(--muted)" }}>
          This script was rewritten once to pass the checks.
        </div>
      )}

      <button className="btn" style={{ marginTop: 14 }} onClick={onApprove} disabled={selected}>
        {selected ? "Approved" : "Approve this script"}
      </button>
    </article>
  );
}
