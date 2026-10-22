import brain from "@/brain/teardowns.json";
import type { Teardown } from "./types";

const REELS = (brain as unknown as { reels: Teardown[] }).reels;

export interface Evidence {
  page: string;
  plays: number;
  multiple: number;
  url: string;
}

/** Real numbers from brain/teardowns.json, or null when the reel id is not in the dataset. */
export function getEvidence(reelId: string): Evidence | null {
  const t = REELS.find((r) => r.id === reelId);
  return t ? { page: t.page, plays: t.plays, multiple: t.multiple_vs_median, url: t.url } : null;
}
