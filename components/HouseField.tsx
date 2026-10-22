"use client";

import { useEffect, useRef } from "react";
import { advance, houseCount, makeHouses, mulberry32, SPRITE_H, speedMultiplier, sway, type House } from "@/lib/houses";

/**
 * A field of hundreds of tiny houses drifting slowly at different depths. Each house style is drawn ONCE into a small
 * sprite (flat architectural elevations, muted tones, a few warm lit windows), then stamped with drawImage, so the cost
 * per frame stays low. `warp` (0 or 1) eases the field forward when the visitor moves to the next screen.
 * With reduced motion, one still frame is drawn and nothing animates.
 */

const BODY = ["#1b1b1b", "#212121", "#262626", "#2b2825", "#222527", "#1f2022"];
const ROOF = ["#0e0e0e", "#141414", "#101010"];
const TRIM = "#3a3a3a";
const DARK_WIN = "#0f1113";
const GLASS = "#272d33";
const LIT = "#e0894f";
const SPRITE_VARIANTS = 4;
const TYPES = ["gable", "modern", "villa", "apartment", "tower", "terrace"] as const;
type Kind = (typeof TYPES)[number];

/** Each house is drawn at three sizes (1x, 2x, 3x) and the nearest size to what is needed is stamped, so tiny far houses are never squeezed down from a big bitmap. */
const LEVELS = [1, 2, 3] as const;
interface Sprite { levels: HTMLCanvasElement[]; w: number; h: number }

const pick = <T,>(a: readonly T[], r: () => number) => a[Math.floor(r() * a.length)];

/** Draw one house elevation in a w x H box (CSS units). Flat shapes, thin trim, no outlines like a cartoon. */
function drawHouse(ctx: CanvasRenderingContext2D, kind: Kind, r: () => number, w: number, H: number) {
  const body = pick(BODY, r);
  const roof = pick(ROOF, r);
  const rect = (x: number, y: number, ww: number, hh: number, fill: string) => { ctx.fillStyle = fill; ctx.fillRect(x, y, ww, hh); };
  const lit = (p: number) => r() < p;
  const win = (x: number, y: number, ww: number, hh: number, p = 0.28) => {
    // Few windows are lit, and softly: a warm point of life, not a bright block.
    const on = lit(p * 0.55);
    rect(x, y, ww, hh, on ? LIT : r() < 0.5 ? GLASS : DARK_WIN);
    if (on) { ctx.globalAlpha = 0.55; rect(x, y, ww, hh, DARK_WIN); ctx.globalAlpha = 0.14; rect(x - 1.5, y - 1.5, ww + 3, hh + 3, LIT); ctx.globalAlpha = 1; }
  };
  const edge = (x: number, y: number, ww: number) => rect(x, y, ww, 1, "rgba(255,255,255,0.07)");

  if (kind === "gable") {
    const bx = 8, by = H * 0.44;
    rect(bx, by, w - 16, H - by - 1, body);
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(2, by + 2); ctx.lineTo(w / 2, 4); ctx.lineTo(w - 2, by + 2); ctx.closePath(); ctx.fill();
    rect(w * 0.68, 8, 6, by * 0.5, roof);
    win(bx + 8, by + 10, 11, 13); win(w - bx - 19, by + 10, 11, 13);
    rect(w / 2 - 5, H - 22, 10, 21, DARK_WIN);
    edge(bx, by, w - 16);
  } else if (kind === "modern") {
    const lw = w - 28;
    rect(6, H * 0.52, lw, H * 0.48 - 1, body);
    rect(22, H * 0.2, w - 28, H * 0.32, pick(BODY, r));
    rect(2, H * 0.5, lw + 8, 3, TRIM);
    rect(18, H * 0.18, w - 20, 3, TRIM);
    for (let i = 0; i < 3; i++) win(26 + i * ((w - 40) / 3), H * 0.26, (w - 52) / 3, H * 0.2, 0.3);
    for (let i = 0; i < 3; i++) win(12 + i * (lw / 3), H * 0.6, lw / 3 - 8, H * 0.26, 0.3);
    edge(6, H * 0.52, lw);
  } else if (kind === "villa") {
    const by = H * 0.4;
    rect(6, by, w - 12, H - by - 1, body);
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(0, by + 3); ctx.lineTo(w * 0.2, 6); ctx.lineTo(w * 0.8, 6); ctx.lineTo(w, by + 3); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 4; i++) rect(14 + i * ((w - 36) / 3), by + 8, 3, H - by - 9, TRIM);
    for (let i = 0; i < 3; i++) win(24 + i * ((w - 44) / 3), by + 14, 12, 16, 0.3);
    rect(w / 2 - 6, H - 20, 12, 19, DARK_WIN);
    edge(6, by, w - 12);
  } else if (kind === "apartment") {
    const floors = 6 + Math.floor(r() * 4), cols = 3 + Math.floor(r() * 2);
    rect(4, 8, w - 8, H - 9, body);
    rect(2, 4, w - 4, 5, roof);
    const fh = (H - 22) / floors;
    for (let f = 0; f < floors; f++) {
      rect(4, 12 + f * fh, w - 8, 1, "rgba(255,255,255,0.05)");
      for (let c = 0; c < cols; c++) win(9 + c * ((w - 18) / cols), 15 + f * fh, (w - 18) / cols - 5, fh - 6, 0.3);
    }
  } else if (kind === "tower") {
    rect(4, 22, w - 8, H - 23, body);
    rect(9, 8, w - 18, 16, pick(BODY, r));
    rect(w / 2 - 1, 0, 2, 10, TRIM);
    const floors = 14;
    const fh = (H - 30) / floors;
    for (let f = 0; f < floors; f++) {
      win(8, 12 + f * fh + 6, w - 16, Math.max(2, fh - 3), 0.22);
    }
  } else {
    const n = 3;
    const cw = w / n;
    for (let i = 0; i < n; i++) {
      const hh = H * (0.5 + r() * 0.18), top = H - hh;
      rect(i * cw + 1, top + 10, cw - 2, hh - 11, pick(BODY, r));
      ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(i * cw, top + 12); ctx.lineTo(i * cw + cw / 2, top); ctx.lineTo((i + 1) * cw, top + 12); ctx.closePath(); ctx.fill();
      win(i * cw + 6, top + 20, cw - 12, 11, 0.32);
      rect(i * cw + cw / 2 - 4, H - 16, 8, 15, DARK_WIN);
    }
  }
}

function makeSprites(rng: () => number): Sprite[] {
  const sprites: Sprite[] = [];
  const widths: Record<Kind, [number, number]> = { gable: [72, 96], modern: [100, 130], villa: [110, 140], apartment: [56, 76], tower: [34, 44], terrace: [112, 138] };
  const heights: Record<Kind, [number, number]> = { gable: [84, 100], modern: [80, 96], villa: [70, 84], apartment: [96, 100], tower: [100, 100], terrace: [66, 78] };
  for (const kind of TYPES) {
    for (let v = 0; v < SPRITE_VARIANTS; v++) {
      const w = Math.round(widths[kind][0] + rng() * (widths[kind][1] - widths[kind][0]));
      const h = Math.round(heights[kind][0] + rng() * (heights[kind][1] - heights[kind][0]));
      const seed = Math.floor(rng() * 1e9); // the same house at every size
      const levels: HTMLCanvasElement[] = [];
      for (const k of LEVELS) {
        const c = document.createElement("canvas");
        c.width = w * k; c.height = h * k;
        const ctx = c.getContext("2d");
        if (!ctx) continue;
        ctx.scale(k, k);
        drawHouse(ctx, kind, mulberry32(seed), w, h);
        levels.push(c);
      }
      if (levels.length === LEVELS.length) sprites.push({ levels, w, h });
    }
  }
  return sprites;
}

export function HouseField({ warp }: { warp: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const warpTarget = useRef(0);
  warpTarget.current = warp ? 1 : 0;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rng = mulberry32(2026);
    const sprites = makeSprites(rng);
    if (sprites.length === 0) return;

    let w = 0, h = 0, dpr = 1;
    let houses: House[] = [];
    let raf = 0;
    let last = 0;
    let t = 0;
    let wv = 0; // eased warp, 0..1

    const layout = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      houses = makeHouses(houseCount(w), w, h, sprites.length, mulberry32(11));
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // Moving forward: a gentle zoom from the centre, and the field dims a little so the next screen's text reads cleanly.
      const zoom = 1 + wv * 0.1;
      ctx.translate(w / 2, h / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -h / 2);
      const dim = 1 - wv * 0.28;
      // Small screens would show houses as specks, so they are drawn larger there.
      const sizeMul = w < 520 ? 1.5 : w < 900 ? 1.2 : 1;
      for (const hs of houses) {
        const sp = sprites[hs.sprite];
        const dw = sp.w * hs.scale * sizeMul * (SPRITE_H / 100);
        const dh = sp.h * hs.scale * sizeMul * (SPRITE_H / 100);
        ctx.globalAlpha = hs.alpha * dim;
        const need = (dw * dpr * zoom) / sp.w; // device pixels wanted per sprite pixel
        const level = need <= 1 ? 0 : need <= 2 ? 1 : 2;
        ctx.drawImage(sp.levels[level], hs.x + sway(hs, t) - dw / 2, hs.y - dh / 2, dw, dh);
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      t += dt;
      wv += (warpTarget.current - wv) * Math.min(1, dt * 2.2);
      for (const hs of houses) advance(hs, dt, speedMultiplier(wv, hs.z), w, h);
      draw();
      raf = requestAnimationFrame(frame);
    };

    layout();
    draw();
    const ro = new ResizeObserver(() => { layout(); draw(); });
    ro.observe(canvas);
    if (!reduced) raf = requestAnimationFrame((now) => { last = now; frame(now); });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className="wl-field" aria-hidden="true" />;
}
