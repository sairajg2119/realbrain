"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import "../app/scene.css";
import type { LightId } from "@/lib/scene/timeOfDay";
import { ArchPoster } from "./ArchPoster";
import type { HousePhase } from "./ArchScene";

// The 3D house is its own chunk, fetched after the page is up.
const ArchScene = dynamic(() => import("./ArchScene"), { ssr: false });

export type SceneState = "pending" | "ready" | "off";

function canUseWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The one house, mounted once behind everything: the garden and front door at first, then the hall for as long as the
 * visitor is on the site, including while they work. While it loads, and if it cannot run (no WebGL, data saver on, or the
 * graphics card gave up), a still picture stands in: a drawing of the house outside, a photograph of a hall once inside.
 */
export function HouseStage({
  light,
  phase,
  still,
  calm,
  scene,
  onScene,
  onArrive,
  drive,
  paused,
}: {
  light: LightId;
  phase: HousePhase;
  still: boolean;
  calm: boolean;
  scene: SceneState;
  onScene: (s: SceneState) => void;
  onArrive: () => void;
  drive?: { current: number | null };
  paused?: { current: boolean };
}) {
  useEffect(() => {
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (saver || !canUseWebGL()) onScene("off");
  }, [onScene]);

  return (
    <div className="hs" data-scene={scene} data-phase={phase} aria-hidden="true">
      <div className="hs-poster">{phase === "outside" || phase === "entering" ? <ArchPoster /> : <img src="/photos/hall.jpg" alt="" className="hs-hall" />}</div>
      {scene !== "off" && (
        <div className="hs-3d">
          <ArchScene light={light} phase={phase} still={still} calm={calm} drive={drive} paused={paused} onReady={() => onScene("ready")} onArrive={onArrive} onFail={() => onScene("off")} />
        </div>
      )}
    </div>
  );
}
