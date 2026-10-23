import { Logo } from "./Logo";
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

/** Header for the workspace: wordmark, the four steps (places on the page, opened in order) and a way to start over. */
export function AppHeader({ progress, view, onGo, onHome, onStartOver, canStartOver }: { progress: boolean[]; view: number; onGo: (i: number) => void; onHome: () => void; onStartOver: () => void; canStartOver: boolean }) {
  return (
    <header className="app-header">
      <Logo onClick={onHome} />
      <StepIndicator progress={progress} view={view} onGo={onGo} />
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
