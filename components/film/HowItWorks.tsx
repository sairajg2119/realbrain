"use client";

import { useEffect, useRef, useState } from "react";
import { IconArrow, IconCheck } from "../Icons";

/*
  Everything quoted below comes from one real RealBrain run on the Nambiar District 25 brochure: the facts as the reader
  pulled them out, and four scripts that passed every check (numbers, RERA, length), word for word. Nothing is rewritten.
  It is shown to explain RealBrain; it is not an advertisement for that project.
*/
const FACTS: { k: string; v: string[]; more?: number }[] = [
  { k: "Project", v: ["Nambiar District 25"] },
  { k: "Developer", v: ["Nambiar Builders"] },
  { k: "Location", v: ["Chandapura–Dommasandra Road"] },
  { k: "Homes", v: ["2 BED 2T SALE AREA - 1260 sqft CARPET AREA - 838 sqft", "3BED 3T SALE AREA - 2060 sqft CARPET AREA - 1332 sqft", "4 BED 5T SALE AREA - 2980 sqft CARPET AREA - 1910 sqft"], more: 8 },
  { k: "Amenities", v: ["7 ACRE CLUBHOUSE", "FIFA-SIZED PITCH", "Olympic-length Pool", "8 INDOOR BADMINTON COURTS"], more: 15 },
  { k: "Key numbers", v: ["85% open space", "600m from upcoming Metro Station", "3500+ trees"], more: 13 },
  { k: "RERA", v: ["PRM/KA/RERA/1251/308/PR/260526/008686"] },
];

const STORIES: { id: string; label: string; secs: number; hook: string; body: string; cta: string }[] = [
  {
    id: "families",
    label: "Families",
    secs: 47,
    hook: "A FIFA-sized pitch right at home.",
    body: "Yes, really. This isn't just a small playground. We're talking about a massive 20+ acre sporting facility. You get 5 tennis courts, 5 basketball courts, and even 8 indoor badminton courts for those rainy days. There's even an Olympic-length pool and 5 pickleball courts. It's basically a private sports club for your family. All this sits inside a community with 85% open space and over 3500+ trees to keep things fresh. The best part is the 7 acre clubhouse. It's one of the largest spaces for you to relax and connect.",
    cta: "Comment SPORT to get the full list of amenities and floor plans sent to your DMs.",
  },
  {
    id: "first",
    label: "First-time buyers",
    secs: 45,
    hook: "Working at Wipro, Cisco, or ITPL?",
    body: "You could be home in just 10 mins. No more losing your life to Bengaluru traffic every single day. There is even an upcoming metro station planned just 600m away from your front gate. You are also surrounded by over 40+ Schools, so you are set for the long run in this growing corridor. The homes are spacious too. This three bed apartment gives you a carpet area of 1332 sqft. You get a 7 acre clubhouse and a massive 20+ acre sporting facility right where you live.",
    cta: "Comment METRO and I will send you the location details and the latest pricing.",
  },
  {
    id: "nri",
    label: "NRI buyers",
    secs: 39,
    hook: "Two point five lakh square feet.",
    body: "That is the massive amount of space dedicated to amenities in this new Phase 3 launch. We are talking about 85% open space. It is like living in a forest with 3500+ trees. The 4 BED 5T homes are huge, with a carpet area of 1910 sqft. You get a 7 ACRE CLUBHOUSE and over 150+ OUTDOOR AMENITIES to explore. The location is perfect too, just 10 mins from Wipro, Cisco, and ITPL.",
    cta: "If you want a home with this much breathing room, comment SPACE for the details.",
  },
  {
    id: "investors",
    label: "Investors",
    secs: 32,
    hook: "Three things to know about this development.",
    body: "First, choose from configurations including two BHK homes of 1,252 sq ft sale area and 1,260 sq ft sale area. Second, scale up to three BHK layouts going from 1,518 sq ft sale area up to 2,075 sq ft sale area. Third, the four BHK homes offer expansive spaces up to 2,980 sq ft sale area with massive architectural scale.",
    cta: "Comment INVEST and we will send all floor plans.",
  },
];

/**
 * Below the film: what RealBrain does, in three stages that rise in as they arrive. The brochure (the facts read from a real
 * one), the story (the same project told four ways, one per buyer), and the reel (a sample preview, labelled as one, that
 * carries the hook of whichever story is chosen). Then the button into the real workflow.
 */
export function HowItWorks({ onStart, still }: { onStart: () => void; still: boolean }) {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [who, setWho] = useState(STORIES[0].id);
  const story = STORIES.find((s) => s.id === who) ?? STORIES[0];

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.2 });
    el.querySelectorAll(".hw-stage, .hw-head, .hw-end").forEach((n) => io.observe(n));
    // The sample reel plays only while it is on screen, and not at all with reduced motion.
    const v = video.current;
    const vo = new IntersectionObserver(([e]) => {
      if (!v || still) return;
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.25 });
    if (v) vo.observe(v);
    return () => { io.disconnect(); vo.disconnect(); };
  }, [still]);

  return (
    <section ref={root} id="how" className="hw" aria-labelledby="hw-h">
      <div className="hw-head">
        <p className="fm-eye">How it works</p>
        <h2 id="hw-h">From brochure to reel, <em>in three steps.</em></h2>
        <p className="hw-lead">Shown with one real run: a Bengaluru project brochure went in, and this is what came out.</p>
      </div>

      <article className="hw-stage">
        <div className="hw-words">
          <p className="hw-n">01 · The brochure</p>
          <h3>It reads what you already have.</h3>
          <p>Upload the brochure, however long. RealBrain lays out the facts a reel can use: the homes, the sizes, the amenities, the location, the RERA number. What the brochure does not say stays out.</p>
        </div>
        <figure className="hw-doc">
          <div className="doc-top">
            <span className="doc-file">nambiar-district-25.pdf</span>
            <span className="doc-tag">Real run</span>
          </div>
          <dl>
            {FACTS.map((f, i) => (
              <div key={f.k} className="doc-fact" style={{ "--i": i } as React.CSSProperties}>
                <dt>{f.k}</dt>
                <dd>
                  {f.v.map((x) => <span key={x}>{x}</span>)}
                  {f.more ? <span className="doc-more">and {f.more} more</span> : null}
                </dd>
              </div>
            ))}
            <div className="doc-fact doc-miss" style={{ "--i": FACTS.length } as React.CSSProperties}>
              <dt>Price</dt>
              <dd><span>Not in the brochure, so no script mentions it.</span></dd>
            </div>
          </dl>
          <figcaption>Facts as RealBrain read them from the Nambiar District 25 brochure, unedited. Shown to explain RealBrain, not to advertise the project.</figcaption>
        </figure>
      </article>

      <article className="hw-stage">
        <div className="hw-words">
          <p className="hw-n">02 · The story</p>
          <h3>One project, told to each buyer.</h3>
          <p>Pick up to three kinds of buyer. Each script opens with a hook for them, tells the project through the facts they care about, and ends with one clear ask. Every number is matched against the brochure before you see it.</p>
        </div>
        <figure className="hw-script">
          <div className="sc-who" role="radiogroup" aria-label="Buyer">
            {STORIES.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={who === s.id} onClick={() => setWho(s.id)}>{s.label}</button>
            ))}
          </div>
          <div className="sc-card" key={story.id} aria-live="polite">
            <p className="sc-k">Hook</p>
            <p className="sc-hook">{story.hook}</p>
            <p className="sc-k">Story</p>
            <p className="sc-body">{story.body}</p>
            <p className="sc-k">Call to action</p>
            <p className="sc-cta">{story.cta}</p>
            <p className="sc-meta">
              <span>About {story.secs} seconds</span>
              <span><IconCheck size={15} /> Every number found in the brochure</span>
              <span><IconCheck size={15} /> RERA number in the caption</span>
            </p>
          </div>
          <figcaption>Written by RealBrain from the same brochure, quoted exactly as it came out.</figcaption>
        </figure>
      </article>

      <article className="hw-stage" id="studio">
        <div className="hw-words">
          <p className="hw-n">03 · The reel</p>
          <h3>Approve one, and it becomes a reel.</h3>
          <p>The approved script becomes a vertical video: the project on screen, a presenter speaking your words, the caption, and the RERA and AI-generated labels in place. Nothing is posted until you say so.</p>
          <p className="hw-honest">Presenter video is not connected yet. Today RealBrain takes you as far as an approved, checked script.</p>
        </div>
        <figure className="hw-reel">
          <div className="phone">
            <video ref={video} src="/showcase/reel-1.mp4" muted loop playsInline preload="metadata" controls={still} aria-label="Sample preview: stock footage of a house with a pool" />
            <span className="ph-ai">AI-generated</span>
            <p className="ph-cap" key={story.id}>{story.hook}</p>
            <span className="ph-rera">RERA: PRM/KA/RERA/1251/308/PR/260526/008686<br />rera.karnataka.gov.in</span>
          </div>
          <figcaption>Sample preview. Stock footage from Pexels, not the project, with the hook of the {story.label.toLowerCase()} script on screen.</figcaption>
        </figure>
      </article>

      <div className="hw-end">
        <h2>Your project. <em>Its next great story.</em></h2>
        <p className="hw-lead">Start with a brochure. The first scripts are ready in a minute or two.</p>
        <button type="button" className="fm-btn" onClick={onStart}>Create a reel <IconArrow size={18} /></button>
      </div>
    </section>
  );
}
