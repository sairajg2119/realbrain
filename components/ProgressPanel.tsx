/**
 * Honest progress: the upload is a real, separate step. After that the server reads the brochure,
 * writes the scripts and checks the numbers in ONE request, so we show that as one working stage
 * with the real elapsed time, not invented sub-steps.
 */
export function ProgressPanel({ uploaded, seconds, onDevice, pages, retrying }: { uploaded: boolean; seconds: number; onDevice?: boolean; pages?: { done: number; total: number } | null; retrying?: boolean }) {
  return (
    <section className="progress" role="status" aria-live="polite">
      <p className="eyebrow">Working on your project</p>
      <h2 className="h2">{retrying ? "The AI is busy. Trying again…" : uploaded ? "Reading your project brochure…" : onDevice ? "Reading your brochure on this device…" : "Uploading your brochure…"}</h2>
      <ol className="stages">
        <li className={uploaded ? "done" : "active"}>
          <span className="dot" aria-hidden="true">{uploaded ? "✓" : ""}</span>{onDevice ? `Reading the pages on this device${pages ? ` (${pages.done} of ${pages.total})` : ""}` : "Uploading your brochure"}
        </li>
        <li className={uploaded ? "active" : ""}>
          <span className="dot" aria-hidden="true" />Reading the details, building three script options and checking every number
        </li>
      </ol>
      <p className="hint">{seconds}s so far. This can take one to two minutes, longer when the AI is busy. Please keep this page open.</p>
    </section>
  );
}
