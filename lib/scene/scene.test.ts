import test from "node:test";
import assert from "node:assert/strict";
import { hexToRgb, LIGHTS, lightById, mixHex, mixLight, rgbToHex } from "./timeOfDay.ts";
import { cameraAt, DOOR, distanceToDoor, introProgress, portraitScale } from "./cameraPath.ts";

test("four moods of light, from morning to night, each with a clock", () => {
  assert.deepEqual(LIGHTS.map((l) => l.id), ["morning", "golden", "dusk", "night"]);
  assert.ok(LIGHTS.every((l) => /^\d{1,2}:\d{2} (am|pm)$/.test(l.clock)));
});

test("the house glows more as the day darkens, and stars appear only late", () => {
  const g = LIGHTS.map((l) => l.glow);
  for (let i = 1; i < g.length; i++) assert.ok(g[i] > g[i - 1], "glow rises through the day");
  assert.equal(lightById("morning").stars, 0);
  assert.equal(lightById("night").stars, 1);
  assert.ok(lightById("night").sunIntensity < lightById("golden").sunIntensity);
});

test("hex colours convert both ways and mix at the midpoint", () => {
  assert.deepEqual(hexToRgb("#ff8000"), [255, 128, 0]);
  assert.deepEqual(hexToRgb("#fff"), [255, 255, 255]);
  assert.equal(rgbToHex([255, 128, 0]), "#ff8000");
  assert.equal(mixHex("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(mixHex("#102030", "#102030", 0.7), "#102030");
});

test("mixing two moods returns the ends exactly and blends in between", () => {
  const a = lightById("golden");
  const b = lightById("night");
  assert.deepEqual(mixLight(a, b, 0), { ...a });
  assert.equal(mixLight(a, b, 1).skyTop, b.skyTop);
  const mid = mixLight(a, b, 0.5);
  assert.ok(mid.glow > a.glow && mid.glow < b.glow);
  assert.ok(mid.exposure > a.exposure && mid.exposure < b.exposure);
  assert.equal(mixLight(a, b, -3).glow, a.glow, "t is clamped");
  assert.equal(mixLight(a, b, 9).glow, b.glow);
});

test("the camera starts far and low-wide, and ends at the front door", () => {
  const start = cameraAt(0);
  const end = cameraAt(1);
  assert.deepEqual(start.pos, [-30, 11, 52]);
  assert.ok(distanceToDoor(end) < 10, "ends within a few metres of the door");
  assert.ok(distanceToDoor(start) > 45);
  assert.equal(end.look[0], DOOR[0]);
});

test("the camera only ever moves closer to the door, with no jumps", () => {
  let prev = distanceToDoor(cameraAt(0));
  let prevPos = cameraAt(0).pos;
  for (let i = 1; i <= 400; i++) {
    const p = cameraAt(i / 400);
    const d = distanceToDoor(p);
    assert.ok(d <= prev + 1e-9, `closer at step ${i}`);
    assert.ok(Math.hypot(p.pos[0] - prevPos[0], p.pos[1] - prevPos[1], p.pos[2] - prevPos[2]) < 2.2, "no sudden jump");
    assert.ok(p.pos[1] > 1, "stays above the ground");
    prev = d;
    prevPos = p.pos;
  }
});

test("progress outside 0 to 1 is clamped", () => {
  assert.deepEqual(cameraAt(-5), cameraAt(0));
  assert.deepEqual(cameraAt(9), cameraAt(1));
});

test("portrait screens stand the camera further back, landscape ones do not", () => {
  assert.equal(portraitScale(1.78), 1);
  assert.equal(portraitScale(1), 1);
  assert.ok(portraitScale(0.46) > 1.4);
});

test("the intro drift eases out: fast first, then settling at its target", () => {
  assert.equal(introProgress(0), 0);
  assert.ok(introProgress(3) > introProgress(0));
  assert.equal(introProgress(18), 0.34);
  assert.equal(introProgress(99), 0.34);
  const first = introProgress(2) - introProgress(0);
  const last = introProgress(18) - introProgress(16);
  assert.ok(first > last * 3, "moves faster at the start than the end");
});
