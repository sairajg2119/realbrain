import { StepIndicator } from "./StepIndicator";

export function Wordmark({ onClick }: { onClick?: () => void }) {
  const inner = (
    <>
      <span className="wm-name"><span className="wm-light">Real</span><span className="wm-bold">Brain</span></span>
      <span className="wm-desc">The real estate marketing studio</span>
    </>
  );
  return onClick ? (
    <button className="wordmark" onClick={onClick} aria-label="RealBrain, back to the start">
      {inner}
    </button>
  ) : (
    <div className="wordmark">{inner}</div>
  );
}

/** Header for the workspace screens: wordmark, step indicator and a way to start over. */
export function AppHeader({ step, onHome, onStartOver, canStartOver }: { step: number; onHome: () => void; onStartOver: () => void; canStartOver: boolean }) {
  return (
    <header className="app-header">
      <Wordmark onClick={onHome} />
      <StepIndicator current={step} />
      <div className="app-header-r">
        {canStartOver && (
          <button className="text-btn" onClick={onStartOver}>
            Start over
          </button>
        )}
      </div>
    </header>
  );
}
