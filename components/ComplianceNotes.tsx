import type { CheckedScript } from "@/lib/types";
import { IconAlert, IconCheck } from "./Icons";

/**
 * Compliance flags for one script: what appears on screen, what to confirm before posting, and what to ask a legal advisor.
 * Everything here comes from code (lib/compliance.ts), never from the AI. It is a flag list, not legal clearance.
 */
export function ComplianceNotes({ item, open = false }: { item: CheckedScript; open?: boolean }) {
  const c = item.compliance;
  const plan = item.script.on_screen;
  if (!c && !plan) return null;
  const count = (c?.confirm_before_posting.length ?? 0) + (c?.ask_advisor.length ?? 0);

  return (
    <details className="compliance" open={open}>
      <summary>
        <span>Compliance notes</span>
        {c ? (
          <span className={`pill ${c.blocked ? "bad" : count ? "" : "good"}`}>
            {c.blocked ? "Blocked wording" : count ? `${count} to confirm` : "No flagged claims"}
          </span>
        ) : (
          <span className="pill">Not scanned</span>
        )}
      </summary>

      {plan && (
        <div className="comp-block">
          <h4>On screen in your video</h4>
          <ul className="onscreen-list">
            {plan.lines.map((l) => <li key={l}>{l}</li>)}
          </ul>
          <p className="hint">{plan.position}. {plan.size_note}.</p>
        </div>
      )}

      {c && c.block_messages.length > 0 && (
        <div className="comp-block bad" role="note">
          <h4>Not allowed as written</h4>
          {c.block_messages.map((m) => <p key={m}><IconAlert size={14} /> {m}</p>)}
        </div>
      )}

      {c && c.confirm_before_posting.length > 0 && (
        <div className="comp-block">
          <h4>Confirm before you post</h4>
          <ul className="comp-list">
            {c.confirm_before_posting.map((f) => (
              <li key={f.claim_id}>
                <strong>{f.name}</strong>: &ldquo;{f.matched}&rdquo; in the {f.where.replace("_", " ")}.
                <span className="hint"> Needs: {f.evidence_needed} Safer: {f.safer_wording}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {c && c.ask_advisor.length > 0 && (
        <div className="comp-block">
          <h4>Questions for your legal advisor</h4>
          <ul className="comp-list">
            {c.ask_advisor.map((q) => <li key={q}>{q}</li>)}
          </ul>
        </div>
      )}

      {c && count === 0 && !c.blocked && (
        <p className="hint"><IconCheck size={14} /> No flagged claims in the text.</p>
      )}
      {c && <p className="hint comp-disclaimer">{c.disclaimer}</p>}
    </details>
  );
}
