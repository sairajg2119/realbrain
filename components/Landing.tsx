"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "../app/welcome.css";
import { greeting } from "@/lib/houses";
import { Wordmark } from "./AppHeader";
import { HouseField } from "./HouseField";
import { IconArrow } from "./Icons";

/**
 * The tagline exactly as specified. If "homes" is wanted instead, change it here: it is the only place.
 */
const TAGLINE_LEAD = "Stories that";
const TAGLINE_ACCENT = "sell home.";

/**
 * The first two screens: a welcome, then the one action. The house field stays on screen the whole time; moving between
 * the screens speeds it forward while the text of one screen lifts away and the other rises in. Move on with a tap,
 * the arrow, scroll, a swipe up or the down arrow key. `onStart` opens the real brochure-upload workflow.
 * `name` would come from a signed-in user. This app has no sign-in yet, so it is not passed and a plain greeting is used.
 */
export function Landing({ onStart, name }: { onStart: () => void; name?: string | null }) {
  const [screen, setScreen] = useState<0 | 1>(0);
  const lock = useRef(0);
  const touchY = useRef<number | null>(null);

  const go = useCallback((to: 0 | 1) => {
    const now = Date.now();
    if (now - lock.current < 700) return; // one move per gesture, not one per wheel tick
    lock.current = now;
    setScreen(to);
  }, []);

  useEffect(() => {
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
  }, [go, screen]);

  return (
    <div
      className="wl"
      data-screen={screen}
      onTouchStart={(e) => { touchY.current = e.touches[0]?.clientY ?? null; }}
      onTouchEnd={(e) => {
        if (touchY.current === null) return;
        const dy = (e.changedTouches[0]?.clientY ?? touchY.current) - touchY.current;
        touchY.current = null;
        if (dy < -50) go(1);
        else if (dy > 50) go(0);
      }}
    >
      <HouseField warp={screen === 1} />
      <div className="wl-veil" aria-hidden="true" />

      <header className="wl-top">
        <Wordmark />
        <div className="wl-dots" role="group" aria-label="Screens">
          <button type="button" className="wl-dot" aria-label="Welcome" aria-current={screen === 0} onClick={() => go(0)} />
          <button type="button" className="wl-dot" aria-label="Create your first reel" aria-current={screen === 1} onClick={() => go(1)} />
        </div>
      </header>

      <main className="wl-main">
        <section className="wl-s wl-s1" inert={screen !== 0} aria-label="Welcome" onClick={(e) => { if (!(e.target as HTMLElement).closest("button")) go(1); }}>
          <p className="wl-hi">{greeting(name)}</p>
          <h1 className="wl-tag" data-focus>
            {TAGLINE_LEAD} <span>{TAGLINE_ACCENT}</span>
          </h1>
          <button type="button" className="wl-next" onClick={() => go(1)} aria-label="Continue">
            <span>Continue</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </section>

        <section className="wl-s wl-s2" inert={screen !== 1} aria-label="Create your first reel">
          <h2 className="wl-h2">Let&apos;s create something that <span>sells.</span></h2>
          <p className="wl-sub">Turn your property into a story worth watching.</p>
          <button type="button" className="wl-cta" onClick={onStart}>
            Create my first reel <IconArrow size={20} />
          </button>
        </section>
      </main>
    </div>
  );
}
