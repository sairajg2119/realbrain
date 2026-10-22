import test from "node:test";
import assert from "node:assert/strict";
import { classifyAiError, ModelPool } from "./aiPool.ts";

const api = (status: number, message = "x") => Object.assign(new Error(message), { status });

test("classify: quota, busy, server errors, key problems", () => {
  assert.equal(classifyAiError(api(429)), "rate_limit");
  assert.equal(classifyAiError(api(503)), "transient");
  assert.equal(classifyAiError(api(500)), "transient");
  assert.equal(classifyAiError(api(504)), "transient");
  assert.equal(classifyAiError(api(404)), "gone");
  assert.equal(classifyAiError(api(401)), "setup");
  assert.equal(classifyAiError(api(403)), "setup");
  assert.equal(classifyAiError(api(400, "API key not valid")), "setup");
  assert.equal(classifyAiError(api(400, "thinking level not supported")), "thinking");
  assert.equal(classifyAiError(api(400, "invalid argument")), "fatal");
});

test("classify: timeouts and dropped connections are not fatal", () => {
  assert.equal(classifyAiError(Object.assign(new Error("The operation was aborted"), { name: "TimeoutError" })), "timeout");
  assert.equal(classifyAiError(Object.assign(new Error("x"), { name: "AbortError" })), "timeout");
  assert.equal(classifyAiError(new TypeError("fetch failed")), "transient");
  assert.equal(classifyAiError(new Error("read ECONNRESET")), "transient");
  assert.equal(classifyAiError(new Error("something else")), "fatal");
  assert.equal(classifyAiError(null), "fatal");
});

test("pool: uses the first model, and moves on when it rests", () => {
  let now = 1000;
  const p = new ModelPool(["a", "b", "c"], () => now);
  assert.equal(p.current(), "a");
  p.cool("a", 60_000);
  assert.equal(p.current(), "b");
  p.cool("b", 60_000);
  assert.equal(p.current(), "c");
});

test("pool: a rested model comes back after its time", () => {
  let now = 0;
  const p = new ModelPool(["a", "b"], () => now);
  p.cool("a", 1000);
  assert.equal(p.current(), "b");
  now = 1001;
  assert.equal(p.current(), "a");
});

test("pool: when every model is resting it picks the one that recovers soonest, and reports the wait", () => {
  let now = 0;
  const p = new ModelPool(["a", "b", "c"], () => now);
  p.cool("a", 5000);
  p.cool("b", 2000);
  p.cool("c", 9000);
  assert.equal(p.allCooling(), true);
  assert.equal(p.current(), "b");
  assert.equal(p.waitMs(), 2000);
  now = 2500;
  assert.equal(p.allCooling(), false);
  assert.equal(p.waitMs(), 0);
});

import { rateLimitRestMs } from "./aiPool.ts";
test("rate limit rest: a daily quota rests an hour, a per-minute limit waits the seconds it names", () => {
  assert.equal(rateLimitRestMs(new Error("Quota exceeded: GenerateRequestsPerDayPerProjectPerModel-FreeTier")), 60 * 60_000);
  assert.equal(rateLimitRestMs(new Error('{"details":[{"retryDelay":"22s"}]}')), 23_000);
  assert.equal(rateLimitRestMs(new Error("Please retry in 8.2s.")), 9_200);
  assert.equal(rateLimitRestMs(new Error("RESOURCE_EXHAUSTED")), 31_000, "no hint: about half a minute");
  assert.equal(rateLimitRestMs(new Error('"retryDelay": "900s"')), 120_000, "capped");
  assert.equal(rateLimitRestMs(null), 31_000);
});
