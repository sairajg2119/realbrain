"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "../app/site.css";
import { Wordmark } from "./AppHeader";
import { DemoStage, type SceneId } from "./DemoStage";
import { IconArrow } from "./Icons";

const STEPS: { id: SceneId; n: string; title: string; text: string }[] = [
  { id: "brochure", n: "01", title: "Bring the brochure", text: "Attach the PDF, however big, and add a line about the property if you like. RealBrain reads it, numbers every fact, and already knows the market." },
  { id: "script", n: "02", title: "Get scripts you can shoot", text: "Three complete scripts, each with timed beats, written for the buyers this property suits. Every number is checked against your brochure." },
  { id: "reel", n: "03", title: "See the reel", text: "Your script becomes a vertical reel with a presenter, your renders and the RERA and AI labels on screen, ready for your review." },
  { id: "refine", n: "04", title: "Refine it by typing", text: "Ask for a warmer hook, a shorter ending or a different angle in plain words. The numbers stay matched to the brochure." },
];

const SAMPLES = [
  { img: "/photos/hero.jpg", tag: "Families", line: "Eight indoor badminton courts right here." },
  { img: "/photos/entrance.jpg", tag: "First-time buyers", line: "Home in ten minutes from the office." },
  { img: "/photos/hall.jpg", tag: "NRI buyers", line: "Space to breathe, wherever you live." },
  { img: "/photos/hallway.jpg", tag: "Everyone", line: "Your own sports club, right at home." },
];

const PLANS = [
  { name: "Free", inr: "₹0", usd: "$0", note: "To try it", feats: ["1 reel a month", "3 scripts per brochure", "RERA and number checks", "RealBrain mark on the reel"], cta: "Start free", hi: false },
  { name: "Starter", inr: "₹1,499", usd: "$19", note: "For one project", feats: ["5 reels a month", "Refine by typing", "No RealBrain mark", "Email support"], cta: "Choose Starter", hi: false },
  { name: "Studio", inr: "₹4,999", usd: "$59", note: "For active developers", feats: ["20 reels a month", "Your brand on every reel", "Several projects", "Priority rendering"], cta: "Choose Studio", hi: true },
  { name: "Agency", inr: "₹14,999", usd: "$179", note: "For teams and agencies", feats: ["80 reels a month", "Team seats", "Client workspaces", "Account manager"], cta: "Talk to us", hi: false },
];

const SOCIALS = [
  { name: "X", d: "M18.2 3h3L14.6 10.6 22.4 21h-6.1l-4.8-6.3L6 21H3l7.1-8.1L2.6 3h6.3l4.3 5.7L18.2 3zm-1 16.2h1.7L7.9 4.7H6.1l11.1 14.5z" },
  { name: "Instagram", d: "M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zm0 2a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H7zm5 3a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4zm5.2-3.4a1 1 0 110 2 1 1 0 010-2z" },
  { name: "YouTube", d: "M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 002.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 001.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 001.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3L10 15z" },
  { name: "LinkedIn", d: "M6.9 8.9H3.7V20h3.2V8.9zM5.3 3.8a1.9 1.9 0 100 3.8 1.9 1.9 0 000-3.8zM20.3 13.6c0-3-1.6-4.9-4.2-4.9-1.3 0-2.3.6-2.9 1.5h-.1V8.9H10V20h3.2v-5.5c0-1.4.3-2.8 2-2.8s1.8 1.6 1.8 2.9V20h3.3v-6.4z" },
];

/**
 * One long page, set like a studio's own site. Top: the house and the welcome. Then what RealBrain does, played as short
 * walkthroughs. Then sample reels and pricing. Any "Create my first reel" opens the door: the camera walks to the entrance,
 * the door opens onto the hall, and the hall is where the real work begins (`onStart`).
 * `name` would come from a signed-in user. There is no sign-in yet, so a plain greeting is used.
 */
export function Inside({ onStart }: { onStart: () => void }) {
  const [still, setStill] = useState(false);
  const [inStage, setInStage] = useState<SceneId | null>(null);
  const [spy, setSpy] = useState<string>("top");
  const [pill, setPill] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Which walkthrough is on screen (it plays only then), which section the pill points at, and when the pill appears.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id;
          if (!e.isIntersecting) {
            setInStage((s) => (s === id ? null : s));
            continue;
          }
          setSpy(id);
          if (STEPS.some((s) => s.id === id)) setInStage(id as SceneId);
        }
      },
      { threshold: 0.45 },
    );
    el.querySelectorAll<HTMLElement>("[data-spy]").forEach((n) => io.observe(n));
    const onScroll = () => setPill(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const go = useCallback((id: string) => document.getElementById(id)?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" }), [still]);

  const begin = onStart; // the door was walked through already; from here the button goes straight to the work

  return (
    <div ref={root} className="sb" data-pill={pill}>
      <header className="sb-top">
        <Wordmark onClick={() => go("top")} />
        <div className="sb-social" aria-label="Follow RealBrain">
          {SOCIALS.map((s) => (
            <a key={s.name} href="#" aria-label={`${s.name} (link coming soon)`} title={`${s.name}: link coming soon`} onClick={(e) => e.preventDefault()}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d={s.d} /></svg>
            </a>
          ))}
          <button type="button" className="sb-mini" onClick={begin}>Create</button>
        </div>
      </header>

      <section id="top" data-spy className="sb-hero">
        <div className="sb-shade" aria-hidden="true" />
        <div className="sb-hero-in">
          <p className="sb-hi">RealBrain</p>
          <h1 className="sb-tag">Stories that <span>sell home.</span></h1>
          <p className="sb-sub">Welcome in. Turn your property into a story worth watching, starting with the brochure.</p>
          <div className="sb-cta-row">
            <button type="button" className="sb-cta" onClick={begin}>Create my first reel <IconArrow size={20} /></button>
            <button type="button" className="sb-link" onClick={() => go("brochure")}>See how it works</button>
          </div>
        </div>
      </section>

      {STEPS.map((s) => (
        <section key={s.id} id={s.id} data-spy className="sb-step" data-word={s.title.split(" ").pop()}>
          <div className="sb-step-in">
            <div className="sb-copy">
              <p className="sb-eye">{s.n}</p>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
              {s.id === "refine" && <button type="button" className="sb-cta sb-cta-dark" onClick={begin}>Try it with your brochure <IconArrow size={20} /></button>}
            </div>
            <DemoStage scene={s.id} active={inStage === s.id} still={still} />
          </div>
        </section>
      ))}

      <section id="examples" data-spy className="sb-examples">
        <div className="sb-head">
          <p className="sb-eye">Sample reels</p>
          <h2>One brochure, many ways to tell it.</h2>
          <p>Previews of the kinds of reels RealBrain writes for different buyers. Your own videos will play here.</p>
        </div>
        <ul className="sb-strip">
          {SAMPLES.map((c) => (
            <li key={c.tag} className="sb-card">
              <div className="sb-phone"><img src={c.img} alt="" loading="lazy" /><span className="sb-play" aria-hidden="true" /><p>{c.line}</p></div>
              <b>{c.tag}</b>
              <small>Sample preview</small>
            </li>
          ))}
        </ul>
      </section>

      <section id="pricing" data-spy className="sb-pricing">
        <div className="sb-head">
          <p className="sb-eye">Pricing</p>
          <h2>Start free. Pay when it earns its keep.</h2>
          <p>Draft launch pricing, per month. Final numbers will be confirmed before launch.</p>
        </div>
        <ul className="sb-plans">
          {PLANS.map((p) => (
            <li key={p.name} className={`sb-plan${p.hi ? " hi" : ""}`}>
              <h3>{p.name}</h3>
              <p className="sb-price"><b>{p.inr}</b><span>/ month · {p.usd}</span></p>
              <p className="sb-note">{p.note}</p>
              <ul>{p.feats.map((f) => <li key={f}>{f}</li>)}</ul>
              <button type="button" className="sb-plan-cta" onClick={begin}>{p.cta}</button>
            </li>
          ))}
        </ul>
      </section>

      <footer className="sb-foot">
        <Wordmark onClick={() => go("top")} />
        <p>Scripts are written by AI from your brochure. You approve what is posted and you are responsible for it under RERA Section 12.</p>
        <div className="sb-social">
          {SOCIALS.map((s) => (
            <a key={s.name} href="#" aria-label={`${s.name} (link coming soon)`} onClick={(e) => e.preventDefault()}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d={s.d} /></svg>
            </a>
          ))}
        </div>
      </footer>

      <nav className="sb-pill" aria-label="Sections">
        {[["brochure", "Brochure"], ["script", "Script"], ["reel", "Reel"], ["refine", "Refine"], ["pricing", "Pricing"]].map(([id, label]) => (
          <button key={id} type="button" aria-current={spy === id} onClick={() => go(id)}>{label}</button>
        ))}
        <button type="button" className="sb-pill-cta" onClick={begin}>Create my first reel</button>
      </nav>

    </div>
  );
}
