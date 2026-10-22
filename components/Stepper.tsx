const STEPS = ["Upload brochure", "Pick a script", "Make video"];

/** current: 0, 1 or 2. Steps before it show as done. */
export function Stepper({ current }: { current: number }) {
  return (
    <ol className="stepper" aria-label="Progress">
      {STEPS.map((label, i) => (
        <li key={label} className={i < current ? "done" : i === current ? "current" : ""} aria-current={i === current ? "step" : undefined}>
          <span className="num" aria-hidden="true">{i < current ? "✓" : i + 1}</span>
          <span className="lbl">{label}</span>
        </li>
      ))}
    </ol>
  );
}
