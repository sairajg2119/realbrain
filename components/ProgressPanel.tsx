const STAGES = ["Uploading your brochure", "Reading the brochure", "Writing three scripts", "Checking every number against your brochure"];

/** stage: index of the stage currently running. */
export function ProgressPanel({ stage, seconds }: { stage: number; seconds: number }) {
  return (
    <section className="card progress" role="status" aria-live="polite">
      <strong>Working on it…</strong>
      <ol>
        {STAGES.map((label, i) => (
          <li key={label} className={i < stage ? "done" : i === stage ? "active" : ""}>
            <span className="dot" aria-hidden="true">{i < stage ? "✓" : ""}</span>
            {label}
          </li>
        ))}
      </ol>
      <span className="hint">
        {seconds}s so far. This usually takes 20 to 60 seconds. Please keep this page open.
      </span>
    </section>
  );
}
