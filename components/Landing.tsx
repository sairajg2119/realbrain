import { ArchVisual } from "./ArchVisual";
import { IconArrow, IconArrowDown, IconPlay } from "./Icons";
import { Wordmark } from "./AppHeader";

const STEPS = [
  { n: "01", title: "Bring your project", body: "Upload your property brochure. RealBrain extracts the details that matter." },
  { n: "02", title: "Find your story", body: "Get three distinct reel scripts informed by high-performing content patterns and your project's facts." },
  { n: "03", title: "Bring it to life", body: "Approve your favourite script and turn it into an AI-presenter video." },
];

export function Landing({ onStart }: { onStart: () => void }) {
  function scrollToHow() {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <div className="landing">
      <header className="nav">
        <Wordmark />
        <nav className="nav-r" aria-label="Main">
          <button className="text-btn nav-link" onClick={scrollToHow}>
            How it works
          </button>
          <button className="btn btn-gold btn-sm" onClick={onStart}>
            Create your first reel
          </button>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">The new way to market real estate</p>
            <h1 className="display">
              Every project deserves a <em>story that sells.</em>
            </h1>
            <p className="hero-lead">
              From project brochure to scroll-stopping reels. RealBrain turns your property&apos;s details into compelling scripts and AI-presenter videos, ready for your review.
            </p>
            <div className="hero-cta">
              <button className="btn btn-gold btn-lg" onClick={onStart}>
                Create my first reel <IconArrow size={18} />
              </button>
              <button className="btn btn-ghost btn-lg" onClick={scrollToHow}>
                See how it works <IconArrowDown size={18} />
              </button>
            </div>
            <p className="hero-note">No shoot. No agency back-and-forth. Just better real estate storytelling.</p>
          </div>

          <div className="hero-visual" aria-hidden="false">
            <div className="hero-frame">
              <ArchVisual />
              <div className="hero-vignette" />
            </div>
            <figure className="preview-card">
              <figcaption className="preview-tag">
                <span className="dot" aria-hidden="true" /> Data-backed hook
              </figcaption>
              <p className="preview-hook">&ldquo;Why are families choosing the lake side of the city?&rdquo;</p>
              <p className="preview-body">Opens with a question, then three facts from the brochure, then one clear next step.</p>
              <div className="preview-foot">
                <span className="preview-play"><IconPlay size={14} /></span>
                <span>Script → AI-presenter video</span>
              </div>
              <span className="preview-note">Illustrative preview</span>
            </figure>
          </div>
        </section>

        <p className="trust">Built for real estate developers. Informed by patterns from 485 high-performing real estate reels.</p>

        <section className="statement" aria-label="Our promise">
          <p className="serif-quote">&ldquo;Less coordination. Better stories. More time to sell.&rdquo;</p>
        </section>

        <section id="how-it-works" className="how" aria-labelledby="how-title">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title" className="h2">Three steps, one calm workspace.</h2>
          <ol className="how-grid">
            {STEPS.map((s) => (
              <li key={s.n} className="how-item">
                <span className="how-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="closing" aria-labelledby="closing-title">
          <h2 id="closing-title" className="display display-sm">Your next great reel starts with a brochure.</h2>
          <button className="btn btn-gold btn-lg" onClick={onStart}>
            Create my first reel <IconArrow size={18} />
          </button>
        </section>
      </main>

      <footer className="site-foot">
        <span>RealBrain</span>
        <span>Scripts are written by AI from your brochure. You approve everything that is posted.</span>
      </footer>
    </div>
  );
}
