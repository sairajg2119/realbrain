"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import "../app/scene.css";
import { greeting } from "@/lib/houses";
import { LIGHTS, type LightId } from "@/lib/scene/timeOfDay";
import { ArchPoster } from "./ArchPoster";
import { Wordmark } from "./AppHeader";
import { IconArrow } from "./Icons";

// The 3D scene is its own chunk. It is fetched after the page is up, so the words and the poster appear first.
const ArchScene = dynamic(() => import("./ArchScene"), { ssr: false });

/** The tagline exactly as specified. If "homes" is wanted instead, change it here: it is the only place. */
const TAGLINE_LEAD = "Stories that";
const TAGLINE_ACCENT = "sell home.";

const ENTER_TOTAL_MS = 2500;
const DOOR_OPEN_AT_MS = 1500;

type SceneState = "pending" | "ready" | "off";

function canUseWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The first two screens, set in front of a house you can look around. Screen one is the welcome and the name; screen
 * two is the one action. Moving on is a tap, the button, scroll, a swipe up or the down arrow. The button walks the camera
 * to the front door and then opens the real brochure workflow (`onStart`). The light control changes the time of day.
 * `name` would come from a signed-in user; there is no sign-in yet, so a plain greeting is used.
 */
export function Landing({ onStart, name }: { onStart: () => void; name?: string | null }) {
  const [screen, setScreen] = useState<0 | 1>(0);
  const [light, setLight] = useState<LightId>("golden");
  const [scene, setScene] = useState<SceneState>("pending");
  const [still, setStill] = useState(false);
  const [entering, setEntering] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const lock = useRef(0);
  const touchY = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (saver || !canUseWebGL()) setScene("off");
    return () => mq.removeEventListener("change", sync);
  }, []);

  const go = useCallback((to: 0 | 1) => {
    const now = Date.now();
    if (now - lock.current < 700) return; // one move per gesture, not one per wheel tick
    lock.current = now;
    setScreen(to);
  }, []);

  const begin = useCallback(() => {
    if (entering) return;
    setEntering(true);
    if (still) {
      window.setTimeout(onStart, 220);
      return;
    }
    window.setTimeout(() => setDoorOpen(true), scene === "ready" ? DOOR_OPEN_AT_MS : 200);
    window.setTimeout(onStart, scene === "ready" ? ENTER_TOTAL_MS : 1100);
  }, [entering, onStart, scene, still]);

  useEffect(() => {
    if (entering) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 20) return;
      go(e.deltaY > 0 ? 1 : 0);
    };
    const onKey = (e: KeyboardEvent) => {
      const onControl = (e.target as HTMLElement | null)?.closest("button, a, input");
      if (e.key === "ArrowDown" || e.key === "PageDown") go(1);
      else if (e.key === "ArrowUp" || e.key === "PageUp") go(0);
      else if ((e.key === "Enter" || e.key === " ") && !onControl && screen === 0) go(1);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [go, screen, entering]);

  const current = LIGHTS.find((l) => l.id === light) ?? LIGHTS[1];

  return (
    <div
      className="wl"
      data-screen={screen}
      data-scene={scene}
      data-entering={entering}
      data-light={light}
      onTouchStart={(e) => { touchY.current = e.touches[0]?.clientY ?? null; }}
      onTouchEnd={(e) => {
        if (touchY.current === null || entering) return;
        const dy = (e.changedTouches[0]?.clientY ?? touchY.current) - touchY.current;
        touchY.current = null;
        if (dy < -50) go(1);
        else if (dy > 50) go(0);
      }}
    >
      <div className="wl-stage" aria-hidden="true">
        <ArchPoster />
        {scene !== "off" && (
          <div className="wl-3d">
            <ArchScene light={light} enter={entering} still={still} onReady={() => setScene("ready")} onFail={() => setScene("off")} />
          </div>
        )}
      </div>
      <div className="wl-veil" aria-hidden="true" />

      <header className="wl-top">
        <Wordmark />
        <div className="wl-dots" role="group" aria-label="Screens">
          <button type="button" className="wl-dot" aria-label="Welcome" aria-current={screen === 0} onClick={() => go(0)} />
          <button type="button" className="wl-dot" aria-label="Create your first reel" aria-current={screen === 1} onClick={() => go(1)} />
        </div>
      </header>

      <main className="wl-main">
        <section className="wl-s wl-s1" inert={screen !== 0 || entering} aria-label="Welcome" onClick={(e) => { if (!(e.target as HTMLElement).closest("button")) go(1); }}>
          <p className="wl-hi">{greeting(name)}</p>
          <h1 className="wl-tag" data-focus>
            {TAGLINE_LEAD} <span>{TAGLINE_ACCENT}</span>
          </h1>
          <button type="button" className="wl-next" onClick={() => go(1)} aria-label="Continue">
            <span>Continue</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </section>

        <section className="wl-s wl-s2" inert={screen !== 1 || entering} aria-label="Create your first reel">
          <h2 className="wl-h2">Let&apos;s create something that <em>sells.</em></h2>
          <p className="wl-sub">Turn your property into a story worth watching.</p>
          <button type="button" className="wl-cta" onClick={begin}>
            <span>Create my first reel</span> <IconArrow size={20} />
          </button>
        </section>
      </main>

      <footer className="wl-foot" inert={entering}>
        <div className="wl-light" role="radiogroup" aria-label="Time of day">
          {LIGHTS.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={light === l.id} className="wl-lt" onClick={() => setLight(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
        <p className="wl-clock" aria-live="polite">{scene === "off" ? "A still of the house" : `The house, ${current.clock}`}</p>
      </footer>

      <div className="wl-door" data-open={doorOpen} aria-hidden="true" />
    </div>
  );
}
