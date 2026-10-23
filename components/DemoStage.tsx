"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Four short walkthroughs of what RealBrain does, played in a product window: bring a brochure, get a script, see the reel,
 * refine it by typing. They are animations of the real flow, driven by a clock, using real wording from a checked script.
 * They are labelled as walkthroughs and are not footage of a finished reel.
 */
export type SceneId = "brochure" | "script" | "reel" | "refine";

/** Seconds since the stage became active, looping every `total`. When `still`, it rests on the finished state. */
function useClock(active: boolean, total: number, still: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (still) return setT(total * 0.92);
    if (!active) return setT(0);
    const start = performance.now();
    const id = setInterval(() => setT(((performance.now() - start) / 1000) % total), 90);
    return () => clearInterval(id);
  }, [active, total, still]);
  return t;
}

const typed = (text: string, t: number, start: number, cps = 26) => text.slice(0, Math.max(0, Math.min(text.length, Math.floor((t - start) * cps))));

function Window({ title, children, label, tag = "Walkthrough · not a finished reel" }: { title: string; children: React.ReactNode; label: string; tag?: string }) {
  return (
    <div className="dw" role="img" aria-label={label}>
      <div className="dw-bar"><span /><span /><span /><b>{title}</b></div>
      <div className="dw-body">{children}</div>
      <p className="dw-tag">{tag}</p>
    </div>
  );
}

/** The reel that comes in at the end of the brochure walkthrough. To show your own, put it in public/showcase and change this. */
export const DEMO_REEL = "/showcase/reel-2.mp4";

const DEMO_CAPTIONS = ["A FIFA-sized pitch right at home.", "Twenty plus acres of sport.", "Comment SPORT for the details."];

/**
 * The whole flow in one loop: the brochure drops in, the project's name and a line about it are typed, two audiences are
 * chosen, Create scripts is pressed, the brochure is read, and a reel slides in beside it and plays.
 */
function Brochure({ active, still }: { active: boolean; still: boolean }) {
  const t = useClock(active, 18, still);
  const name = typed("Nambiar District 25 · Phase 3", t, 1.1, 22);
  const note = typed("3 and 4 BHK homes. Lean on the 7 acre clubhouse and the open space.", t, 2.8, 26);
  const pressed = t > 7.4;
  const pct = Math.min(1, Math.max(0, (t - 7.8) / 2.6));
  const reel = t > 10.6;
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (reel && active && !still) v.play().catch(() => {});
    else { v.pause(); if (!reel) v.currentTime = 0; }
  }, [reel, active, still]);
  const cap = DEMO_CAPTIONS[Math.min(DEMO_CAPTIONS.length - 1, Math.floor(Math.max(0, t - 10.8) / 2.3))];
  return (
    <div className="bd">
      <Window title="New reel" label="A brochure is dropped in, the project is named and described, two audiences are chosen, Create scripts is pressed and the brochure is read." tag="Walkthrough of the real flow">
        <div className="dw-chat">
          <div className={`dw-file dw-drop${t > 0.4 ? " on" : ""}`}><i /> <span>Nambiar-District-25-Phase-3.pdf</span><em>26 MB</em></div>
          <div className="dw-input">
            <p className="dw-name">{name || <span className="dw-ph">Project name</span>}</p>
            <p>{note || <span className="dw-ph">Tell me about the property…</span>}<u className={t % 1 < 0.5 && t > 2.8 && t < 7 ? "on" : ""} /></p>
            <div className="dw-chips" aria-hidden="true">
              <span className={t > 5.8 ? "" : "on"}>Best fit</span>
              <span className={t > 5.8 ? "on" : ""}>Families</span>
              <span className={t > 6.4 ? "on" : ""}>First-time buyers</span>
              <span>Investors</span>
            </div>
            <div className="dw-row"><span className="dw-clip">Brochure attached</span><b className={`dw-send${pressed ? " go" : ""}`}>Create scripts →</b></div>
          </div>
          {pressed && (
            <div className="dw-read">
              <p>{pct < 1 ? "Reading your brochure…" : "Brochure read. Three scripts written, every number checked."}</p>
              <div className="dw-bar2"><div style={{ width: `${pct * 100}%` }} /></div>
            </div>
          )}
        </div>
      </Window>
      <div className={`bd-phone${reel ? " in" : ""}`} aria-hidden="true">
        <video ref={video} src={`${DEMO_REEL}#t=0.1`} muted loop playsInline preload="metadata" />
        <span className="dw-ai">AI-generated</span>
        <span className="dw-rera">RERA: PRM/KA/RERA/1251/308/PR/260526/008686<br />rera.karnataka.gov.in</span>
        {reel && <p className="dw-cap" key={cap}>{cap}</p>}
        <span className="bd-wait">Your reel appears here</span>
        <span className="bd-tag">Example footage</span>
      </div>
    </div>
  );
}

const LINES: { time: string; label: string; say: string; at: number }[] = [
  { time: "0:00", label: "Hook", say: "Eight indoor badminton courts right here.", at: 0.5 },
  { time: "0:03", label: "Build", say: "You also get five tennis courts, five basketball courts and five pickleball courts.", at: 2.2 },
  { time: "0:09", label: "Proof", say: "All of this is set across a twenty plus acre sporting facility.", at: 4.4 },
  { time: "0:15", label: "CTA", say: "Comment SPORTS to get all the details.", at: 6.4 },
];

function Script({ active, still }: { active: boolean; still: boolean }) {
  const t = useClock(active, 12, still);
  return (
    <Window title="Script 1 · families" label="A script appears beat by beat with timings, then two checks pass." tag="Lines from a script RealBrain wrote from a real brochure">
      <ol className="dw-script">
        {LINES.map((l) => (
          <li key={l.time} className={t > l.at ? "on" : ""}>
            <span>{l.time}<b>{l.label}</b></span>
            <p>{l.say}</p>
          </li>
        ))}
      </ol>
      <div className={`dw-checks${t > 8.2 ? " on" : ""}`}>
        <span>✓ Numbers match your brochure</span>
        <span>✓ RERA details present</span>
      </div>
    </Window>
  );
}

const CAPS = ["Eight indoor badminton courts right here.", "Five tennis courts, five basketball courts.", "Twenty plus acres of sport.", "Comment SPORTS for the details."];

function Reel({ active, still }: { active: boolean; still: boolean }) {
  const t = useClock(active, 12, still);
  const i = Math.min(3, Math.floor(t / 3));
  return (
    <Window title="Your reel" label="A vertical reel preview with the avatar slot, spoken captions, and the RERA and AI labels." tag="Preview · avatar rendering not connected yet">
      <div className="dw-reel">
        <div className="dw-phone">
          <img src="/photos/entrance.jpg" alt="" className={active || still ? "kb" : ""} />
          <span className="dw-ai">AI-generated</span>
          <span className="dw-rera">RERA: PRM/KA/RERA/1251/308/PR/260526/008686<br />rera.karnataka.gov.in</span>
          <p className="dw-cap" key={i}>{CAPS[i]}</p>
          <div className="dw-prog"><div style={{ width: `${(t / 12) * 100}%` }} /></div>
        </div>
        <ul className="dw-side">
          <li className="on">Script 1 · 24 seconds</li>
          <li className="on">Voice · warm, Indian English</li>
          <li className="on">Visuals · your renders</li>
          <li className={t > 6 ? "on" : ""}>RERA and AI labels on screen</li>
        </ul>
      </div>
    </Window>
  );
}

function Refine({ active, still }: { active: boolean; still: boolean }) {
  const t = useClock(active, 11, still);
  const ask = typed("Make the hook warmer and shorter.", t, 0.6);
  const changed = t > 4.6;
  return (
    <Window title="Refine" label="The hook is changed by typing a request in plain words.">
      <div className="dw-refine">
        <div className="dw-hook">
          <small>Hook</small>
          <p className={changed ? "old" : ""}>Eight indoor badminton courts right here.</p>
          {changed && <p className="new">Your own sports club, right at home.</p>}
        </div>
        <div className="dw-msgs">
          {ask && <p className="dw-u">{ask}</p>}
          {t > 3.2 && <p className="dw-a">Done. I changed the hook and kept every number matched to your brochure.</p>}
          {t > 6 && <p className="dw-chip">Reel updated</p>}
        </div>
      </div>
    </Window>
  );
}

export function DemoStage({ scene, active, still }: { scene: SceneId; active: boolean; still: boolean }) {
  if (scene === "brochure") return <Brochure active={active} still={still} />;
  if (scene === "script") return <Script active={active} still={still} />;
  if (scene === "reel") return <Reel active={active} still={still} />;
  return <Refine active={active} still={still} />;
}
