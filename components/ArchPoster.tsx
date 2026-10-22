/**
 * The still picture of the house. It stands in while the 3D scene loads, and stays when the scene cannot run
 * (no WebGL, data saver on, or the graphics card gave up). It is a drawing, not a render, and is not pretending otherwise.
 */
export function ArchPoster() {
  return (
    <svg className="arch-poster" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ap-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f5877" />
          <stop offset="0.55" stopColor="#c98a63" />
          <stop offset="1" stopColor="#f2b57a" />
        </linearGradient>
        <radialGradient id="ap-sun" cx="0.78" cy="0.62" r="0.5">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffb36b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ap-lawn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#59623f" />
          <stop offset="1" stopColor="#2f3827" />
        </linearGradient>
        <linearGradient id="ap-win" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd08a" />
          <stop offset="1" stopColor="#e69a4a" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#ap-sky)" />
      <rect width="1600" height="900" fill="url(#ap-sun)" />
      <path d="M0 600 Q260 540 520 590 T1040 575 T1600 590 V900 H0Z" fill="#556047" opacity="0.7" />
      <rect y="640" width="1600" height="260" fill="url(#ap-lawn)" />
      <g>
        <rect x="360" y="470" width="900" height="180" fill="#3a342d" />
        <rect x="360" y="470" width="270" height="180" fill="#d9cfbd" />
        <rect x="1130" y="470" width="130" height="180" fill="#2c2b29" />
        <rect x="650" y="486" width="450" height="150" fill="url(#ap-win)" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <rect key={i} x={648 + i * 56} y="484" width="4" height="154" fill="#8f6b3c" />
        ))}
        <rect x="860" y="500" width="64" height="140" fill="#8f6b3c" />
        <rect x="810" y="446" width="170" height="14" fill="#ece6da" />
        <rect x="430" y="330" width="700" height="146" fill="#4a4036" />
        {Array.from({ length: 30 }, (_, i) => (
          <rect key={i} x={440 + i * 23} y="338" width="8" height="130" fill="#7a5233" />
        ))}
        <rect x="415" y="318" width="730" height="16" fill="#ece6da" />
        <rect x="345" y="466" width="930" height="14" fill="#ece6da" />
        <rect x="1180" y="250" width="50" height="400" fill="#2c2b29" />
      </g>
      <g fill="#2e3a25">
        <ellipse cx="170" cy="560" rx="110" ry="140" />
        <ellipse cx="1410" cy="540" rx="130" ry="160" />
        <ellipse cx="1530" cy="600" rx="90" ry="120" />
      </g>
      <rect x="840" y="650" width="120" height="250" fill="#b5ab9a" opacity="0.55" />
    </svg>
  );
}
