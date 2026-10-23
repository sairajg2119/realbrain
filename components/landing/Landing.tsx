"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import "../../app/landing.css";
import { IconArrow } from "../Icons";
import { Logo } from "../Logo";
import { TowerArt } from "./TowerArt";

const SCENES = [
  { n: "01", label: "The project", title: "Every building has a story.", text: "Every project has something worth showing. RealBrain starts with the information you already have." },
  { n: "02", label: "The brochure", title: "Start with what you know.", text: "Bring the brochure, however long. RealBrain reads it and lays out the facts that matter: homes, sizes, amenities, location, registration." },
  { n: "03", label: "The script", title: "Find the story worth telling.", text: "A hook that stops the scroll, a story built from your facts, a clear call to action. Three scripts, each written for the buyers you want to reach, every number checked against your brochure." },
  { n: "04", label: "The reel", title: "Then bring it to life.", text: "Approve a script and it becomes a vertical reel: your project on screen, a presenter, and the RERA and AI labels in place." },
];

const INTRO_KEY = "rb-intro-seen";

/**
 * The homepage, told as one story: a tower at night draws itself, then, as you scroll, the building becomes a brochure,
 * the brochure a script, the script a reel. Everything that moves is driven by one requestAnimationFrame loop that writes
 * styles and CSS variables straight to the elements, so scrolling never re-renders React. `onStart` opens the workspace.
 */
export function Landing({ onStart }: { onStart: () => void }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // The drawing plays once per visit; coming back to the homepage shows the finished tower at once.
    let seen = false;
    try { seen = sessionStorage.getItem(INTRO_KEY) === "1"; sessionStorage.setItem(INTRO_KEY, "1"); } catch { /* storage blocked: just play it */ }
    el.dataset.intro = seen ? "seen" : "play";

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const top = el.querySelector<HTMLElement>(".ld-top");
    const hero = el.querySelector<HTMLElement>(".ld-hero");
    const art = el.querySelector<HTMLElement>(".ld-hero-art");
    const story = el.querySelector<HTMLElement>(".ld-story");
    const layers = Array.from(el.querySelectorAll<HTMLElement>(".st-layer"));
    const ticks = Array.from(el.querySelectorAll<HTMLElement>(".st-tick"));
    const scenes = Array.from(el.querySelectorAll<HTMLElement>(".ld-scene"));
    const target = { mx: 0, my: 0 };
    const cur = { mx: 0, my: 0 };
    let lastY = -1;
    let raf = 0;

    const frame = () => {
      raf = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      let again = false;
      // pointer parallax on the hero, eased
      cur.mx += (target.mx - cur.mx) * 0.08;
      cur.my += (target.my - cur.my) * 0.08;
      if (Math.abs(target.mx - cur.mx) > 0.001 || Math.abs(target.my - cur.my) > 0.001) again = true;
      hero?.style.setProperty("--mx", cur.mx.toFixed(3));
      hero?.style.setProperty("--my", cur.my.toFixed(3));
      if (y !== lastY) {
        lastY = y;
        top?.classList.toggle("solid", y > 24);
        if (art && !reduce) {
          const h = Math.min(1, y / vh);
          art.style.transform = `translate3d(0, ${(h * 60).toFixed(1)}px, 0) scale(${(1 + h * 0.06).toFixed(3)})`;
          art.style.opacity = (1 - h * 0.55).toFixed(3);
        }
        if (story && scenes.length) {
          // The stage follows the words: p is which scene sits at the middle of the screen, with the fraction between them.
          const centres = scenes.map((s) => { const b = s.getBoundingClientRect(); return b.top + b.height / 2; });
          const anchor = vh / 2;
          let p = 0;
          if (anchor >= centres[centres.length - 1]) p = centres.length - 1;
          else for (let i = 0; i < centres.length - 1; i++) {
            if (anchor >= centres[i] && anchor < centres[i + 1]) { p = i + (anchor - centres[i]) / (centres[i + 1] - centres[i]); break; }
          }
          layers.forEach((l, i) => {
            const d = p - i;
            const o = Math.max(0, Math.min(1, 1 - Math.abs(d) * 1.7));
            l.style.opacity = o.toFixed(3);
            l.style.transform = reduce ? "none" : `translate3d(0, ${(-d * 36).toFixed(1)}px, 0) scale(${(1 - Math.min(1, Math.abs(d)) * 0.04).toFixed(3)})`;
            l.style.visibility = o < 0.01 ? "hidden" : "visible";
            l.classList.toggle("on", o > 0.55);
          });
          ticks.forEach((t, i) => t.classList.toggle("on", Math.round(p) === i));
        }
      }
      if (again) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const onMove = (e: PointerEvent) => {
      target.mx = (e.clientX / window.innerWidth - 0.5) * 2;
      target.my = (e.clientY / window.innerHeight - 0.5) * 2;
      kick();
    };
    kick();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    if (finePointer && !reduce) window.addEventListener("pointermove", onMove, { passive: true });

    // Scene text rises in as it arrives.
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.3 });
    el.querySelectorAll(".ld-scene, .ld-end-in").forEach((n) => io.observe(n));

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      window.removeEventListener("pointermove", onMove);
      io.disconnect();
    };
  }, []);

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div ref={root} className="ld">
      <header className="ld-top">
        <Logo onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
        <nav className="ld-nav" aria-label="Sections">
          <a href="#story" onClick={(e) => { e.preventDefault(); go("story"); }}>The story</a>
          <a href="#start" onClick={(e) => { e.preventDefault(); go("start"); }}>Start</a>
        </nav>
        <button type="button" className="ld-btn ld-btn-sm" onClick={onStart}>Create my first reel</button>
      </header>

      <main>
        <section className="ld-hero" aria-labelledby="ld-h1">
          <div className="ld-hero-art"><TowerArt /></div>
          <div className="ld-hero-shade" aria-hidden="true" />
          <div className="ld-hero-copy">
            <p className="ld-eye rv" style={{ "--rv": 0 } as React.CSSProperties}>The AI marketing studio for real estate</p>
            <h1 id="ld-h1" className="ld-h1" data-focus>
              <span className="ln rv" style={{ "--rv": 1 } as React.CSSProperties}>One project.</span>
              <span className="ln rv" style={{ "--rv": 2 } as React.CSSProperties}><em>A thousand stories.</em></span>
            </h1>
            <p className="ld-sub rv" style={{ "--rv": 3 } as React.CSSProperties}>Your brochure holds the details. RealBrain turns them into compelling property reels, tailored to the buyers you want to reach.</p>
            <div className="ld-ctas rv" style={{ "--rv": 4 } as React.CSSProperties}>
              <button type="button" className="ld-btn" onClick={onStart}>Bring your project to life <IconArrow size={18} /></button>
              <button type="button" className="ld-btn ld-btn-ghost" onClick={() => go("story")}>Explore the experience</button>
            </div>
            <p className="ld-line rv" style={{ "--rv": 5 } as React.CSSProperties}>From brochure to script to video. One seamless creative journey.</p>
          </div>
        </section>

        <section id="story" className="ld-story" aria-label="How RealBrain works">
          <div className="ld-stage-wrap">
            <div className="ld-stage">
              <div className="st-layer st-tower"><TowerArt className="close" /></div>

              <div className="st-layer st-doc" aria-hidden="true">
                <div className="doc">
                  <div className="doc-cover"><Image src="/photos/hero.jpg" alt="" fill sizes="(max-width: 860px) 70vw, 360px" /></div>
                  <div className="doc-body">
                    <p className="doc-kicker">Project brochure</p>
                    {["Homes and configurations", "Carpet areas", "Amenities", "Location", "RERA registration"].map((f, i) => (
                      <div key={f} className="doc-row" style={{ "--i": i } as React.CSSProperties}><span>{f}</span><i /></div>
                    ))}
                  </div>
                </div>
                <p className="st-note">Illustration. Your brochure&apos;s own facts appear here once you upload it.</p>
              </div>

              <div className="st-layer st-script" aria-hidden="true">
                <div className="scr">
                  <p className="scr-k">Hook · 0:00–0:03</p>
                  <p className="scr-hook">Eight indoor badminton courts, right here.</p>
                  <div className="scr-beat" style={{ "--i": 0 } as React.CSSProperties}><span>0:03</span><p>Five tennis courts, five basketball courts and five pickleball courts for your daily games.</p></div>
                  <div className="scr-beat" style={{ "--i": 1 } as React.CSSProperties}><span>0:09</span><p>All of it across a twenty plus acre sporting facility.</p></div>
                  <div className="scr-beat" style={{ "--i": 2 } as React.CSSProperties}><span>0:15</span><p>Comment SPORTS to get all the details.</p></div>
                  <p className="scr-dir"><span>For families</span><span>About 30 seconds</span><span>Every number checked</span></p>
                </div>
                <p className="st-note">Lines from a script RealBrain wrote from a real brochure.</p>
              </div>

              <div className="st-layer st-reel" aria-hidden="true">
                <div className="reel">
                  <Image src="/photos/entrance.jpg" alt="" fill sizes="(max-width: 860px) 50vw, 260px" />
                  <svg className="reel-person" viewBox="0 0 120 160" aria-hidden="true"><circle cx="60" cy="42" r="22" /><path d="M18 160c2-46 18-70 42-70s40 24 42 70z" /></svg>
                  <span className="reel-ai">AI-generated</span>
                  <span className="reel-rera">RERA: [registration number]<br />rera.karnataka.gov.in</span>
                  <p className="reel-cap">Eight indoor badminton courts, right here.</p>
                </div>
                <p className="st-note">Visual concept. Avatar video is not connected yet; your reel will be the real render.</p>
              </div>

              <ol className="st-ticks" aria-hidden="true">
                {SCENES.map((s) => <li key={s.n} className="st-tick">{s.label}</li>)}
              </ol>
            </div>
          </div>

          <div className="ld-scenes">
            {SCENES.map((s) => (
              <article key={s.n} className="ld-scene">
                <p className="ld-eye">{s.n} · {s.label}</p>
                <h2>{s.title}</h2>
                <p className="ld-text">{s.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="start" className="ld-end">
          <div className="ld-end-in">
            <h2>Your project. <em>Its next great story.</em></h2>
            <p className="ld-text">Start with a brochure. Explore new ways to present your project.</p>
            <button type="button" className="ld-btn" onClick={onStart}>Create my first reel <IconArrow size={18} /></button>
          </div>
        </section>
      </main>

      <footer className="ld-foot">
        <Logo />
        <p>Scripts are written by AI from your brochure. You approve what is posted and remain responsible for it under RERA Section 12.</p>
      </footer>
    </div>
  );
}
