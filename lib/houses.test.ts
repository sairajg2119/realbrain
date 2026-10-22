import test from "node:test";
import assert from "node:assert/strict";
import { advance, greeting, houseCount, makeHouses, mulberry32, speedMultiplier, sway } from "./houses.ts";

test("the random generator is deterministic and in range", () => {
  const a = mulberry32(7);
  const b = mulberry32(7);
  for (let i = 0; i < 50; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test("house count shrinks on small screens", () => {
  assert.ok(houseCount(390) < houseCount(700));
  assert.ok(houseCount(700) < houseCount(1440));
  assert.ok(houseCount(1440) >= 200, "hundreds of houses on desktop");
});

test("houses are scattered across the screen with depth, sorted far to near", () => {
  const hs = makeHouses(260, 1440, 900, 24, mulberry32(1));
  assert.equal(hs.length, 260);
  for (let i = 1; i < hs.length; i++) assert.ok(hs[i].z >= hs[i - 1].z);
  assert.ok(hs.every((h) => h.x >= 0 && h.x <= 1440 && h.y >= 0 && h.y <= 900));
  assert.ok(hs.every((h) => h.sprite >= 0 && h.sprite < 24));
});

test("depth changes size, opacity and speed: near is larger, brighter and faster than far", () => {
  const hs = makeHouses(400, 1440, 900, 24, mulberry32(2));
  const far = hs.filter((h) => h.z < 0.2);
  const near = hs.filter((h) => h.z > 0.8);
  assert.ok(far.length > near.length, "more far houses than near ones");
  assert.ok(near.length > 0);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  assert.ok(avg(near.map((h) => h.scale)) > avg(far.map((h) => h.scale)) * 2);
  assert.ok(avg(near.map((h) => h.alpha)) > avg(far.map((h) => h.alpha)) * 2);
  assert.ok(avg(near.map((h) => Math.hypot(h.vx, h.vy))) > avg(far.map((h) => Math.hypot(h.vx, h.vy))) * 2);
});

test("motion is varied, not uniform: directions, speeds and sways differ", () => {
  const hs = makeHouses(200, 1440, 900, 24, mulberry32(3));
  const angles = new Set(hs.map((h) => Math.round(Math.atan2(h.vy, h.vx) * 20)));
  assert.ok(angles.size > 6);
  assert.ok(new Set(hs.map((h) => h.wobbleFreq.toFixed(3))).size > 50);
});

test("motion is slow: no house moves faster than about 25 px a second at rest", () => {
  const hs = makeHouses(300, 1440, 900, 24, mulberry32(4));
  assert.ok(hs.every((h) => Math.hypot(h.vx, h.vy) < 25));
});

test("the warp speeds the field up, near houses more than far ones", () => {
  assert.equal(speedMultiplier(0, 0), 1);
  assert.equal(speedMultiplier(0, 1), 1);
  assert.ok(speedMultiplier(1, 1) > speedMultiplier(1, 0));
  assert.ok(speedMultiplier(1, 0) > 1);
});

test("a house that leaves the screen wraps round with a margin and stays near the screen", () => {
  const h = makeHouses(1, 1000, 600, 4, mulberry32(5))[0];
  h.x = -161;
  h.y = 300;
  h.vx = 0;
  h.vy = 0;
  advance(h, 0.016, 1, 1000, 600, 160);
  assert.ok(h.x > 900, `wrapped to the other side, got ${h.x}`);
  h.x = 500;
  h.y = 761;
  advance(h, 0.016, 1, 1000, 600, 160);
  assert.ok(h.y < 0, `wrapped to the top, got ${h.y}`);
});

test("advance moves a house by velocity times time times multiplier", () => {
  const h = makeHouses(1, 1000, 600, 4, mulberry32(6))[0];
  h.x = 500; h.y = 300; h.vx = -10; h.vy = -5;
  advance(h, 2, 3, 1000, 600);
  assert.equal(h.x, 440);
  assert.equal(h.y, 270);
});

test("sway stays within its amplitude", () => {
  const h = makeHouses(1, 1000, 600, 4, mulberry32(8))[0];
  for (let t = 0; t < 100; t += 3.7) assert.ok(Math.abs(sway(h, t)) <= h.wobbleAmp + 1e-9);
});

test("greeting uses a real name when there is one, and a plain greeting when there is not", () => {
  assert.equal(greeting("Asha"), "Hi, Asha, welcome to RealBrain.");
  assert.equal(greeting("  Asha  "), "Hi, Asha, welcome to RealBrain.");
  assert.equal(greeting(), "Hi there, welcome to RealBrain.");
  assert.equal(greeting(null), "Hi there, welcome to RealBrain.");
  assert.equal(greeting("   "), "Hi there, welcome to RealBrain.");
});
