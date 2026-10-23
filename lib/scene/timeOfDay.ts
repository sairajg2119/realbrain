/**
 * The four moods of light for the opening scene. Pure data and blending, so the scene code only applies numbers
 * and the behaviour can be tested without a graphics card.
 */

export type LightId = "morning" | "golden" | "dusk" | "night";

export interface Light {
  id: LightId;
  label: string;
  /** The little clock shown beside the control, like a site-plan viewer's time of day. */
  clock: string;
  sunColor: string;
  sunIntensity: number;
  /** Direction from the house towards the sun (not normalised). */
  sunDir: [number, number, number];
  skyTop: string;
  skyHorizon: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fog: string;
  fogNear: number;
  fogFar: number;
  exposure: number;
  /** 0 to 1: how brightly the house is lit from inside and the garden lights glow. */
  glow: number;
  /** 0 to 1: how many stars show. */
  stars: number;
}

export const LIGHTS: Light[] = [
  { id: "morning", label: "Morning", clock: "7:40 am", sunColor: "#ffe2b8", sunIntensity: 2.4, sunDir: [-0.8, 0.45, 0.55], skyTop: "#7f9fbf", skyHorizon: "#f1d9bd", hemiSky: "#bcd0e6", hemiGround: "#8a8068", hemiIntensity: 0.75, fog: "#d9d2c4", fogNear: 70, fogFar: 280, exposure: 0.95, glow: 0.12, stars: 0 },
  { id: "golden", label: "Golden hour", clock: "5:20 pm", sunColor: "#ffb36b", sunIntensity: 3.0, sunDir: [0.7, 0.28, 0.7], skyTop: "#4d6a8c", skyHorizon: "#f4a96a", hemiSky: "#8fa6c4", hemiGround: "#6b5640", hemiIntensity: 0.62, fog: "#d8b48e", fogNear: 55, fogFar: 250, exposure: 1.0, glow: 0.45, stars: 0 },
  { id: "dusk", label: "Dusk", clock: "6:35 pm", sunColor: "#ff8f5a", sunIntensity: 1.1, sunDir: [0.9, 0.07, 0.4], skyTop: "#1f2b45", skyHorizon: "#c76a4c", hemiSky: "#4b5d83", hemiGround: "#3a2f2a", hemiIntensity: 0.5, fog: "#4a4650", fogNear: 45, fogFar: 210, exposure: 1.1, glow: 0.85, stars: 0.25 },
  { id: "night", label: "Night", clock: "9:00 pm", sunColor: "#7f95c8", sunIntensity: 0.35, sunDir: [-0.5, 0.5, -0.3], skyTop: "#070b14", skyHorizon: "#1c2338", hemiSky: "#2a3558", hemiGround: "#15171c", hemiIntensity: 0.35, fog: "#0e1322", fogNear: 38, fogFar: 190, exposure: 1.25, glow: 1, stars: 1 },
];

export function lightById(id: LightId): Light {
  return LIGHTS.find((l) => l.id === id) ?? LIGHTS[1];
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

const mixNum = (a: number, b: number, t: number) => a + (b - a) * t;

export function mixHex(a: string, b: string, t: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return rgbToHex([mixNum(ra[0], rb[0], t), mixNum(ra[1], rb[1], t), mixNum(ra[2], rb[2], t)]);
}

/** Blend two moods. t = 0 is `a`, t = 1 is `b`. Colours blend in sRGB, which is plenty for a sky. */
export function mixLight(a: Light, b: Light, t: number): Light {
  const k = Math.max(0, Math.min(1, t));
  return {
    id: k < 0.5 ? a.id : b.id,
    label: k < 0.5 ? a.label : b.label,
    clock: k < 0.5 ? a.clock : b.clock,
    sunColor: mixHex(a.sunColor, b.sunColor, k),
    sunIntensity: mixNum(a.sunIntensity, b.sunIntensity, k),
    sunDir: [mixNum(a.sunDir[0], b.sunDir[0], k), mixNum(a.sunDir[1], b.sunDir[1], k), mixNum(a.sunDir[2], b.sunDir[2], k)],
    skyTop: mixHex(a.skyTop, b.skyTop, k),
    skyHorizon: mixHex(a.skyHorizon, b.skyHorizon, k),
    hemiSky: mixHex(a.hemiSky, b.hemiSky, k),
    hemiGround: mixHex(a.hemiGround, b.hemiGround, k),
    hemiIntensity: mixNum(a.hemiIntensity, b.hemiIntensity, k),
    fog: mixHex(a.fog, b.fog, k),
    fogNear: mixNum(a.fogNear, b.fogNear, k),
    fogFar: mixNum(a.fogFar, b.fogFar, k),
    exposure: mixNum(a.exposure, b.exposure, k),
    glow: mixNum(a.glow, b.glow, k),
    stars: mixNum(a.stars, b.stars, k),
  };
}
