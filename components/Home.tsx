"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "../app/home.css";
import { LIGHTS, type LightId } from "@/lib/scene/timeOfDay";
import { Wordmark } from "./AppHeader";
import { DemoStage } from "./DemoStage";
import { IconArrow } from "./Icons";
import { ReelShowcase } from "./ReelShowcase";

/** The tagline exactly as specified. If "homes" is wanted instead, change it here: it is the only place. */
const TAGLINE_LEAD = "Stories that";
const TAGLINE_ACCENT = "sell home.";

const NAV = [
  { id: "overview", label: "Overview" },
  { id: "inspiration", label: "Inspiration" },
  { id: "brochure", label: "How it works" },
  { id: "start", label: "Start" },
];

/** Small pictures for the four moods of light. */
const LIGHT_ICON: Record<LightId, React.ReactNode> = {
  morning: <><path d="M4 17h16" /><path d="M7.5 17a4.5 4.5 0 019 0" /><path d="M12 6v3M9.5 8l2.5-2.5L14.5 8" /></>,
  golden: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></>,
  dusk: <><path d="M4 17h16M6 20h12" /><path d="M7.5 17a4.5 4.5 0 019 0" /><path d="M12 5v4M9.5 7.5L12 10l2.5-2.5" /></>,
  night: <path d="M19 14.5A7.5 7.5 0 019.5 5a7.5 7.5 0 109.5 9.5z" />,
};

/** Where the camera is on its walk: 0.34 is where the opening drift rests, 1 the front door, 1.95 inside the hall. */
const DRIVE_FROM = 0.34;
const DRIVE_TO = 1.95;

/**
 * One continuous page over one house, read top to bottom like a short film: the house and the name; a row of property
 * reels; then, as you keep scrolling, the camera walks up the path and the front door opens, and the light from inside
 * becomes "Bring the brochure", a walkthrough of the real flow (brochure in, a few words, Create scripts, a reel comes in).
 * Then one invitation to begin, which opens the workspace. The header carries the sections and the light. The house is drawn by HouseStage behind this
 * page; this component tells it where the camera should be (`drive`) and when it is out of sight (`paused`).
 */
export function Home({
  light,
  onLight,
  still,
  drive,
  paused,
  onStart,
}: {
  light: LightId;
  onLight: (l: LightId) => void;
  still: boolean;
  drive: { current: number | null };
  paused: { current: boolean };
  onStart: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const door = useRef<HTMLElement>(null);
  const [spy, setSpy] = useState("overview");
  const [solid, setSolid] = useState(false);
  const [inBrochure, setInBrochure] = useState(false);

  // One scroll handler for the whole page: the header, the section in view, and the walk to the door.
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const vh = window.innerHeight;
      setSolid(window.scrollY > 40);
      const d = door.current;
      if (d) {
        const r = d.getBoundingClientRect();
        // 0 when the door section's top reaches the top of the screen, 1 when its bottom does.
        const p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - vh)));
        drive.current = r.top > 0 ? null : DRIVE_FROM + (DRIVE_TO - DRIVE_FROM) * p;
        d.style.setProperty("--door", p.toFixed(3));
        paused.current = r.bottom < 0;
      }
      let current = "overview";
      for (const n of NAV) {
        const el = document.getElementById(n.id);
        if (el && el.getBoundingClientRect().top < vh * 0.45) current = n.id;
      }
      setSpy(current);
      const br = document.getElementById("brochure")?.getBoundingClientRect();
      setInBrochure(!!br && br.top < vh * 0.8 && br.bottom > vh * 0.2);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      drive.current = null;
      paused.current = false;
    };
  }, [drive, paused]);

  // Sections reveal as they arrive: children of [data-reveal] rise in, in reading order.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.18 },
    );
    el.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const go = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  }, [still]);

  return (
    <div ref={root} className="hm">
      <header className={`hm-top${solid ? " solid" : ""}`}>
        <Wordmark onClick={() => go("overview")} />
        <nav className="hm-nav" aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} aria-current={spy === n.id ? "true" : undefined} onClick={(e) => { e.preventDefault(); go(n.id); }}>{n.label}</a>
          ))}
        </nav>
        <div className="hm-light" role="radiogroup" aria-label="Light on the house">
          {LIGHTS.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={light === l.id} aria-label={`${l.label}, ${l.clock}`} title={`${l.label}, ${l.clock}`} onClick={() => onLight(l.id)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{LIGHT_ICON[l.id]}</svg>
            </button>
          ))}
        </div>
      </header>

      {/* 1. The house and the name */}
      <section id="overview" className="hm-hero">
        <div className="hm-hero-in" data-reveal>
          <p className="hm-eye">RealBrain</p>
          <h1 className="hm-tag" data-focus>{TAGLINE_LEAD} <span>{TAGLINE_ACCENT}</span></h1>
        </div>
        <button type="button" className="hm-cue" onClick={() => go("inspiration")}>
          <span>Scroll to step inside</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </section>

      {/* 2. What it is for */}
      <section id="inspiration" className="hm-show">
        <div className="hm-head hm-center" data-reveal>
          <h2>Real estate deserves better stories.</h2>
          <p>See what happens when properties become stories worth watching.</p>
        </div>
        <ReelShowcase still={still} />
      </section>

      {/* 3. The walk to the door: the camera follows the scroll; the door opens and its light becomes the next section */}
      <section ref={door} className="hm-door" aria-label="The front door">
        <div className="hm-door-in">
          <p className="hm-door-cap">Let&apos;s build.</p>
          <div className="hm-door-light" aria-hidden="true" />
        </div>
      </section>

      {/* 4. Bring the brochure: the whole flow, played as it really happens */}
      <section id="brochure" className="hm-sec hm-brochure">
        <div className="hm-sec-in hm-wide" data-reveal>
          <p className="hm-eye">01 · Brochure</p>
          <h2>Bring the brochure.</h2>
          <p className="hm-lead">Start with the property. We&apos;ll help you shape the story.</p>
          <DemoStage scene="brochure" active={inBrochure} still={still} />
        </div>
      </section>

      {/* 5. One invitation */}
      <section id="start" className="hm-end">
        <div className="hm-end-in" data-reveal>
          <h2>Tell your property&apos;s story.</h2>
          <button type="button" className="hm-cta" onClick={onStart}>Create my first reel <IconArrow size={20} /></button>
        </div>
      </section>

      <footer className="hm-foot">
        <Wordmark onClick={() => go("overview")} />
        <p>Scripts are written by AI from your brochure. You approve what is posted and you are responsible for it under RERA Section 12.</p>
      </footer>
    </div>
  );
}
