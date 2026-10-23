import { STEP_LABELS } from "@/lib/workflow";
import { IconCheck } from "./Icons";

/**
 * 01 Project · 02 Script · 03 Approval · 04 Your Reel. Each is a place further down the same page: a click scrolls to it.
 * A step opens only when the one before it is done; done steps show a check; the step on screen is marked.
 */
export function StepIndicator({ progress, view, onGo }: { progress: boolean[]; view: number; onGo: (i: number) => void }) {
  return (
    <ol className="steps" aria-label="Progress">
      {STEP_LABELS.map((label, i) => {
        const open = i === 0 || progress[i - 1];
        const done = progress[i];
        const state = view === i ? "current" : done ? "done" : "todo";
        return (
          <li key={label}>
            <button type="button" className={`step ${state}${open ? "" : " locked"}`} disabled={!open} aria-current={view === i ? "step" : undefined} onClick={() => onGo(i)}>
              <span className="step-num" aria-hidden="true">{done && view !== i ? <IconCheck size={14} /> : `0${i + 1}`}</span>
              <span className="step-label">
                {label}
                {done && <span className="sr-only"> (done)</span>}
                {!open && <span className="sr-only"> (locked)</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
