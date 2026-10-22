import test from "node:test";
import assert from "node:assert/strict";
import { cleanPdfText, MAX_TEXT_CHARS, MIN_TEXT_CHARS, NO_TEXT_MESSAGE, validateBrochureText } from "./textInput.ts";

const lorem = (n: number) => "Spacious 3 BHK homes in a green township. ".repeat(Math.ceil(n / 41)).slice(0, n);

test("cleaning removes null bytes, repeated spaces and long gaps", () => {
  assert.equal(cleanPdfText("a\u0000b   c\t\td\n\n\n\n\ne  \n  f"), "ab c d\n\ne\nf");
});

test("normal brochure text is accepted as it is", () => {
  const r = validateBrochureText(lorem(5000));
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.truncated, false);
    assert.ok(r.text.length > 4000);
  }
});

test("almost no text is rejected with the scanned-PDF message", () => {
  const r = validateBrochureText(lorem(MIN_TEXT_CHARS - 50));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, NO_TEXT_MESSAGE);
});

test("text that is only whitespace counts as no text", () => {
  assert.equal(validateBrochureText(" \n\n\t ".repeat(500)).ok, false);
});

test("a non-string is rejected", () => {
  assert.equal(validateBrochureText(undefined).ok, false);
  assert.equal(validateBrochureText(123).ok, false);
});

test("very long text is cut, not refused, and marked truncated", () => {
  const r = validateBrochureText(lorem(MAX_TEXT_CHARS + 5000));
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.truncated, true);
    assert.equal(r.text.length, MAX_TEXT_CHARS);
  }
});
