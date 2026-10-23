"use client";

import { useEffect, useState } from "react";

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

function Brochure({ active, still }: { active: boolean; still: boolean }) {
  const t = useClock(active, 10, still);
  const note = typed("For first-time buyers. Lean on the clubhouse and the open space.", t, 1.4);
  const busy = t > 4.6;
  const pct = Math.min(1, Math.max(0, (t - 4.8) / 3.6));
  return (
    <Window title="New reel" label="A brochure PDF is attached and a short note typed, then RealBrain reads the brochure.">
      <div className="dw-chat">
        <div className={`dw-file${t > 0.4 ? " on" : ""}`}><i /> <span>Nambiar-District-25-Phase-3.pdf</span><em>26 MB</em></div>
        <div className="dw-input">
          <p>{note || <span className="dw-ph">Tell me about the property…</span>}<u className={t % 1 < 0.5 ? "on" : ""} /></p>
          <div className="dw-row"><span className="dw-clip">Attach brochure</span><b className={`dw-send${t > 4.1 ? " go" : ""}`}>Create scripts →</b></div>
        </div>
        {busy && (
          <div className="dw-read">
            <p>{pct < 1 ? "Reading your brochure…" : "Done. 48 facts found, each one numbered."}</p>
            <div className="dw-bar2"><div style={{ width: `${pct * 100}%` }} /></div>
          </div>
        )}
      </div>
    </Window>
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
