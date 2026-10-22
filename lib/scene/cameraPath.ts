/**
 * The camera's journey in the opening scene, as a pure function of progress t (0 to 1): a wide, low view of the house,
 * an approach up the path, and a push to the front door. The house stands at the origin facing +z; the door is at x = 6.
 */

export type Vec3 = [number, number, number];

export interface Pose {
  pos: Vec3;
  look: Vec3;
}

/** t, position, look-at. The last pose stands at the front door. */
const KEYS: { t: number; pos: Vec3; look: Vec3 }[] = [
  { t: 0, pos: [-30, 11, 52], look: [2, 4, 0] },
  { t: 0.4, pos: [-8, 5, 36], look: [3, 3.6, 0] },
  { t: 0.75, pos: [3, 2.6, 22], look: [5.5, 2.4, 2] },
  { t: 1, pos: [6, 1.75, 11], look: [6, 1.6, 3] },
];

export const DOOR: Vec3 = [6, 1.3, 4];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (u: number) => u * u * (3 - 2 * u);
const lerp3 = (a: Vec3, b: Vec3, u: number): Vec3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

/** Ease in and out between neighbouring key poses, so the camera never lurches at a key. */
export function cameraAt(t: number): Pose {
  const x = clamp01(t);
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (x <= b.t) {
      const u = smooth((x - a.t) / (b.t - a.t));
      return { pos: lerp3(a.pos, b.pos, u), look: lerp3(a.look, b.look, u) };
    }
  }
  const last = KEYS[KEYS.length - 1];
  return { pos: last.pos, look: last.look };
}

/** On a tall, narrow screen the camera stands further back so the whole house still fits. */
export function portraitScale(aspect: number): number {
  return aspect >= 1 ? 1 : 1 + (1 - aspect) * 0.9;
}

/** Progress during the opening drift: eases out over `seconds` to `to`, so the first moments move and then settle. */
export function introProgress(elapsed: number, seconds = 18, to = 0.34): number {
  const u = clamp01(elapsed / seconds);
  return to * (1 - Math.pow(1 - u, 3));
}

/** Distance from a pose to the door. */
export function distanceToDoor(p: Pose): number {
  return Math.hypot(p.pos[0] - DOOR[0], p.pos[1] - DOOR[1], p.pos[2] - DOOR[2]);
}
