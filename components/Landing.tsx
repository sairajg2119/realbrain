"use client";

import { useEffect, useState } from "react";
import { Inside } from "./Inside";
import { Opening } from "./Opening";

/**
 * Two parts. First the house: the welcome, the camera walking up to the front door, the door opening (Opening).
 * Then you are inside, on one long page that shows what RealBrain does and leads to the work (Inside).
 * `onStart` opens the real brochure-upload workflow. `name` would come from a signed-in user (none yet).
 */
export function Landing({ onStart, name }: { onStart: () => void; name?: string | null }) {
  const [inside, setInside] = useState(false);
  useEffect(() => { if (inside) window.scrollTo({ top: 0 }); }, [inside]);
  return inside ? <Inside onStart={onStart} /> : <Opening onStart={() => setInside(true)} name={name} />;
}
