import type { BuyerChoice } from "./types";

/** The four screens of the journey. Landing is not a numbered step. */
export type Stage = "landing" | "project" | "script" | "approval";

/** Labels for the numbered step indicator. */
export const STEP_LABELS = ["Project", "Script", "Approval", "Your Reel"] as const;

export const BUYER_COPY: Record<BuyerChoice, { label: string; blurb: string }> = {
  auto: { label: "Best fit", blurb: "We pick the audiences this property suits best. Recommended." },
  family: { label: "Families", blurb: "Space, lifestyle and a place to grow." },
  investor: { label: "Investors", blurb: "Property fundamentals and documented market context." },
  nri: { label: "NRI Buyers", blurb: "Clarity, confidence and remote decision-making." },
  "first-time buyer": { label: "First-time Buyers", blurb: "Understand the essentials and make an informed decision." },
};

/** What the browser accepts. Files up to 4 MB go to the server as PDFs (20 MB with Blob); bigger ones are read in the browser and only their text is sent. */
export const MAX_PDF_BYTES = 150 * 1024 * 1024;
export const SERVER_PDF_BYTES = 20 * 1024 * 1024; // the server's own PDF limit
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function formatSize(bytes: number): string {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Which step of the indicator is active for the current screen. */
export function activeStep(stage: Stage, approved: boolean, videoStarted: boolean): number {
  if (stage === "landing" || stage === "project") return 0;
  if (stage === "script") return 1;
  return approved && videoStarted ? 3 : 2;
}
