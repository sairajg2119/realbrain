"use client";

import { useEffect, useState } from "react";
import "../app/landing.css";
import { ArchVisual } from "./ArchVisual";
import { Wordmark } from "./AppHeader";
import { IconArrow } from "./Icons";

/**
 * An illustrative script for a FICTIONAL project (the same sample used inside the app), so visitors see what they get:
 * a complete script with times, what is said and what is shown. Labelled as illustrative on the page.
 */
const SAMPLE = [
  { t: "0:00–0:03", label: "Hook", say: "If you are a family looking in Jakkur, watch this.", show: "Wide drone shot of the project site" },
  { t: "0:03–0:09", label: "Build", say: "Finding a home where your children have room to run is a real challenge.", show: "Render of the children's play area" },
  { t: "0:09–0:16", label: "Build", say: "Lakeview Residences gives you 70% open space across a 12-acre property.", show: "Panning shot of the landscaped gardens" },
  { t: "0:16–0:24", label: "Proof", say: "There is also a 25,000 sq ft clubhouse for your weekends.", show: "Clubhouse exterior render" },
  { t: "0:24–0:28", label: "CTA", say: "Comment SPACE and I will send you the floor plans.", show: "Text overlay on the project render" },
];

const PRINCIPLES = [
  { title: "Evidence before opinion", body: "Hooks come from 487 real estate reels, each compared with its own page's normal performance. We show you the reel behind every choice." },
  { title: "Your facts, nothing else", body: "Every number in a script is checked against your brochure. A number that is not there is flagged in red, not published." },
  { title: "Built for RERA", body: "Rules are built from the RERA Act and K-RERA's advertising circular, and labelled by how well each is sourced. The registration number goes on screen, and risky claims are flagged for you to confirm." },
];

const STEPS = [
  { n: "01", title: "Bring your brochure", body: "Any text-based real estate PDF, any size. Big files are read on your device, so nothing heavy is uploaded." },
  { n: "02", title: "Get complete scripts", body: "Two or three full scripts: what to say, what to show, how long each part takes, and who each one suits." },
  { n: "03", title: "Approve and create", body: "Check the flags, approve your favourite, then turn it into a reel with an AI presenter." },
];

export function Landing({ onStart }: { onStart: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const toHow = () => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="lp">
      <section className="lp-hero">
        <div className="lp-hero-art" aria-hidden="true"><ArchVisual /></div>
        <div className="lp-glow" aria-hidden="true" />
        <header className="lp-nav">
          <div className="lp-wrap">
            <Wordmark />
            <nav className="lp-nav-r" aria-label="Main">
              <button className="lp-navlink" onClick={toHow}>How it works</button>
              <button className="lp-btn lp-btn-sm" onClick={onStart}>Create a reel</button>
            </nav>
          </div>
        </header>

        <div className="lp-wrap lp-hero-in">
          <div>
            <p className="lp-label">The reel studio for real estate developers</p>
            <h1 className="lp-h1">Stories that <span>sell homes.</span></h1>
            <p className="lp-sub">Upload a brochure. Get complete, timed reel scripts, checked against your facts and RERA, and ready to shoot.</p>
            <div className="lp-cta">
              <button className="lp-btn" onClick={onStart}>Create my first reel <IconArrow size={18} /></button>
              <button className="lp-link" onClick={toHow}>See how it works</button>
            </div>
          </div>
          <figure className="lp-peek" aria-label="A script, illustrated">
            <figcaption className="lp-peek-tag">Every script, in full <em>Illustrative</em></figcaption>
            <ol>
              {SAMPLE.slice(0, 3).map((s) => (
                <li key={s.t}><b>{s.t.split("–")[0]}</b><span>{s.say}</span></li>
              ))}
            </ol>
            <p className="lp-peek-note">Fictional project</p>
          </figure>
        </div>
      </section>

      <section className="lp-stats" aria-label="What RealBrain is built on">
        <div className="lp-wrap">
          <div className="lp-stat"><strong>487</strong><span>real estate reels studied</span></div>
          <div className="lp-stat"><strong>25</strong><span>Instagram pages benchmarked</span></div>
          <div className="lp-stat"><strong>25</strong><span>compliance rules, sourced and labelled</span></div>
          <div className="lp-stat"><strong>3</strong><span>full scripts from every brochure</span></div>
        </div>
      </section>

      <section className="lp-split" aria-label="What you get">
        <button className="lp-panel lp-panel-a" onClick={onStart}>
          <div>
            <small>Step one</small>
            <h2>Understand</h2>
            <p>We read your brochure, find the real selling points, and flag what is missing or does not add up.</p>
          </div>
          <span className="lp-arrow">Upload a brochure <IconArrow size={16} /></span>
        </button>
        <button className="lp-panel lp-panel-b" onClick={onStart}>
          <div>
            <small>Step two</small>
            <h2>Script</h2>
            <p>Complete scripts with timings, visuals and a call to action, each written for the buyer it suits.</p>
          </div>
          <span className="lp-arrow">Get my scripts <IconArrow size={16} /></span>
        </button>
      </section>

      <section className="lp-paper" aria-labelledby="lp-principles">
        <div className="lp-wrap">
          <p className="lp-label">How we work</p>
          <h2 id="lp-principles">Honest by design.</h2>
          <div className="lp-paper-grid">
            {PRINCIPLES.map((p) => (
              <article key={p.title} className="lp-paper-item">
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="lp-how" aria-labelledby="lp-how-title">
        <div className="lp-wrap">
          <p className="lp-label">How it works</p>
          <h2 id="lp-how-title">Three steps. One calm workspace.</h2>
          <ol className="lp-steps">
            {STEPS.map((s) => (
              <li key={s.n} className="lp-step">
                <b>{s.n}</b>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lp-sample" aria-labelledby="lp-sample-title">
        <div className="lp-wrap lp-sample-grid">
          <div>
            <p className="lp-label">What you receive</p>
            <h2 id="lp-sample-title">A script you can shoot today.</h2>
            <p className="lp-lead">Not a hook and a hope. Each script gives you the line to say, the shot to show and the seconds it takes, plus a caption with your RERA number.</p>
          </div>
          <div className="lp-script">
            <div className="lp-script-top"><span>For families</span><em>About 28 seconds</em></div>
            <ol>
              {SAMPLE.map((s) => (
                <li key={s.t}>
                  <span className="t">{s.t}<i>{s.label}</i></span>
                  <div><p className="say">{s.say}</p><p className="show">Show: {s.show}</p></div>
                </li>
              ))}
            </ol>
            <p className="lp-script-note">Illustrative example for a fictional project</p>
          </div>
        </div>
      </section>

      <section className="lp-close" aria-labelledby="lp-close-title">
        <div className="lp-wrap">
          <h2 id="lp-close-title">Bring your brochure.</h2>
          <button className="lp-btn" onClick={onStart}>Create my first reel <IconArrow size={18} /></button>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-wrap">
          <span>RealBrain</span>
          <span>Scripts are written by AI from your brochure. You approve everything that is posted. Not legal advice.</span>
        </div>
      </footer>

      <button className={`lp-btn lp-btn-sm lp-float${scrolled ? " show" : ""}`} onClick={onStart} aria-hidden={!scrolled} tabIndex={scrolled ? 0 : -1}>
        Create a reel
      </button>
    </div>
  );
}
