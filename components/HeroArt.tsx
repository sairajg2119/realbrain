/** A simple tower illustration for the side panel (no photo needed). */
export function HeroArt() {
  const back = Array.from({ length: 9 }, (_, r) => Array.from({ length: 4 }, (_, c) => ({ x: 206 + c * 33, y: 96 + r * 34, lit: (r * 3 + c * 5) % 7 === 0 })));
  const front = Array.from({ length: 8 }, (_, r) => Array.from({ length: 4 }, (_, c) => ({ x: 82 + c * 36, y: 154 + r * 33, lit: (r * 5 + c * 3) % 6 === 0 })));
  return (
    <svg viewBox="0 0 400 400" role="img" aria-label="Illustration of two residential towers" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ece7df" />
          <stop offset="1" stopColor="#cdc6bb" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#sky)" />
      <circle cx="320" cy="70" r="30" fill="#f6f2ea" />
      <rect x="190" y="70" width="150" height="330" fill="#8d877e" />
      {back.flat().map((w, i) => (
        <rect key={`b${i}`} x={w.x} y={w.y} width="20" height="22" fill={w.lit ? "#e0a066" : "#d3ccc1"} />
      ))}
      <rect x="64" y="130" width="160" height="270" fill="#4d4944" />
      {front.flat().map((w, i) => (
        <rect key={`f${i}`} x={w.x} y={w.y} width="22" height="22" fill={w.lit ? "#e0a066" : "#cfc8bd"} />
      ))}
      <rect x="0" y="380" width="400" height="20" fill="#34312d" />
    </svg>
  );
}
