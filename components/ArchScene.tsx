"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { introProgress, journeyAt, portraitScale } from "@/lib/scene/cameraPath";
import { lightById, mixLight, type Light, type LightId } from "@/lib/scene/timeOfDay";

/**
 * One house, outside and in: a modern residence and its hall, built from the same solids and materials and lit by a sun
 * that moves through four moods of light. Everything is drawn by code, so nothing is downloaded.
 * phase "outside": the camera drifts in from afar. "entering": it walks up the path, the front door opens and it glides
 * through into the hall (one unbroken camera move). "inside": it rests in the hall. The scene then stays mounted behind the
 * workspace, so the hall is still there while the user works. `calm` draws fewer frames for that. `still` (reduced motion)
 * draws single frames and never animates. This file is only ever loaded in the browser (see Landing and page).
 */
export type HousePhase = "outside" | "entering" | "inside";

export interface ArchSceneProps {
  light: LightId;
  phase: HousePhase;
  still: boolean;
  calm?: boolean;
  /** When set, the camera's place on the journey follows this value (the page sets it from the scroll). */
  drive?: { current: number | null };
  /** When true, nothing is drawn: the scene is covered by the page. */
  paused?: { current: boolean };
  onReady?: () => void;
  onArrive?: () => void;
  onFail?: () => void;
}

const FADE_MS = 1600;
const ENTER_MS = 5600; // from the path to the hall
const SKIP_MS = 1500;

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (u: number) => u * u * (3 - 2 * u);

export default function ArchScene({ light, phase, still, calm, drive, paused, onReady, onArrive, onFail }: ArchSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const props = useRef({ light, phase, still, calm, drive, paused, onReady, onArrive, onFail });
  props.current = { light, phase, still, calm, drive, paused, onReady, onArrive, onFail };
  const poke = useRef<() => void>(() => {});

  // A change of props wakes the loop when it is in still mode.
  useEffect(() => { poke.current(); }, [light, phase, still, calm]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let raf = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T): T => { disposables.push(o); return o; };

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      props.current.onFail?.();
      return;
    }
    const gl = renderer;
    const small = () => el.clientWidth < 720;
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, small() ? 1.5 : 1.75));
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.domElement.setAttribute("aria-hidden", "true");
    gl.domElement.className = "arch-canvas";
    el.appendChild(gl.domElement);
    const onLost = (e: Event) => { e.preventDefault(); props.current.onFail?.(); };
    gl.domElement.addEventListener("webglcontextlost", onLost);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#d8b48e", 55, 250);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.3, 700);

    // ---- sky -------------------------------------------------------------------------------------------------
    const skyUniforms = {
      top: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 0.3, 1) },
      sunColor: { value: new THREE.Color() },
      stars: { value: 0 },
    };
    const skyMat = track(new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `
        varying vec3 vDir; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float stars;
        float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        void main(){
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(horizon, top, pow(h, 0.55));
          float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
          col += sunColor * (pow(s, 6.0) * 0.28 + pow(s, 90.0) * 0.9);
          float st = step(0.9965, hash(floor(vDir * 260.0))) * smoothstep(0.08, 0.45, vDir.y) * stars;
          col += vec3(st);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    const skyGeo = track(new THREE.SphereGeometry(450, 32, 16));
    const dome = new THREE.Mesh(skyGeo, skyMat);
    dome.renderOrder = -1;
    dome.frustumCulled = false;
    scene.add(dome);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(skyGeo, skyMat));
    const pmrem = track(new THREE.PMREMGenerator(gl));
    let envRT: THREE.WebGLRenderTarget | null = null;
    const refreshEnv = () => {
      envRT?.dispose();
      envRT = pmrem.fromScene(envScene, 0, 0.1, 1000);
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.55;
    };

    // ---- lights ----------------------------------------------------------------------------------------------
    const sun = new THREE.DirectionalLight("#ffb36b", 3);
    sun.castShadow = true;
    const shadowSize = small() ? 1024 : 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    const sc = sun.shadow.camera;
    sc.left = -48; sc.right = 48; sc.top = 40; sc.bottom = -40; sc.near = 10; sc.far = 220;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);
    const hemi = new THREE.HemisphereLight("#8fa6c4", "#6b5640", 0.6);
    scene.add(hemi);
    const inner: THREE.PointLight[] = [];
    for (const [x, y, z] of [[-1, 2.6, 3], [6, 2.4, 3.4], [-3, 6.4, 3.5]] as const) {
      const p = new THREE.PointLight("#ffc27a", 0, 22, 2);
      p.position.set(x, y, z);
      scene.add(p);
      inner.push(p);
    }

    const hallLights: THREE.PointLight[] = [];
    for (const [x, y, z] of [[6, 3.4, 1.8], [7.6, 3.4, -1.6]] as const) {
      const p = new THREE.PointLight("#ffd9ab", 30, 18, 2);
      p.position.set(x, y, z);
      scene.add(p);
      hallLights.push(p);
    }

    // ---- materials -------------------------------------------------------------------------------------------
    const std = (color: string, rough: number, metal = 0) => track(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
    const limestone = std("#d9cfbd", 0.92);
    const white = std("#ece6da", 0.85);
    const darkStone = std("#2c2b29", 0.82);
    const bronze = std("#8f6b3c", 0.34, 0.75);
    const timber = std("#7a5233", 0.68);
    const paving = std("#b5ab9a", 0.95);
    const lawn = std("#6a7a4c", 1);
    const interiorWall = std("#4a4036", 0.9);
    const plaster = std("#e3dac9", 0.9);
    const oak = std("#a98259", 0.6);
    const floorStone = std("#a99f8d", 0.24, 0.06);
    const ceilWhite = std("#efe9dd", 0.95);
    const daylight = track(new THREE.MeshStandardMaterial({ color: "#2a2a2a", emissive: new THREE.Color("#f4d9b0"), emissiveIntensity: 1.2, roughness: 1 }));
    const glass = track(new THREE.MeshStandardMaterial({ color: "#a9bcc4", roughness: 0.05, metalness: 0.85, transparent: true, opacity: 0.38, envMapIntensity: 1.6 }));
    const warm = track(new THREE.MeshStandardMaterial({ color: "#2a2018", emissive: new THREE.Color("#ffbf74"), emissiveIntensity: 0.3, roughness: 0.8 }));
    const lampMat = track(new THREE.MeshStandardMaterial({ color: "#2a2018", emissive: new THREE.Color("#ffcf8a"), emissiveIntensity: 0.2 }));
    const water = track(new THREE.MeshStandardMaterial({ color: "#3f7686", roughness: 0.06, metalness: 0.55, emissive: new THREE.Color("#2fb4c4"), emissiveIntensity: 0, envMapIntensity: 1.8 }));

    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, cast = true, receive = true) => {
      track(geo);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = cast;
      m.receiveShadow = receive;
      scene.add(m);
      return m;
    };
    const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, cast = true) =>
      add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, cast);

    // ---- ground ----------------------------------------------------------------------------------------------
    const ground = add(new THREE.PlaneGeometry(900, 900), lawn, 0, 0, 0, false, true);
    ground.rotation.x = -Math.PI / 2;
    box(34, 0.3, 17, paving, 0, 0.15, 1.5, false); // terrace

    // ---- the house, facing +z --------------------------------------------------------------------------------
    // The ground floor leaves room for the hall (x 1.6 to 10.4, z -3.4 to 5.0) with a doorway in its front wall (x 5.15 to 6.85).
    // Masses either side of and behind the hall stop just short of its walls, so they never fight with the hall's own surfaces.
    box(13.5, 4, 10, interiorWall, -5.25, 2.3, 0);
    box(1.5, 4, 10, interiorWall, 11.25, 2.3, 0);
    box(8.8, 4, 1.5, interiorWall, 6, 2.3, -4.25);
    const plasterSide = plaster; // the inside face of the front wall is seen from the hall, so it matches the hall
    box(3.55, 4, 0.5, plasterSide, 3.375, 2.3, 4.75);
    box(3.55, 4, 0.5, plasterSide, 8.625, 2.3, 4.75);
    box(1.7, 1.0, 0.5, plasterSide, 6, 3.8, 4.75);
    box(8, 4, 0.5, limestone, -8, 2.3, 5.1); // solid wall, left
    box(3, 4, 0.5, darkStone, 10.5, 2.3, 5.1); // dark stone, right
    // lit interior and glass, in two pieces either side of the doorway
    for (const [w, cx] of [[8.95, 0.675], [1.95, 7.825]] as const) {
      add(new THREE.PlaneGeometry(w, 3.5), warm, cx, 2.2, 5.06, false, false);
      add(new THREE.PlaneGeometry(w, 3.5), glass, cx, 2.2, 5.2, false, false);
    }
    for (let i = 0; i <= 8; i++) if (i !== 6) box(0.09, 3.6, 0.16, bronze, -3.8 + i * 1.575, 2.2, 5.25, false); // mullions (none across the doorway)
    box(13.2, 0.1, 0.2, bronze, 2.5, 4.05, 5.25, false);
    // furniture seen through the glass
    box(3.6, 0.9, 0.5, std("#2a2018", 0.9), -0.6, 0.95, 5.0, false); // a sofa back against the glass
    for (const px of [-2, 1.5, 4]) {
      box(0.04, 1.2, 0.04, bronze, px, 3.4, 4.95, false);
      const pendant = add(new THREE.SphereGeometry(0.26, 16, 12), lampMat, px, 2.75, 4.95, false, false);
      pendant.castShadow = false;
    }
    // the door and its canopy
    const doorPivot = new THREE.Group(); // hinged on its left edge; swings inward
    doorPivot.position.set(5.15, 0, 5.32);
    scene.add(doorPivot);
    const doorLeaf = new THREE.Mesh(track(new THREE.BoxGeometry(1.7, 2.9, 0.14)), bronze);
    doorLeaf.position.set(0.85, 1.75, 0);
    doorLeaf.castShadow = true;
    doorPivot.add(doorLeaf);
    const doorPull = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 0.9, 0.08)), white);
    doorPull.position.set(1.4, 1.7, 0.11);
    doorPivot.add(doorPull);
    box(5, 0.26, 3.2, white, 6, 3.55, 6.7);
    for (const dx of [-2.2, 2.2]) {
      const w = add(new THREE.SphereGeometry(0.16, 12, 10), lampMat, 6 + dx * 0.55, 2.7, 5.5, false, false);
      w.castShadow = false;
    }
    box(5.6, 0.12, 4, paving, 6, 0.36, 6.5, false);
    // the upper volume, timber fins over a lit window
    box(18, 3.4, 9, interiorWall, -2, 6.0, 1.5);
    const glow2 = add(new THREE.PlaneGeometry(17.2, 3), warm, -2, 6.0, 6.06, false, false);
    glow2.castShadow = false;
    const finGeo = track(new THREE.BoxGeometry(0.13, 3.2, 0.3));
    const fins = new THREE.InstancedMesh(finGeo, timber, 38);
    const fm = new THREE.Matrix4();
    for (let i = 0; i < 38; i++) { fm.makeTranslation(-10.4 + i * 0.47, 6.0, 6.25); fins.setMatrixAt(i, fm); }
    fins.castShadow = true; fins.receiveShadow = true;
    scene.add(fins);
    box(19, 0.35, 10.4, white, -2, 7.88, 1.6); // roof slabs
    box(25, 0.34, 10.8, white, 0, 4.47, 0.4);
    box(1.3, 10.6, 6, darkStone, 11.2, 5.6, -1.2); // the tall stone wall
    box(6, 1.2, 4, limestone, 8, 5.1, -2); // upper terrace wall
    // ---- the hall: the same limestone, timber, bronze and warm light as the outside --------------------------------
    // A shell seen from the inside only (BackSide), so from the garden it is invisible and the doorway simply shows the room.
    {
      const faces = [plaster, plaster, ceilWhite, floorStone, plaster, oak].map((m) => {
        const c = m.clone();
        c.side = THREE.BackSide;
        track(c);
        return c;
      });
      const shell = new THREE.Mesh(track(new THREE.BoxGeometry(8.8, 3.8, 8.4)), faces);
      shell.position.set(6, 2.2, 0.8);
      shell.receiveShadow = true;
      scene.add(shell);
    }
    // timber slats on the back wall, with a niche light above
    for (let i = 0; i < 14; i++) box(0.06, 3.5, 0.08, bronze, 2.2 + i * 0.6, 2.2, -3.32, false);
    box(8.2, 0.08, 0.5, warm, 6, 4.0, -3.15, false);
    // a window onto the garden in the left wall, glowing with the light outside
    add(new THREE.PlaneGeometry(5.2, 2.6), daylight, 1.64, 2.0, 0.6, false, false).rotation.y = Math.PI / 2;
    box(0.06, 2.7, 0.1, bronze, 1.66, 2.0, -2.0, false);
    box(0.06, 2.7, 0.1, bronze, 1.66, 2.0, 3.2, false);
    // a floating staircase along the right wall
    for (let i = 0; i < 10; i++) box(1.5, 0.12, 0.62, limestone, 9.6, 0.5 + i * 0.3, 3.4 - i * 0.62, false);
    box(0.05, 2.4, 6.2, glass, 8.82, 2.3, 0.3, false);
    // the seating group, a rug, a console and a plant
    box(4.6, 0.02, 3.4, std("#cdbb9d", 1), 4.6, 0.31, -0.9, false);
    box(2.9, 0.62, 1.0, std("#7d7366", 0.9), 4.6, 0.65, -1.7);
    box(2.9, 0.7, 0.26, std("#7d7366", 0.9), 4.6, 0.95, -2.2);
    box(1.3, 0.34, 0.75, white, 4.6, 0.5, -0.5);
    box(0.8, 0.62, 0.9, std("#9a6b3c", 0.8), 2.9, 0.65, -0.2);
    box(2.3, 0.8, 0.5, darkStone, 6.4, 0.7, -3.0);
    box(1.7, 1.15, 0.05, bronze, 6.4, 2.3, -3.3, false);
    box(1.52, 0.97, 0.03, limestone, 6.4, 2.3, -3.27, false);
    box(0.5, 0.45, 0.5, darkStone, 2.4, 0.55, -2.9);
    add(new THREE.SphereGeometry(0.62, 14, 10), std("#3d5233", 0.95), 2.4, 1.45, -2.9);
    for (const px of [5.2, 6.8, 8.4]) {
      box(0.03, 0.9, 0.03, bronze, px, 3.65, -0.4, false);
      const pend = add(new THREE.SphereGeometry(0.24, 16, 12), lampMat, px, 3.12, -0.4, false, false);
      pend.castShadow = false;
    }
    // ---- pool ------------------------------------------------------------------------------------------------
    box(10.6, 0.34, 4.6, white, -11, 0.17, 12.2, false);
    const pool = add(new THREE.PlaneGeometry(9.6, 3.6), water, -11, 0.36, 12.2, false, true);
    pool.rotation.x = -Math.PI / 2;
    // ---- path and lamps --------------------------------------------------------------------------------------
    for (let i = 0; i < 16; i++) box(2.3, 0.12, 1.3, paving, 6, 0.06, 9.5 + i * 3.1, false);
    const lamps: THREE.PointLight[] = [];
    for (let i = 0; i < 7; i++) {
      for (const side of [-1.9, 1.9]) {
        const z = 12 + i * 5.5;
        box(0.18, 0.7, 0.18, darkStone, 6 + side, 0.35, z, false);
        const bulb = add(new THREE.SphereGeometry(0.13, 10, 8), lampMat, 6 + side, 0.78, z, false, false);
        bulb.castShadow = false;
      }
      if (i % 3 === 0) {
        const p = new THREE.PointLight("#ffcf8a", 0, 14, 2);
        p.position.set(6, 1.1, 12 + i * 5.5);
        scene.add(p);
        lamps.push(p);
      }
    }
    // ---- trees and hills -------------------------------------------------------------------------------------
    const rand = rng(11);
    const trunkGeo = track(new THREE.CylinderGeometry(0.18, 0.28, 1, 6));
    const crownGeo = track(new THREE.IcosahedronGeometry(1, 1));
    const treeCount = small() ? 38 : 64;
    const trunks = new THREE.InstancedMesh(trunkGeo, std("#4a3a2c", 1), treeCount);
    const crowns = new THREE.InstancedMesh(crownGeo, std("#3d5233", 0.95), treeCount);
    const tm = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const tc = new THREE.Color();
    for (let i = 0; i < treeCount; i++) {
      let x = 0, z = 0;
      for (let tries = 0; tries < 30; tries++) {
        x = (rand() - 0.5) * 150;
        z = -20 + rand() * 120;
        // Keep the whole approach clear: trees stand behind the house, at its sides, or far out to the sides of the road.
        const behind = z < -4;
        const beside = Math.abs(x) > 24 && z < 8;
        const farOut = x < -44 || x > 30;
        if (behind || beside || farOut) break;
      }
      const h = 5 + rand() * 7;
      const r = 1.8 + rand() * 2.4;
      tm.compose(new THREE.Vector3(x, h * 0.25, z), q, new THREE.Vector3(1, h * 0.5, 1));
      trunks.setMatrixAt(i, tm);
      tm.compose(new THREE.Vector3(x, h * 0.62, z), q, new THREE.Vector3(r, r * (0.9 + rand() * 0.5), r));
      crowns.setMatrixAt(i, tm);
      crowns.setColorAt(i, tc.setHSL(0.24 + rand() * 0.05, 0.3, 0.3 + rand() * 0.1));
    }
    for (const m of [trunks, crowns]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }
    const hillMat = std("#59644c", 1);
    for (let i = 0; i < 14; i++) {
      const a = -0.9 + (i / 13) * 1.8 + Math.PI;
      const hill = add(new THREE.SphereGeometry(1, 16, 10), hillMat, Math.sin(a) * 240, 0, Math.cos(a) * 240 * -1 - 40, false, false);
      hill.scale.set(60 + rand() * 50, 14 + rand() * 20, 40 + rand() * 20);
    }

    // ---- dust in the light -----------------------------------------------------------------------------------
    const motes = 140;
    const mp = new Float32Array(motes * 3);
    for (let i = 0; i < motes; i++) { mp[i * 3] = (rand() - 0.5) * 50; mp[i * 3 + 1] = 0.5 + rand() * 12; mp[i * 3 + 2] = rand() * 55; }
    const moteGeo = track(new THREE.BufferGeometry());
    moteGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
    const moteMat = track(new THREE.PointsMaterial({ color: "#ffe9c4", size: 0.12, transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true }));
    const points = new THREE.Points(moteGeo, moteMat);
    scene.add(points);

    // ---- applying a mood of light ---------------------------------------------------------------------------
    const applyLight = (l: Light) => {
      sun.color.set(l.sunColor);
      sun.intensity = l.sunIntensity;
      const d = new THREE.Vector3(...l.sunDir).normalize();
      sun.position.set(d.x * 100, d.y * 100 + 4, d.z * 100);
      sun.target.position.set(0, 2, 0);
      hemi.color.set(l.hemiSky);
      hemi.groundColor.set(l.hemiGround);
      hemi.intensity = l.hemiIntensity;
      (scene.fog as THREE.Fog).color.set(l.fog);
      (scene.fog as THREE.Fog).near = l.fogNear;
      (scene.fog as THREE.Fog).far = l.fogFar;
      gl.toneMappingExposure = l.exposure;
      skyUniforms.top.value.set(l.skyTop);
      skyUniforms.horizon.value.set(l.skyHorizon);
      skyUniforms.sunDir.value.copy(d);
      skyUniforms.sunColor.value.set(l.sunColor);
      skyUniforms.stars.value = l.stars;
      warm.emissiveIntensity = 0.18 + l.glow * 1.9;
      lampMat.emissiveIntensity = 0.1 + l.glow * 3;
      water.emissiveIntensity = l.glow * 0.5;
      for (const p of inner) p.intensity = l.glow * 90;
      for (const p of hallLights) p.intensity = 26 + l.glow * 50;
      daylight.emissive.set(l.skyHorizon);
      daylight.emissiveIntensity = 0.35 + (1 - l.glow) * 1.3;
      for (const p of lamps) p.intensity = l.glow * 40;
      moteMat.opacity = 0.15 + (1 - l.glow) * 0.45;
    };

    // ---- sizing ----------------------------------------------------------------------------------------------
    const resize = () => {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      gl.setSize(w, h, false);
      gl.domElement.style.width = "100%";
      gl.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? 48 : w / h < 1.5 ? 44 : 38;
      camera.updateProjectionMatrix();
      baseFov = camera.fov;
      dirty = true;
    };
    let baseFov = camera.fov;
    let dirty = true;
    poke.current = () => { dirty = true; };
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // ---- pointer ---------------------------------------------------------------------------------------------
    const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
    const onMove = (e: PointerEvent) => {
      ptr.x = (e.clientX / window.innerWidth - 0.5) * 2;
      ptr.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // ---- the loop --------------------------------------------------------------------------------------------
    let cur: Light = lightById(props.current.light);
    let from = cur;
    let to = cur;
    let toId: LightId = cur.id;
    let fadeStart = 0;
    let lastEnv = 0;
    let enterStart = -1;
    let enterFrom = 0;
    let enterMs = ENTER_MS;
    let phaseSeen = props.current.phase;
    let jt = props.current.phase === "inside" ? 2 : 0; // where we are on the journey: 0 wide view, 1 the door, 2 the hall
    let arrived = props.current.phase === "inside";
    let lastDraw = 0;
    let ready = false;
    const t0 = performance.now();
    applyLight(cur);
    refreshEnv();
    resize();
    const look = new THREE.Vector3();

    const frame = () => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const p = props.current;
      const now = performance.now();
      const animating = !p.still;

      if (p.light !== toId) {
        from = cur; to = lightById(p.light); toId = p.light; fadeStart = now; dirty = true;
      }
      let fading = false;
      if (cur !== to) {
        const k = p.still ? 1 : Math.min(1, (now - fadeStart) / FADE_MS);
        cur = k >= 1 ? to : mixLight(from, to, smooth(k));
        applyLight(cur);
        fading = k < 1;
        if (!fading || now - lastEnv > 380) { refreshEnv(); lastEnv = now; }
      }

      if (p.paused?.current && cur === to) return;
      const driven = p.drive?.current ?? null;
      if (!animating && !dirty && driven === null) return;
      // In the workspace the hall only needs to be there: about 20 frames a second is plenty and saves the machine.
      if (p.calm && !dirty && now - lastDraw < 48) return;
      lastDraw = now;

      const elapsed = (now - t0) / 1000;
      if (p.phase !== phaseSeen) {
        phaseSeen = p.phase;
        if (p.phase === "entering" && jt < 2) { enterStart = now; enterFrom = jt; enterMs = ENTER_MS; arrived = false; }
        else if (p.phase === "inside" && jt < 2) {
          if (p.still) jt = 2;
          else { enterStart = enterStart < 0 ? now : enterStart; enterFrom = enterStart === now ? jt : enterFrom; enterMs = SKIP_MS; }
        } else if (p.phase === "outside") { jt = 0; enterStart = -1; arrived = false; }
      }
      if (p.phase === "outside") {
        // Before the walk the camera rests at the end of its opening drift; on the walk it follows the scroll, eased.
        const target = driven ?? (animating ? introProgress(elapsed) : introProgress(99));
        jt = driven === null && animating && elapsed < 18 ? target : jt + (target - jt) * (p.still ? 1 : 0.12);
      }
      else if (enterStart >= 0 && jt < 2) {
        const e = p.still ? 1 : Math.min(1, (now - enterStart) / enterMs);
        jt = enterFrom + (2 - enterFrom) * (e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2);
        if (e >= 1) jt = 2;
      }
      if (jt >= 2 && !arrived) { arrived = true; props.current.onArrive?.(); }
      doorPivot.rotation.y = smooth(Math.max(0, Math.min(1, (jt - 0.92) / 0.34))) * 1.7;
      const pose = journeyAt(jt);
      ptr.sx += (ptr.x - ptr.sx) * 0.05;
      ptr.sy += (ptr.y - ptr.sy) * 0.05;
      const par = p.still ? 0 : jt > 1.3 ? 0.22 : 1; // inside the hall, keep the look-around small so the camera stays in the room
      const sway = animating ? Math.sin(elapsed * 0.35) * (jt > 1.3 ? 0.06 : 0.35) : 0;
      const portrait = portraitScale(camera.aspect);
      const scale = portrait + (1 - portrait) * Math.max(0, Math.min(1, (jt - 0.8) / 0.5));
      // Inside, open the lens a little so the whole room reads.
      const fov = baseFov + 16 * smooth(Math.max(0, Math.min(1, (jt - 1.15) / 0.55)));
      if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
      look.set(pose.look[0], pose.look[1], pose.look[2]);
      camera.position.set(
        look.x + (pose.pos[0] - look.x) * scale + (ptr.sx * 1.4 + sway) * par,
        look.y + (pose.pos[1] - look.y) * scale - ptr.sy * 0.45 * par,
        look.z + (pose.pos[2] - look.z) * scale,
      );
      camera.lookAt(look);
      dome.position.copy(camera.position);
      if (animating) {
        const a = points.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < motes; i++) {
          // Rise slowly and wrap from the top back to the bottom. (An earlier version added 0.5 every frame, which made the
          // motes jump up and down: that was the flicker on the right of the opening.)
          let y = a.getY(i) + 0.004 * (1 + (i % 5) * 0.3);
          if (y > 12.5) y = 0.5;
          a.setY(i, y);
          a.setX(i, a.getX(i) + Math.sin(elapsed * 0.4 + i) * 0.003);
        }
        a.needsUpdate = true;
      }
      gl.render(scene, camera);
      dirty = fading || (!animating && cur !== to);
      if (!ready) { ready = true; props.current.onReady?.(); }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      gl.domElement.removeEventListener("webglcontextlost", onLost);
      envRT?.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      for (const d of disposables) d.dispose();
      gl.dispose();
      gl.forceContextLoss();
      gl.domElement.remove();
      poke.current = () => {};
    };
  }, []);

  return <div ref={host} className="arch-host" />;
}
