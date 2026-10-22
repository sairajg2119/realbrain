"use client";

import { BUYER_TYPES, type BuyerChoice } from "@/lib/types";
import { BUYER_COPY } from "@/lib/workflow";
import { IconCheck, IconFamily, IconGlobe, IconInvestor, IconKey } from "./Icons";

const CHOICES: BuyerChoice[] = ["auto", ...BUYER_TYPES];

const ICONS: Record<BuyerChoice, () => React.ReactNode> = {
  auto: () => <IconCheck size={20} />,
  family: () => <IconFamily />,
  investor: () => <IconInvestor />,
  nri: () => <IconGlobe />,
  "first-time buyer": () => <IconKey />,
};

/** Exactly one buyer type. Selection shows a border, a check and aria-checked, not colour alone. */
export function BuyerPicker({ value, onChange, disabled }: { value: BuyerChoice | null; onChange: (b: BuyerChoice) => void; disabled?: boolean }) {
  return (
    <div className="buyers" role="radiogroup" aria-label="Who should the scripts speak to?">
      {CHOICES.map((b) => {
        const on = value === b;
        return (
          <button key={b} type="button" role="radio" aria-checked={on} className={`buyer${on ? " on" : ""}`} onClick={() => onChange(b)} disabled={disabled}>
            <span className="buyer-icon">{ICONS[b]()}</span>
            <span className="buyer-t">{BUYER_COPY[b].label}</span>
            <span className="buyer-d">{BUYER_COPY[b].blurb}</span>
            <span className="buyer-check" aria-hidden="true">{on && <IconCheck size={14} />}</span>
          </button>
        );
      })}
    </div>
  );
}
