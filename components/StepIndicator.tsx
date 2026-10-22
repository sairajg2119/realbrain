import { STEP_LABELS } from "@/lib/workflow";
import { IconCheck } from "./Icons";

/** 01 Project · 02 Script · 03 Approval · 04 Your Reel. Completed steps show a check. */
export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="steps" aria-label="Progress">
      {STEP_LABELS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={label} className={`step ${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="step-num" aria-hidden="true">
              {state === "done" ? <IconCheck size={14} /> : `0${i + 1}`}
            </span>
            <span className="step-label">
              {label}
              {state === "done" && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
