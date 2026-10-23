"use client";

import type { LightId } from "@/lib/scene/timeOfDay";
import type { SceneState } from "./HouseStage";
import { Inside } from "./Inside";
import { Opening } from "./Opening";

/**
 * Two parts, over the same house. Outside: the welcome, the camera walking to the front door and through it (Opening).
 * Inside: one long page that shows what RealBrain does and leads to the work (Inside). The house itself lives in
 * HouseStage, mounted once at the top of the app. `onStart` opens the real brochure workflow.
 */
export function Landing({
  phase,
  light,
  onLight,
  scene,
  onEnter,
  onSkip,
  onStart,
  name,
}: {
  phase: "outside" | "entering" | "inside";
  light: LightId;
  onLight: (l: LightId) => void;
  scene: SceneState;
  onEnter: () => void;
  onSkip: () => void;
  onStart: () => void;
  name?: string | null;
}) {
  return phase === "inside" ? <Inside onStart={onStart} /> : <Opening phase={phase} light={light} onLight={onLight} scene={scene} onEnter={onEnter} onSkip={onSkip} name={name} />;
}
