/**
 * An illustration of a modern residential tower at dusk, drawn in SVG so it can never be a broken image.
 * It is decorative: a stand-in for architectural photography.
 */
export function ArchVisual() {
  const floors = Array.from({ length: 17 }, (_, r) => r);
  const bays = Array.from({ length: 8 }, (_, c) => c);
  const lit = (r: number, c: number) => (r * 7 + c * 3) % 5 !== 0;
  const skyline = [
    [20, 330, 46], [76, 290, 38], [124, 350, 52], [470, 300, 44], [520, 340, 40], [566, 310, 34],
  ];
  return (
    <svg viewBox="0 0 600 720" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration of a modern residential tower at dusk" className="arch-svg">
      <defs>
        <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0d0c" />
          <stop offset="0.55" stopColor="#1d1b18" />
          <stop offset="1" stopColor="#4a3a27" />
        </linearGradient>
        <linearGradient id="slab" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#262a27" />
          <stop offset="1" stopColor="#171a18" />
        </linearGradient>
        <linearGradient id="pool" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b2f20" />
          <stop offset="1" stopColor="#0d0f0e" />
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.62" r="0.55">
          <stop offset="0" stopColor="#c7a56b" stopOpacity="0.28" />
          <stop offset="1" stopColor="#c7a56b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="720" fill="url(#dusk)" />
      <rect width="600" height="720" fill="url(#glow)" />
      {skyline.map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={600 - y} fill="#141614" opacity="0.9" />
      ))}
      {/* main tower: stacked slabs with warm windows and thin balcony lines */}
      <rect x="150" y="110" width="300" height="490" fill="url(#slab)" />
      {floors.map((r) => (
        <g key={r}>
          <rect x="144" y={126 + r * 28} width="312" height="2" fill="#3a3f3a" />
          {bays.map((c) => (
            <rect key={c} x={162 + c * 35} y={134 + r * 28} width="25" height="16" fill={lit(r, c) ? "#e3c58c" : "#232824"} opacity={lit(r, c) ? 0.45 + ((r + c) % 3) * 0.2 : 1} />
          ))}
        </g>
      ))}
      <rect x="150" y="104" width="300" height="8" fill="#c7a56b" opacity="0.8" />
      <rect x="120" y="600" width="360" height="22" fill="#1b1e1c" />
      {/* reflecting pool */}
      <rect x="0" y="622" width="600" height="98" fill="url(#pool)" />
      <g opacity="0.35" transform="translate(0 1244) scale(1 -1)">
        <rect x="150" y="560" width="300" height="60" fill="#e3c58c" opacity="0.4" />
      </g>
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={170 + i * 46} y={634 + i * 10} width={260 - i * 40} height="1.5" fill="#e3c58c" opacity="0.25" />
      ))}
    </svg>
  );
}
