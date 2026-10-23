"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { greeting } from "@/lib/houses";
import { LIGHTS, type LightId } from "@/lib/scene/timeOfDay";
import { Wordmark } from "./AppHeader";
import { IconArrow } from "./Icons";
import type { SceneState } from "./HouseStage";

/** The tagline exactly as specified. If "homes" is wanted instead, change it here: it is the only place. */
export const TAGLINE_LEAD = "Stories that";
export const TAGLINE_ACCENT = "sell home.";

/**
 * The words laid over the house, in two screens: a welcome, then the one action. Moving between them is a tap, the arrow,
 * scroll, a swipe up or the down arrow key. The button sends the camera up the path, through the front door and into
 * the hall (the scene does that; \`onEnter\` starts it). "Skip" goes straight to the hall at any time.
 * \`name\` would come from a signed-in user. There is no sign-in yet, so a plain greeting is used.
 */
export function Opening({
  phase,
  light,
  onLight,
  scene,
  onEnter,
  onSkip,
  name,
}: {
  phase: "outside" | "entering";
  light: LightId;
  onLight: (l: LightId) => void;
  scene: SceneState;
  onEnter: () => void;
  onSkip: () => void;
  name?: string | null;
}) {
  const [screen, setScreen] = useState<0 | 1>(0);
  const lock = useRef(0);
  const touchY = useRef<number | null>(null);
  const entering = phase === "entering";

  const go = useCallback((to: 0 | 1) => {
    const now = Date.now();
    if (now - lock.current < 700) return; // one move per gesture, not one per wheel tick
    lock.current = now;
    setScreen(to);
  }, []);

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
      onTouchStart={(e) => { touchY.current = e.touches[0]?.clientY ?? null; }}
      onTouchEnd={(e) => {
        if (touchY.current === null || entering) return;
        const dy = (e.changedTouches[0]?.clientY ?? touchY.current) - touchY.current;
        touchY.current = null;
        if (dy < -50) go(1);
        else if (dy > 50) go(0);
      }}
    >
      <div className="wl-veil" aria-hidden="true" />

      <header className="wl-top">
        <Wordmark />
        <div className="wl-right">
          <button type="button" className="wl-skip" onClick={onSkip}>Skip intro</button>
          <div className="wl-dots" role="group" aria-label="Screens">
            <button type="button" className="wl-dot" aria-label="Welcome" aria-current={screen === 0} onClick={() => go(0)} disabled={entering} />
            <button type="button" className="wl-dot" aria-label="Create your first reel" aria-current={screen === 1} onClick={() => go(1)} disabled={entering} />
          </div>
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
          <button type="button" className="wl-cta" onClick={onEnter}>
            <span>Create my first reel</span> <IconArrow size={20} />
          </button>
        </section>
      </main>

      <footer className="wl-foot" inert={entering}>
        <div className="wl-light" role="radiogroup" aria-label="Time of day">
          {LIGHTS.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={light === l.id} className="wl-lt" onClick={() => onLight(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
        <p className="wl-clock" aria-live="polite">{scene === "off" ? "A drawing of the house" : `The house, ${current.clock}`}</p>
      </footer>

      {entering && <p className="wl-walk" role="status">Walking in…</p>}
    </div>
  );
}
