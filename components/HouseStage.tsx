"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
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
    <div className="hs" data-scene={scene} data-phase={phase} data-light={light} aria-hidden="true">
      <div className="hs-poster">{scene === "off" ? <PhotoWalk drive={drive} /> : phase === "outside" || phase === "entering" ? <ArchPoster /> : <img src="/photos/hall.jpg" alt="" className="hs-hall" />}</div>
      {scene !== "off" && (
        <div className="hs-3d">
          <ArchScene light={light} phase={phase} still={still} calm={calm} drive={drive} paused={paused} onReady={() => onScene("ready")} onArrive={onArrive} onFail={() => onScene("off")} />
        </div>
      )}
    </div>
  );
}

/**
 * When the browser cannot draw 3D, the walk still happens, in photographs: the house, then up to its front door, then the
 * door opens onto the hall, all following the same scroll as the 3D camera (drive). The four lights become colour grades.
 */
export function PhotoWalk({ drive }: { drive?: { current: number | null } }) {
  const house = useRef<HTMLImageElement>(null);
  const door = useRef<HTMLImageElement>(null);
  const hall = useRef<HTMLImageElement>(null);
  useEffect(() => {
    let raf = 0;
    const clamp = (x: number) => Math.max(0, Math.min(1, x));
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const j = drive?.current ?? 0.34;
      const p = clamp((j - 0.34) / (1.95 - 0.34));
      const a = clamp(p / 0.45), b = clamp((p - 0.4) / 0.4), c = clamp((p - 0.72) / 0.25);
      if (house.current) { house.current.style.transform = `scale(${1.04 + a * 0.5})`; house.current.style.opacity = String(1 - clamp((p - 0.38) / 0.12)); }
      if (door.current) { door.current.style.transform = `scale(${1 + b * 2.6})`; door.current.style.opacity = String(clamp((p - 0.38) / 0.12) * (1 - c)); }
      if (hall.current) { hall.current.style.transform = `scale(${1.2 - c * 0.2})`; hall.current.style.opacity = String(c); }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [drive]);
  return (
    <div className="pw">
      <img ref={house} src="/photos/hero.jpg" alt="" className="pw-img pw-house" />
      <img ref={door} src="/photos/entrance.jpg" alt="" className="pw-img pw-door" style={{ opacity: 0 }} />
      <img ref={hall} src="/photos/hall.jpg" alt="" className="pw-img pw-hall" style={{ opacity: 0 }} />
    </div>
  );
}
