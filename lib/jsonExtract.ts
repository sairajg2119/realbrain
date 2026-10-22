/**
 * Pull the first complete JSON object out of a model's reply. Models sometimes wrap the JSON in a code fence, add a sentence before it,
 * or put extra text or a second object after it; any of those used to make JSON.parse fail and the whole request with it.
 * Braces inside strings are handled, so a `}` in a script line cannot end the object early.
 */
export function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null; // the reply stopped before the object was closed (cut off)
}

export function parseModelJson(text: string): unknown {
  const t = text.trim();
  try {
    return JSON.parse(t); // the normal, clean case
  } catch {
    const obj = extractFirstJsonObject(t);
    if (obj === null) throw new Error("The reply held no complete JSON object.");
    return JSON.parse(obj);
  }
}
