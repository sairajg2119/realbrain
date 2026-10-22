/**
 * Video states are kept apart on purpose: a script is selected, then approved,
 * then rendering, then ready (or failed). "preview" is the honest state used while
 * no avatar provider is connected: no video exists, only a preview of the inputs.
 */
export type VideoState =
  | { kind: "idle" }
  | { kind: "preview" }
  | { kind: "rendering"; progress: number | null } // null = the provider gave no real progress value
  | { kind: "ready"; url: string }
  | { kind: "failed"; message: string };

/** Flip to true when HeyGen or D-ID is wired in (see README). */
export const AVATAR_PROVIDER_CONNECTED = false;

/**
 * The seam for the real avatar provider. Today it returns the honest "preview" state.
 * Later: upload the render, call the provider, return "rendering", then poll for "ready".
 */
export function startVideo(): VideoState {
  if (!AVATAR_PROVIDER_CONNECTED) return { kind: "preview" };
  return { kind: "rendering", progress: null };
}
