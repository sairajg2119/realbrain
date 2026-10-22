import type { Facts } from "@/lib/types";

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? <span style={{ color: "var(--red)" }}>Not found in the brochure</span>}</dd>
    </div>
  );
}

export function FactsCard({ facts }: { facts: Facts }) {
  return (
    <section className="card" aria-label="Project facts">
      <dl className="facts">
        <Row label="Project" value={facts.project_name} />
        <Row label="Developer" value={facts.developer} />
        <Row label="Location" value={facts.location} />
        <Row label="Price" value={facts.price} />
        <Row label="RERA number" value={facts.rera_number} />
        <Row label="Configurations" value={facts.configurations.length ? facts.configurations.join(" · ") : null} />
        <Row label="Top amenities" value={facts.amenities.length ? facts.amenities.slice(0, 8).join(" · ") : null} />
      </dl>
    </section>
  );
}
