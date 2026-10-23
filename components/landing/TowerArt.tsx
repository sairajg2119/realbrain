/**
 * A residential tower at night, drawn as architecture is drawn: fine lines first, then its stone faces, then its lit
 * rooms. Pure SVG generated from a few numbers, so it is crisp at any size, weighs a few kilobytes, needs no graphics card,
 * and runs the same on a phone. The drawing animates with CSS (stroke tracing, then fades), not JavaScript.
 * Two further towers stand behind it for depth; the hero moves the three layers at different rates for parallax.
 */

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface TowerSpec {
  x0: number;
  x1: number;
  top: number;
  base: number;
  floors: number;
  bays: number;
  lit: number;
  seed: number;
}

/** One tower's windows: which are lit, how warm, and when each one comes on (from the ground floor up). */
function windows(t: TowerSpec) {
  const r = rng(t.seed);
  const fh = (t.base - t.top) / t.floors;
  const bw = (t.x1 - t.x0) / t.bays;
  const out: { x: number; y: number; w: number; h: number; lit: boolean; tone: number; d: number }[] = [];
  for (let f = 0; f < t.floors; f++) {
    for (let b = 0; b < t.bays; b++) {
      const lit = r() < t.lit;
      out.push({ x: t.x0 + b * bw + 2.5, y: t.top + f * fh + 3.5, w: bw - 5, h: fh - 7, lit, tone: Math.floor(r() * 3), d: (t.floors - f) * 0.035 + r() * 0.5 });
    }
  }
  return out;
}

const MAIN: TowerSpec = { x0: 230, x1: 410, top: 170, base: 820, floors: 30, bays: 6, lit: 0.3, seed: 7 };
const LEFT: TowerSpec = { x0: 70, x1: 180, top: 380, base: 820, floors: 18, bays: 4, lit: 0.2, seed: 11 };
const RIGHT: TowerSpec = { x0: 470, x1: 560, top: 300, base: 820, floors: 22, bays: 3, lit: 0.22, seed: 23 };

function slabs(t: TowerSpec, overhang: number) {
  const fh = (t.base - t.top) / t.floors;
  let d = "";
  for (let f = 0; f <= t.floors; f++) {
    const y = t.top + f * fh;
    // balconies step out on alternate floors, left then right, as on a real slab-edge facade
    const l = f % 2 === 0 ? overhang : 0;
    const rr = f % 2 === 1 ? overhang : 0;
    d += `M${t.x0 - l} ${y.toFixed(1)}H${t.x1 + rr}`;
  }
  return d;
}

function fins(t: TowerSpec, every: number) {
  let d = "";
  for (let x = t.x0 + every; x < t.x1 - 1; x += every) d += `M${x} ${t.top}V${t.base}`;
  return d;
}

function Tower({ t, layer, overhang, fin }: { t: TowerSpec; layer: string; overhang: number; fin: number }) {
  const ws = windows(t);
  return (
    <g className={`tw-tower ${layer}`}>
      <rect className="t-face" x={t.x0} y={t.top} width={t.x1 - t.x0} height={t.base - t.top} fill={`url(#tw-stone-${layer})`} />
      <g className="t-wins">
        {ws.map((w, i) => (
          <rect
            key={i}
            x={w.x.toFixed(1)}
            y={w.y.toFixed(1)}
            width={w.w.toFixed(1)}
            height={w.h.toFixed(1)}
            className={w.lit ? `t-win lit tone${w.tone}` : "t-win"}
            style={w.lit ? ({ "--d": `${w.d.toFixed(2)}s` } as React.CSSProperties) : undefined}
          />
        ))}
      </g>
      <path className="t-line" pathLength={1} d={`M${t.x0} ${t.base}V${t.top}H${t.x1}V${t.base}`} />
      <path className="t-line t-fine" pathLength={1} d={slabs(t, overhang)} style={{ "--d": "0.25s" } as React.CSSProperties} />
      <path className="t-line t-fine t-fin" pathLength={1} d={fins(t, fin)} style={{ "--d": "0.5s" } as React.CSSProperties} />
    </g>
  );
}

export function TowerArt({ className }: { className?: string }) {
  const m = MAIN;
  return (
    <svg className={`tw ${className ?? ""}`} viewBox="0 0 640 900" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="tw-glow" cx="0.52" cy="0.62" r="0.55">
          <stop offset="0" stopColor="#C7A56B" stopOpacity="0.32" />
          <stop offset="0.55" stopColor="#C7A56B" stopOpacity="0.06" />
          <stop offset="1" stopColor="#C7A56B" stopOpacity="0" />
        </radialGradient>
        {(["back", "mid", "front"] as const).map((l) => (
          <linearGradient key={l} id={`tw-stone-${l}`} x1="0" y1="0" x2="1" y2="0.2">
            <stop offset="0" stopColor={l === "front" ? "#2a2924" : "#191a17"} />
            <stop offset="0.55" stopColor={l === "front" ? "#1a1a17" : "#121311"} />
            <stop offset="1" stopColor={l === "front" ? "#0f100e" : "#0b0c0a"} />
          </linearGradient>
        ))}
        <linearGradient id="tw-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4F1E9" stopOpacity="0.07" />
          <stop offset="0.35" stopColor="#F4F1E9" stopOpacity="0" />
          <stop offset="0.7" stopColor="#C7A56B" stopOpacity="0.04" />
          <stop offset="1" stopColor="#F4F1E9" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="tw-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C7A56B" stopOpacity="0.18" />
          <stop offset="1" stopColor="#080A09" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect className="t-glow" x="0" y="0" width="640" height="900" fill="url(#tw-glow)" />

      <g className="tw-layer tw-back">
        <Tower t={LEFT} layer="back" overhang={4} fin={27.5} />
        <Tower t={RIGHT} layer="back" overhang={4} fin={30} />
      </g>

      <g className="tw-layer tw-front">
        {/* crown: two set-backs and a mast */}
        <path className="t-line" pathLength={1} d={`M${m.x0 + 18} ${m.top}V${m.top - 34}H${m.x1 - 18}V${m.top}M${m.x0 + 52} ${m.top - 34}V${m.top - 70}H${m.x1 - 52}V${m.top - 34}M320 ${m.top - 70}V${m.top - 150}`} style={{ "--d": "0.15s" } as React.CSSProperties} />
        <rect className="t-face" x={m.x0 + 18} y={m.top - 34} width={m.x1 - m.x0 - 36} height="34" fill="url(#tw-stone-front)" />
        <rect className="t-face" x={m.x0 + 52} y={m.top - 70} width={m.x1 - m.x0 - 104} height="36" fill="url(#tw-stone-front)" />
        <circle className="t-beacon" cx="320" cy={m.top - 152} r="2.4" />
        <Tower t={m} layer="front" overhang={14} fin={30} />
        <rect className="t-face t-sheen" x={m.x0} y={m.top} width={m.x1 - m.x0} height={m.base - m.top} fill="url(#tw-sheen)" />
        {/* podium and lobby */}
        <rect className="t-face" x="150" y="820" width="340" height="44" fill="url(#tw-stone-front)" />
        <rect className="t-lobby" x="268" y="830" width="104" height="34" />
        <path className="t-line" pathLength={1} d="M150 864V820H490V864M268 864V830H372V864M294 830V864M320 830V864M346 830V864" style={{ "--d": "0.35s" } as React.CSSProperties} />
      </g>

      <path className="t-line t-ground" pathLength={1} d="M0 864H640" />
      <rect x="0" y="864" width="640" height="36" fill="url(#tw-ground)" className="t-face" />
    </svg>
  );
}
