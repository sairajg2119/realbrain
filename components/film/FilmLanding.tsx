"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "../../app/film.css";
import type { LightId } from "@/lib/scene/timeOfDay";
import { HouseStage, PhotoWalk, type SceneState } from "../HouseStage";
import { IconArrow } from "../Icons";
import { Logo, LogoMark } from "../Logo";
import { HowItWorks } from "./HowItWorks";

/**
 * Where the camera stands, as a point on its one path: 0 far out over the garden, 1 the front door, 2 inside the living room.
 * `photo` is the same place on the photo walk, which changes pictures at different points, so each stop lands on one picture.
 */
const PLACES: { id: string; label: string; t: number; photo: number }[] = [
  { id: "arrival", label: "Arrival", t: 0.08, photo: 0 },
  { id: "garden", label: "The garden", t: 0.42, photo: 0.5 },
  { id: "door", label: "Front door", t: 1.02, photo: 1.15 },
  { id: "living", label: "Living room", t: 2, photo: 2 },
];
const LIGHT_CHOICES: { id: LightId; label: string }[] = [
  { id: "morning", label: "Morning" },
  { id: "golden", label: "Golden hour" },
  { id: "dusk", label: "Dusk" },
  { id: "night", label: "Night" },
];
const BLACK_MS = 1800;
const FILM_MS = 12000;
const MOVE_MS = 2400;
const SEEN_KEY = "rb-film-seen";

type Mode = "black" | "film" | "site" | "explore";
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

/**
 * The homepage as a short film: a black frame and the wordmark, the house at golden hour, a slow walk up to the door, the
 * door opening, the living room; then the words and the buttons arrive and it is a website. "Skip intro" is there from the
 * first frame, the film plays once per visit, and afterwards the house can be explored place by place and in four lights.
 * The house is the one scene (HouseStage); this component only says where its camera should be (`drive`, 0 to 2) and
 * when it is out of sight (`paused`). On a phone, or when the browser cannot draw 3D, the same walk is told in photographs;
 * with reduced motion there is no film, just the living room and the website.
 */
export function FilmLanding({ onStart }: { onStart: () => void }) {
  const drive = useRef<number | null>(0);
  const paused = useRef(false);
  const anim = useRef(0);
  const top = useRef<HTMLElement>(null);
  const seen = useRef<boolean | null>(null);
  const [mode, setMode] = useState<Mode>("black");
  const [scene, setScene] = useState<SceneState>("pending");
  const [light, setLight] = useState<LightId>("golden");
  const [place, setPlace] = useState("living");
  const [phone, setPhone] = useState(false);
  const [still, setStill] = useState(false);

  /** Move the camera along its path to `to`, eased, over `ms` (at once with reduced motion). */
  const glide = useCallback((to: number, ms: number, done?: () => void) => {
    cancelAnimationFrame(anim.current);
    const from = drive.current ?? 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const u = ms <= 0 ? 1 : Math.min(1, (now - t0) / ms);
      drive.current = from + (to - from) * ease(u);
      if (u < 1) anim.current = requestAnimationFrame(step);
      else done?.();
    };
    anim.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStill(reduce);
    setPhone(window.innerWidth < 720);
    // Read once per mount: in development React runs this effect twice, and the second run must not count as a return visit.
    if (seen.current === null) {
      try { seen.current = sessionStorage.getItem(SEEN_KEY) === "1"; sessionStorage.setItem(SEEN_KEY, "1"); } catch { seen.current = false; }
    }
    if (seen.current || reduce) {
      drive.current = 2;
      setMode("site");
      return;
    }
    const t = window.setTimeout(() => {
      setMode("film");
      glide(2, FILM_MS, () => setMode((m) => (m === "film" ? "site" : m)));
    }, BLACK_MS);
    return () => { window.clearTimeout(t); cancelAnimationFrame(anim.current); };
  }, [glide]);

  // The scene stops drawing once the page has scrolled past it; the header gets a background once the page moves.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      paused.current = y > window.innerHeight * 1.05;
      top.current?.classList.toggle("solid", y > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const photos = phone || scene === "off";
  const ms = (n: number) => (still ? 0 : n);
  const skip = () => {
    glide(2, ms(900));
    setMode("site");
  };
  const goPlace = (id: string) => {
    const p = PLACES.find((x) => x.id === id);
    if (!p) return;
    setPlace(id);
    glide(photos ? p.photo : p.t, ms(MOVE_MS));
  };
  const tour = () => {
    setPlace("arrival");
    glide(0.04, ms(1800), () => { setPlace("living"); glide(2, ms(FILM_MS)); });
  };
  const backToSite = () => {
    setPlace("living");
    glide(2, ms(MOVE_MS));
    setMode("site");
  };
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  const home = () => window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });

  const filming = mode === "black" || mode === "film";

  return (
    <div className="fm" data-mode={mode}>
      <header ref={top} className="fm-top" inert={filming}>
        <Logo onClick={home} />
        <nav className="fm-nav" aria-label="Main">
          <a href="#top" onClick={(e) => { e.preventDefault(); home(); }}>Home</a>
          <a href="#how" onClick={(e) => { e.preventDefault(); go("how"); }}>How it works</a>
          <a href="#studio" onClick={(e) => { e.preventDefault(); go("studio"); }}>Video studio</a>
        </nav>
        <button type="button" className="fm-btn fm-btn-sm" onClick={onStart}>Create a reel</button>
      </header>

      <div className="fm-hero" id="top">
        {phone ? (
          <div className="hs" data-scene="off" data-light={light} aria-hidden="true">
            <div className="hs-poster"><PhotoWalk drive={drive} /></div>
          </div>
        ) : (
          <HouseStage light={light} phase="outside" still={still} calm={false} scene={scene} onScene={setScene} onArrive={() => {}} drive={drive} paused={paused} />
        )}
        <div className="fm-shade" aria-hidden="true" />

        <div className="fm-black" aria-hidden="true">
          <span className="fm-mark"><LogoMark size={44} /><span>RealBrain</span></span>
        </div>

        {mode === "film" && (
          <p className="fm-caps" aria-hidden="true">
            <span>Every home has a story.</span>
            <span>The best ones open a door.</span>
            <span>RealBrain tells it to the right buyer.</span>
          </p>
        )}

        {filming && <button type="button" className="fm-skip" onClick={skip}>Skip intro</button>}

        <div className="fm-copy" inert={mode !== "site"}>
          <p className="fm-eye">The AI marketing studio for real estate</p>
          <h1 className="fm-h1" data-focus>Every home has a story. <em>We help you tell it.</em></h1>
          <p className="fm-sub">Bring your project brochure. RealBrain writes reel scripts for the buyers you want to reach, checks every number against the brochure, and turns the one you approve into a video.</p>
          <div className="fm-ctas">
            <button type="button" className="fm-btn" onClick={onStart}>Create a reel <IconArrow size={18} /></button>
            <button type="button" className="fm-btn fm-ghost" onClick={() => setMode("explore")}>Explore the house</button>
          </div>
          <p className="fm-note">
            {photos
              ? phone ? "On a phone the walk is told in photographs." : "This browser has 3D turned off, so the walk is told in photographs."
              : "The house is a 3D scene made for RealBrain, not a listing."}
          </p>
        </div>

        {mode === "explore" && (
          <div className="fm-explore" role="group" aria-label="Explore the house">
            <div className="fm-row" role="radiogroup" aria-label="Where to stand">
              {PLACES.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={place === p.id} onClick={() => goPlace(p.id)}>{p.label}</button>
              ))}
              <button type="button" className="fm-tour" onClick={tour}>Guided tour</button>
            </div>
            <div className="fm-row" role="radiogroup" aria-label="Light">
              {LIGHT_CHOICES.map((l) => (
                <button key={l.id} type="button" role="radio" aria-checked={light === l.id} onClick={() => setLight(l.id)}>{l.label}</button>
              ))}
            </div>
            <button type="button" className="fm-back" onClick={backToSite}>Back to RealBrain</button>
          </div>
        )}

        {mode === "site" && (
          <a className="fm-down" href="#how" onClick={(e) => { e.preventDefault(); go("how"); }}>How it works</a>
        )}
      </div>

      <HowItWorks onStart={onStart} still={still} />

      <footer className="fm-foot">
        <Logo />
        <p>Scripts are written by AI from your brochure. You approve what is posted and remain responsible for it under RERA Section 12. Photographs from Unsplash and clips from Pexels, used under their free licences.</p>
      </footer>
    </div>
  );
}
