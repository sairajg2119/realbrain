"use client";

import { useState } from "react";
import type { Facts } from "@/lib/types";
import { IconChevron } from "./Icons";

const MISSING = "Not found in brochure";

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{value ?? <span className="missing">{MISSING}</span>}</dd>
    </div>
  );
}

function ChipRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="fact wide">
      <dt>{label}</dt>
      <dd>
        {items.length ? (
          <ul className="chips">
            {items.map((x) => (
              <li key={x} className="chip">{x}</li>
            ))}
          </ul>
        ) : (
          <span className="missing">{MISSING}</span>
        )}
      </dd>
    </div>
  );
}

/** Compact by default (name, developer, location, RERA); expands to every extracted fact. */
export function FactsCard({ facts, defaultOpen = false }: { facts: Facts; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="facts-card" aria-labelledby="facts-title">
      <p className="eyebrow" id="facts-title">What we found in your brochure</p>
      <div className="facts-top">
        <div>
          <h3 className="facts-name">{facts.project_name ?? "Unnamed project"}</h3>
          <p className="facts-sub">{[facts.developer, facts.location].filter(Boolean).join(" · ") || MISSING}</p>
        </div>
        <span className={`pill ${facts.rera_number ? "good" : "bad"}`}>{facts.rera_number ? "RERA number found" : "RERA number missing"}</span>
      </div>
      {open && (
        <dl className="facts-grid" id="facts-more">
          <Row label="Developer" value={facts.developer} />
          <Row label="Location" value={facts.location} />
          <Row label="Price" value={facts.price} />
          <Row label="RERA registration number" value={facts.rera_number} />
          <ChipRow label="Configurations" items={facts.configurations} />
          <ChipRow label="Key amenities" items={facts.amenities.slice(0, 10)} />
        </dl>
      )}
      <button className="text-btn facts-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="facts-more">
        {open ? "Show less" : "Show all details"} <span className={`chev${open ? " up" : ""}`}><IconChevron size={16} /></span>
      </button>
    </section>
  );
}
