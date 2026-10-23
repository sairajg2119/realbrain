"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A row of tall, vertical property videos, the way reels are actually watched. Muted, looping previews that play only
 * while they are on screen; one control pauses all motion; arrows, keys and swipes move along the row; the reel nearest
 * the centre is brought slightly forward. To use your own reels, put the files in public/showcase and edit REELS.
 */
export interface Reel {
  src: string;
  label: string;
}

export const REELS: Reel[] = [
  { src: "/showcase/reel-1.mp4", label: "Pool and garden" },
  { src: "/showcase/reel-2.mp4", label: "The front door" },
  { src: "/showcase/reel-3.mp4", label: "Poolside" },
  { src: "/showcase/reel-4.mp4", label: "The walkthrough" },
  { src: "/showcase/reel-5.mp4", label: "Arrival" },
  { src: "/showcase/reel-6.mp4", label: "Living room" },
  { src: "/showcase/reel-7.mp4", label: "The viewing" },
];

export function ReelShowcase({ reels = REELS, still }: { reels?: Reel[]; still: boolean }) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const stopped = paused || still;

  // Play what is on screen, pause the rest (and everything when paused or reduced motion is on).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const vids = Array.from(el.querySelectorAll("video"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting && !stopped) v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.35 },
    );
    vids.forEach((v) => io.observe(v));
    if (stopped) vids.forEach((v) => v.pause());
    return () => io.disconnect();
  }, [stopped]);

  // Which reel is nearest the centre of the row.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let dist = Infinity;
      Array.from(el.children).forEach((c, i) => {
        const n = c as HTMLElement;
        const d = Math.abs(n.offsetLeft + n.offsetWidth / 2 - mid);
        if (d < dist) { dist = d; best = i; }
      });
      setActive(best);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const go = useCallback((i: number) => {
    const el = track.current;
    const n = el?.children[Math.max(0, Math.min(reels.length - 1, i))] as HTMLElement | undefined;
    if (!el || !n) return;
    el.scrollTo({ left: n.offsetLeft + n.offsetWidth / 2 - el.clientWidth / 2, behavior: still ? "auto" : "smooth" });
  }, [reels.length, still]);

  // Start in the middle of the row, so there is something on both sides.
  useEffect(() => { const t = setTimeout(() => go(Math.floor(reels.length / 2)), 50); return () => clearTimeout(t); }, [go, reels.length]);

  return (
    <div className="rs" data-paused={stopped}>
      <ul
        ref={track}
        className="rs-track"
        tabIndex={0}
        aria-label="Example property reels. Use the left and right arrow keys to move along the row."
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); }
        }}
      >
        {reels.map((r, i) => (
          <li key={r.src} className={`rs-item${i === active ? " on" : ""}`} data-d={Math.min(3, Math.abs(i - active))}>
            <video src={`${r.src}#t=0.1`} muted loop playsInline preload="metadata" aria-label={r.label} onClick={() => go(i)} />
            <span className="rs-label">{r.label}</span>
          </li>
        ))}
      </ul>
      <div className="rs-ctrl">
        <button type="button" className="rs-btn" onClick={() => go(active - 1)} aria-label="Previous reel" disabled={active === 0}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button type="button" className="rs-btn rs-pause" onClick={() => setPaused((p) => !p)} aria-pressed={paused} disabled={still}>
          {stopped ? "Play previews" : "Pause previews"}
        </button>
        <button type="button" className="rs-btn" onClick={() => go(active + 1)} aria-label="Next reel" disabled={active === reels.length - 1}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
      <p className="rs-note">Example footage from Pexels, shown to illustrate the kind of reel RealBrain is built for. Your own reels can replace these.</p>
    </div>
  );
}
