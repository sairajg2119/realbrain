/** Checks for brochure text sent from the browser when the PDF itself is too big to upload. */

/** Fewer characters than this almost always means a scanned PDF (pictures of pages) with no real text. */
export const MIN_TEXT_CHARS = 400;
/** A very long document is cut here. 400,000 characters is several hundred pages of text. */
export const MAX_TEXT_CHARS = 400_000;

export const NO_TEXT_MESSAGE =
  "This PDF has almost no readable text. It may be made of scanned pictures of pages. Please upload a version with selectable text, or a PDF under 4 MB so the pages can be read as images.";

/** Tidy text pulled from a PDF: no null bytes, no runs of spaces, no long gaps. */
export function cleanPdfText(s: string): string {
  return s.replace(/\u0000/g, "").replace(/[ \t\f\v]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type TextCheck = { ok: true; text: string; truncated: boolean } | { ok: false; error: string };

export function validateBrochureText(raw: unknown): TextCheck {
  if (typeof raw !== "string") return { ok: false, error: "No brochure text received." };
  const text = cleanPdfText(raw);
  if (text.length < MIN_TEXT_CHARS) return { ok: false, error: NO_TEXT_MESSAGE };
  if (text.length > MAX_TEXT_CHARS) return { ok: true, text: text.slice(0, MAX_TEXT_CHARS), truncated: true };
  return { ok: true, text, truncated: false };
}

/** Shown to the person whenever a brochure was read from its text only. */
export const TEXT_ONLY_NOTE =
  "This brochure was too large to upload, so it was read from its text only. Floor-plan drawings and pictures were not read. Please check areas and unit types against your plans.";
