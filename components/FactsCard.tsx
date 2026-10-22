import type { Facts } from "@/lib/types";

function Item({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? <span className="missing">Not found in the brochure</span>}</dd>
    </div>
  );
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="wide">
      <dt>{label}</dt>
      <dd>
        {items.length ? (
          <div className="chips">
            {items.map((x) => (
              <span key={x} className="chip">{x}</span>
            ))}
          </div>
        ) : (
          <span className="missing">Not found in the brochure</span>
        )}
      </dd>
    </div>
  );
}

export function FactsCard({ facts, title = "What I read from your brochure" }: { facts: Facts; title?: string }) {
  return (
    <section className="card" aria-label="Project facts">
      <div className="facts-head">
        <div>
          <h3>{facts.project_name ?? "Unnamed project"}</h3>
          <div className="sub">{[facts.developer, facts.location].filter(Boolean).join(" · ") || title}</div>
        </div>
        {facts.rera_number ? (
          <span className="badge good">✓ RERA number found</span>
        ) : (
          <span className="badge bad">✕ RERA number missing</span>
        )}
      </div>
      <dl className="facts">
        <Item label="RERA number" value={facts.rera_number} />
        <Item label="Price" value={facts.price} />
        <ChipList label="Configurations" items={facts.configurations} />
        <ChipList label="Top amenities" items={facts.amenities.slice(0, 10)} />
      </dl>
    </section>
  );
}
