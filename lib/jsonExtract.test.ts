import test from "node:test";
import assert from "node:assert/strict";
import { extractFirstJsonObject, parseModelJson } from "./jsonExtract.ts";

test("clean JSON parses as it is", () => {
  assert.deepEqual(parseModelJson('{"a":1,"b":[1,2]}'), { a: 1, b: [1, 2] });
});

test("a code fence and a sentence around the JSON are ignored", () => {
  assert.deepEqual(parseModelJson('Here you go:\n```json\n{"a":1}\n```'), { a: 1 });
});

test("text after the object is ignored (the failure seen in production: non-whitespace after JSON)", () => {
  assert.deepEqual(parseModelJson('{"scripts":[{"hook":"x"}]}\n}\nNote: done'), { scripts: [{ hook: "x" }] });
});

test("a second object after the first is ignored", () => {
  assert.deepEqual(parseModelJson('{"a":1}\n{"a":2}'), { a: 1 });
});

test("braces and quotes inside strings do not end the object early", () => {
  const s = '{"line":"say } and { then \\"quote\\" done","n":2} trailing }';
  assert.deepEqual(parseModelJson(s), { line: 'say } and { then "quote" done', n: 2 });
});

test("nested objects are matched to their own braces", () => {
  assert.equal(extractFirstJsonObject('x {"a":{"b":{"c":1}},"d":2} y {"z":1}'), '{"a":{"b":{"c":1}},"d":2}');
});

test("a reply cut off before the object closes is an error, not a guess", () => {
  assert.equal(extractFirstJsonObject('{"a":[1,2,'), null);
  assert.throws(() => parseModelJson('{"a":[1,2,'), /no complete JSON/);
});

test("a reply with no object is an error", () => {
  assert.throws(() => parseModelJson("I cannot help with that."), /no complete JSON/);
});
