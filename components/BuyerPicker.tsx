"use client";

import { BUYER_TYPES, type BuyerType } from "@/lib/types";
import { BUYER_COPY } from "@/lib/workflow";
import { IconCheck, IconFamily, IconGlobe, IconInvestor, IconKey } from "./Icons";

const ICONS: Record<BuyerType, () => React.ReactNode> = {
  family: () => <IconFamily />,
  investor: () => <IconInvestor />,
  nri: () => <IconGlobe />,
  "first-time buyer": () => <IconKey />,
};

/** Exactly one buyer type. Selection shows a border, a check and aria-checked, not colour alone. */
export function BuyerPicker({ value, onChange, disabled }: { value: BuyerType | null; onChange: (b: BuyerType) => void; disabled?: boolean }) {
  return (
    <div className="buyers" role="radiogroup" aria-label="Who are we speaking to?">
      {BUYER_TYPES.map((b) => {
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
