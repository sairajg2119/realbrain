/**
 * Layout and motion for the welcome screen's field of tiny houses. Pure functions, no drawing, so they can be tested.
 * Depth is a number z from 0 (far: tiny, faint, slow) to 1 (near: larger, brighter, faster), which is what makes
 * the field read as a space rather than a repeated grid.
 */

/** Height of a house at scale 1, in CSS pixels. Sprites are drawn at this size and scaled by depth. */
export const SPRITE_H = 100;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface House {
  sprite: number;
  z: number;
  x: number;
  y: number;
  scale: number;
  alpha: number;
  vx: number;
  vy: number;
  wobbleAmp: number;
  wobbleFreq: number;
  phase: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** How many houses fit the screen. Fewer on small screens so phones stay smooth. */
export function houseCount(width: number): number {
  if (width < 520) return 110;
  if (width < 900) return 170;
  return 260;
}

/**
 * Scatter houses across the screen. Depth is skewed towards the far layer (many small, few large), each house gets its own
 * direction, speed, opacity and sway. Sorted far to near so drawing in order gives correct overlap.
 */
export function makeHouses(count: number, width: number, height: number, spriteCount: number, rng: () => number): House[] {
  const out: House[] = [];
  for (let i = 0; i < count; i++) {
    const z = Math.pow(rng(), 1.7); // skew to far
    // The whole field drifts up and to the left, each house a little off that line.
    const angle = (-Math.PI / 5) + (rng() - 0.5) * 0.7;
    const speed = lerp(3, 20, z) * (0.75 + rng() * 0.5); // CSS px per second: slow
    out.push({
      sprite: Math.floor(rng() * spriteCount),
      z,
      x: rng() * width,
      y: rng() * height,
      scale: lerp(0.3, 1.5, Math.pow(z, 1.2)) * (0.9 + rng() * 0.2),
      alpha: lerp(0.14, 0.6, z) * (0.85 + rng() * 0.15),
      vx: Math.cos(angle) * speed * -1,
      vy: Math.sin(angle) * speed,
      wobbleAmp: 3 + rng() * 10,
      wobbleFreq: 0.04 + rng() * 0.08,
      phase: rng() * Math.PI * 2,
    });
  }
  return out.sort((a, b) => a.z - b.z);
}

/** 0 on the welcome screen, 1 on the next one: the field speeds up, nearer houses most, as if moving forward. */
export function speedMultiplier(warp: number, z: number): number {
  return 1 + warp * (0.8 + 2.6 * z);
}

/** Move one house for dt seconds and wrap it around the screen edges with a margin so it never pops in view. */
export function advance(h: House, dt: number, mul: number, width: number, height: number, margin = 160): void {
  h.x += h.vx * dt * mul;
  h.y += h.vy * dt * mul;
  const w = width + margin * 2;
  const ht = height + margin * 2;
  if (h.x < -margin) h.x += w;
  else if (h.x > width + margin) h.x -= w;
  if (h.y < -margin) h.y += ht;
  else if (h.y > height + margin) h.y -= ht;
}

/** Slow side-to-side sway, in CSS pixels, so paths are never perfectly straight. */
export function sway(h: House, t: number): number {
  return Math.sin(t * h.wobbleFreq * Math.PI * 2 + h.phase) * h.wobbleAmp;
}

/** The welcome line. A name is used only if one is really known; otherwise a plain greeting, never a made-up person. */
export function greeting(name?: string | null): string {
  const n = (name ?? "").trim();
  return n ? `Hi, ${n}, welcome to RealBrain.` : "Hi there, welcome to RealBrain.";
}
