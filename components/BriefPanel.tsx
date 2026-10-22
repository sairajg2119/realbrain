import type { Basis, BriefFact, PropertyBrief } from "@/lib/types";
import { IconAlert } from "./Icons";

const BASIS_LABEL: Record<Basis, string> = {
  brochure: "Brochure claim",
  verified_external: "Verified",
  inference: "Our inference",
  unverified: "Unverified",
};

function Badge({ basis }: { basis: Basis }) {
  return <span className={`basis basis-${basis}`}>{BASIS_LABEL[basis]}</span>;
}

function Facts({ facts }: { facts: BriefFact[] }) {
  if (!facts.length) return null;
  return (
    <ul className="brief-facts">
      {facts.map((f) => <li key={f.id}><span className="fid">{f.id}</span> {f.text}</li>)}
    </ul>
  );
}

/**
 * The property intelligence brief: what we understood before writing any script, and how far each part is verified.
 * Built by lib/brief.ts. Every item names its source; nothing here is presented as verified unless it was.
 */
export function BriefPanel({ brief }: { brief: PropertyBrief }) {
  const usable = brief.angles.filter((a) => !a.blocked);
  return (
    <section className="brief" aria-label="Property intelligence brief">
      <p className="eyebrow">Property intelligence brief</p>
      <h2 className="h2">What we understood before writing.</h2>
      {brief.overview.summary && <p className="screen-lead">{brief.overview.summary}</p>}
      <p className="hint">
        {(Object.keys(brief.legend) as Basis[]).map((b) => (
          <span key={b} className="legend-item"><Badge basis={b} /> {brief.legend[b]}</span>
        ))}
      </p>

      <details className="brief-sec" open>
        <summary>Strongest selling points <span className="count">{brief.selling_points.length}</span></summary>
        {brief.selling_points.length === 0 && <p className="hint">No selling point could be tied to a brochure fact.</p>}
        {brief.selling_points.map((p) => (
          <div key={p.point} className="brief-item">
            <p><strong>{p.point}</strong> <Badge basis={p.basis} /></p>
            {p.why_it_matters && <p className="hint">{p.why_it_matters}</p>}
            <Facts facts={p.evidence} />
          </div>
        ))}
      </details>

      <details className="brief-sec" open>
        <summary>Content angles <span className="count">{usable.length}</span></summary>
        {brief.angles.map((a) => (
          <div key={a.title} className={`brief-item${a.blocked ? " blocked" : ""}`}>
            <p><strong>{a.title}</strong> <span className="label-dim">{a.hook_type} · {a.format}</span> <Badge basis="inference" /></p>
            <p>&ldquo;{a.hook_example}&rdquo;</p>
            <p className="hint">{a.story} {a.reasoning}</p>
            <p className="hint">Buyer: {a.buyer}. CTA: {a.cta}</p>
            <Facts facts={a.facts_used} />
            {a.blocked && <p className="problem" role="note"><IconAlert size={14} /> Blocked wording, so this angle is not used for scripts: {a.compliance_flags.join("; ")}</p>}
            {a.unsupported_numbers.length > 0 && <p className="problem" role="note"><IconAlert size={14} /> Numbers not in the brochure: {a.unsupported_numbers.join(", ")}. Not used for scripts.</p>}
          </div>
        ))}
      </details>

      <details className="brief-sec">
        <summary>Location</summary>
        <div className="brief-item">
          <p className="hint">From the brochure</p>
          <Facts facts={brief.location.from_brochure} />
        </div>
        {brief.location.verified.length > 0 && (
          <div className="brief-item"><p className="hint">Verified</p><Facts facts={brief.location.verified} /></div>
        )}
        {brief.location.unverified.length > 0 && (
          <div className="brief-item">
            <p className="hint"><Badge basis="unverified" /> Found, not yet confirmed. Check before using.</p>
            <ul className="brief-facts">{brief.location.unverified.map((f) => <li key={f.id}>{f.text} <span className="hint">({f.source})</span></li>)}</ul>
          </div>
        )}
        {brief.location.to_research.map((t) => <p key={t} className="problem" role="note"><IconAlert size={14} /> {t}</p>)}
      </details>

      <details className="brief-sec">
        <summary>Limitations and missing information <span className="count">{brief.limitations.length}</span></summary>
        <ul className="brief-facts">
          {brief.limitations.map((l, i) => <li key={i}><span className="fid">{l.kind.replace("_", " ")}</span> {l.item}</li>)}
        </ul>
      </details>

      <details className="brief-sec">
        <summary>Who it suits</summary>
        {brief.personas.map((p) => (
          <div key={p.buyer} className="brief-item">
            <p><strong>{p.buyer}</strong> <Badge basis="inference" /></p>
            <p className="hint">Needs: {p.needs} Fit: {p.fit}</p>
          </div>
        ))}
        <p className="hint">{brief.differentiation_note}</p>
      </details>

      <details className="brief-sec" open>
        <summary>Verification and compliance flags</summary>
        <div className="brief-item">
          <p><strong>RERA number:</strong> {brief.verification.rera_number ?? "not found"} <Badge basis="unverified" /></p>
          <p className="hint">Not checked by RealBrain. Please confirm it yourself:</p>
          <ol className="brief-steps">{brief.verification.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <p><a href={brief.verification.portal_url} target="_blank" rel="noreferrer">Open the K-RERA project search</a></p>
        </div>
        {brief.compliance_flags.length > 0 && (
          <div className="brief-item">
            <p className="hint">Wording to check in the angles above</p>
            <ul className="brief-facts">
              {brief.compliance_flags.map((f) => <li key={f.claim_id}><strong>{f.name}</strong>: &ldquo;{f.matched}&rdquo;. Needs: {f.evidence_needed}</li>)}
            </ul>
          </div>
        )}
      </details>
      <p className="hint">{brief.model_note} This brief flags and organises; it is not legal clearance.</p>
    </section>
  );
}
