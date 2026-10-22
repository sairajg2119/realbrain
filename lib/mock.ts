import type { AnalyzeResponse } from "./types";

/**
 * Demo data lives here so it is easy to replace later.
 * public/_fixture.json is a saved result for the FICTIONAL sample brochure (Lakeview Residences).
 * It is shown only when the user asks for the sample, and the screens label it as a sample.
 */
export const DEMO_NOTICE = "Sample result for a fictional project. This is not your brochure.";

export async function loadDemoResult(): Promise<AnalyzeResponse> {
  const res = await fetch("/_fixture.json");
  if (!res.ok) throw new Error("Could not load the sample project. Please try again.");
  return (await res.json()) as AnalyzeResponse;
}
