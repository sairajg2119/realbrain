/**
 * The RealBrain mark: two lobes of a brain drawn as one line, with a tower standing in the fold between them, its floors
 * the brain's folds. Architectural intelligence, drawn in a single weight so it works from favicon size up.
 */
export function LogoMark({ size = 28, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path
        d="M15 5.2C12.6 3.6 9 4.3 7.9 7 5.3 7.3 3.7 9.9 4.6 12.4 2.9 14 3 17 4.9 18.3c-.6 2.7 1.3 5.1 3.9 5.1.9 2.2 3.4 3.3 5.6 2.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M17 5.2c2.4-1.6 6-.9 7.1 1.8 2.6.3 4.2 2.9 3.3 5.4 1.7 1.6 1.6 4.6-.3 5.9.6 2.7-1.3 5.1-3.9 5.1-.9 2.2-3.4 3.3-5.6 2.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M13.6 27.5V9.5l2.4-2 2.4 2v18" stroke="#C7A56B" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13.6 13h4.8M13.6 16.5h4.8M13.6 20h4.8M13.6 23.5h4.8" stroke="#C7A56B" strokeWidth="1.1" />
    </svg>
  );
}

/** The mark and the name together, for the headers. */
export function Logo({ onClick }: { onClick?: () => void }) {
  const inner = (
    <>
      <LogoMark size={30} />
      <span className="lg-name">RealBrain</span>
    </>
  );
  return onClick ? (
    <button type="button" className="lg" onClick={onClick} aria-label="RealBrain, home">{inner}</button>
  ) : (
    <span className="lg">{inner}</span>
  );
}
