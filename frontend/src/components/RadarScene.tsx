/**
 * RadarScene — the genuine React Three Fiber radar visualization.
 *
 * Loaded with `ssr: false` from RadarHero3D.tsx (client-only; never touches
 * the server render). Every element maps to real candidate data:
 *
 *   - disc shader: concentric rings + 12 radial spokes + rotating sweep beam
 *     with a fading trail (all drawn in one cheap fragment shader)
 *   - nodes: one per Candidate. Quadrant = category, radius = deadline
 *     urgency (inner rings = closing soon), color = kind, pulse = urgency
 *     (≤7 days pulses hard, no deadline barely breathes)
 *   - hover/tap a node → parent tooltip (title + deadline + source);
 *     click → onSelect(id)
 *
 * Perf guards: pixel ratio capped at [1, 2], one 72-segment disc, ≤ a dozen
 * low-poly spheres, no postprocessing (bloom feel via additive blending),
 * `frameloop` drops to "never" when off-screen or under reduced-motion.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Candidate } from "@/lib/types";
import { daysUntil } from "@/lib/format";
import { hash01, kindColor } from "./radarKinds";

export interface RadarSceneProps {
  candidates: Candidate[];
  /** false under prefers-reduced-motion → renders one static frame */
  animated: boolean;
  /** false when scrolled off-screen → render loop pauses */
  active: boolean;
  onHover: (c: Candidate | null) => void;
  onSelect: (id: string) => void;
}

const RADIUS = 5;
const TAU = Math.PI * 2;

/* Quadrant per category (radians in the XZ plane). Free-offers share the
   nearest quadrant via hash fallback. */
const QUADRANT: Record<string, number> = {
  hackathons: -Math.PI / 2,
  internships: 0,
  courses: Math.PI / 2,
  scholarships: Math.PI,
};

interface Plotted {
  c: Candidate;
  pos: [number, number, number];
  color: string;
  urgent: boolean;
  hasDeadline: boolean;
}

/** Deterministic layout: quadrant = category, radius = deadline urgency. */
function plotCandidates(candidates: Candidate[]): Plotted[] {
  return candidates.map((c) => {
    const days = daysUntil(c.deadline);
    const urgent = days !== null && days >= 0 && days <= 7;
    const base = QUADRANT[c.category] ?? hash01(c.id) * TAU;
    const ang = base + (hash01(`${c.id}:a`) - 0.5) * 0.95;
    const frac =
      urgent
        ? 0.48 + hash01(`${c.id}:r`) * 0.22
        : days !== null && days >= 0 && days <= 30
          ? 0.7 + hash01(`${c.id}:r`) * 0.14
          : 0.84 + hash01(`${c.id}:r`) * 0.1;
    const r = frac * RADIUS;
    return {
      c,
      pos: [Math.cos(ang) * r, 0.07, Math.sin(ang) * r],
      color: kindColor(c.kind),
      urgent,
      hasDeadline: days !== null && days >= 0,
    };
  });
}

/* ---------------- disc shader (rings + spokes + sweep + trail) ---------------- */

const DISC_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DISC_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uSweep;
  uniform vec3 uColor;
  #define TAU 6.28318530718

  void main() {
    vec2 p = vUv - vec2(0.5);
    float r = length(p) * 2.0; // 0 center → 1 edge
    if (r > 1.0) discard;
    float ang = atan(p.y, p.x);

    // concentric rings (5, outer one brighter)
    float rings = 0.0;
    for (int i = 1; i <= 5; i++) {
      float rr = float(i) / 5.0 * 0.96;
      float w = i == 5 ? 0.010 : 0.005;
      rings += (1.0 - smoothstep(0.0, w, abs(r - rr))) * (i == 5 ? 1.0 : 0.55);
    }

    // 12 radial spokes, fading toward the center
    float sp = abs(fract(ang / TAU * 12.0 + 0.5) - 0.5);
    float spokes = (1.0 - smoothstep(0.0, 0.012, sp * (0.25 + r))) * 0.16 * smoothstep(0.04, 0.3, r);

    // sweep: d = angular distance behind the head; trail decays exponentially
    float d = mod(uSweep - ang, TAU);
    float head = (1.0 - smoothstep(0.0, 0.35, d)) * 1.8;
    float trail = exp(-d * 1.9) * smoothstep(0.02, 0.12, d) * 0.6;
    float sweep = (head + trail) * (1.0 - smoothstep(0.9, 1.0, r)) * smoothstep(0.0, 0.08, r);

    // center glow + faint disc fill so the void isn't flat
    float center = (1.0 - smoothstep(0.0, 0.07, r)) * 1.6;
    float fill = (1.0 - smoothstep(0.0, 1.0, r)) * 0.05;

    float intensity = rings + spokes + sweep + center + fill;
    gl_FragColor = vec4(uColor * intensity, 1.0);
  }
`;

function RadarDisc({ animated }: { animated: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSweep: { value: 0.9 },
          uColor: { value: new THREE.Color("#00e5ff") },
        },
        vertexShader: DISC_VERT,
        fragmentShader: DISC_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  useEffect(() => () => mat.dispose(), [mat]);

  useFrame(({ clock }) => {
    if (!animated) return;
    const m = meshRef.current?.material as THREE.ShaderMaterial | undefined;
    if (m) m.uniforms.uSweep.value = (clock.getElapsedTime() * 0.85) % TAU;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <circleGeometry args={[RADIUS, 72]} />
    </mesh>
  );
}

/* ---------------- glow sprite texture (canvas-generated, shared) ---------------- */

function makeGlowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ---------------- opportunity node ---------------- */

function NodeBlip({
  plot,
  animated,
  hovered,
  glowTex,
  onHover,
  onSelect,
}: {
  plot: Plotted;
  animated: boolean;
  hovered: boolean;
  glowTex: THREE.Texture;
  onHover: (c: Candidate | null) => void;
  onSelect: (id: string) => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.SpriteMaterial>(null);
  const phase = useMemo(() => hash01(plot.c.id) * TAU, [plot.c.id]);

  useFrame(({ clock }) => {
    if (!animated) return;
    const t = clock.getElapsedTime();
    const speed = plot.urgent ? 5.5 : plot.hasDeadline ? 2.1 : 1.2;
    const amp = plot.urgent ? 0.34 : plot.hasDeadline ? 0.13 : 0.06;
    const pulse = Math.sin(t * speed + phase);
    const s = (1 + amp * pulse) * (hovered ? 1.4 : 1);
    mesh.current?.scale.setScalar(s);
    if (halo.current) {
      halo.current.opacity = (plot.urgent ? 0.8 : 0.45) + amp * pulse;
    }
  });

  return (
    <group position={plot.pos}>
      {/* halo — the bloom feel, no postprocessing needed */}
      <sprite scale={[1.15, 1.15, 1]}>
        <spriteMaterial
          ref={halo}
          map={glowTex}
          color={plot.color}
          transparent
          opacity={plot.urgent ? 0.8 : 0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      {/* core */}
      <mesh
        ref={mesh}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(plot.c);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(plot.c.id);
        }}
      >
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshBasicMaterial color={plot.color} toneMapped={false} />
      </mesh>
      {/* urgent nodes get a thin warning ring lying on the disc */}
      {plot.urgent && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <ringGeometry args={[0.22, 0.26, 40]} />
          <meshBasicMaterial color={plot.color} transparent opacity={0.65} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/* ---------------- slow auto-rotation + gentle float ---------------- */

function RadarRig({ animated, children }: { animated: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!animated || !g.current) return;
    const t = clock.getElapsedTime();
    g.current.rotation.y = 0.35 + t * 0.055;
    g.current.position.y = Math.sin(t * 0.5) * 0.16;
  });

  return (
    <group ref={g} rotation={[0, 0.35, 0]}>
      {children}
    </group>
  );
}

/* ---------------- scene root ---------------- */

export default function RadarScene({ candidates, animated, active, onHover, onSelect }: RadarSceneProps) {
  const plotted = useMemo(() => plotCandidates(candidates), [candidates]);
  const glowTex = useMemo(() => makeGlowTexture(), []);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => () => glowTex.dispose(), [glowTex]);

  const handleHover = (c: Candidate | null) => {
    setHoveredId(c ? c.id : null);
    onHover(c);
  };

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={animated && active ? "always" : "never"}
      camera={{ position: [0, 8.6, 11.6], fov: 40 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance", stencil: false }}
      onCreated={(state) => state.camera.lookAt(0, 0.2, 0)}
      onPointerMissed={() => handleHover(null)}
    >
      <color attach="background" args={["#04070f"]} />
      <fog attach="fog" args={["#04070f", 16, 34]} />
      <RadarRig animated={animated}>
        <RadarDisc animated={animated} />
        {plotted.map((p) => (
          <NodeBlip
            key={p.c.id}
            plot={p}
            animated={animated}
            hovered={hoveredId === p.c.id}
            glowTex={glowTex}
            onHover={handleHover}
            onSelect={onSelect}
          />
        ))}
      </RadarRig>
    </Canvas>
  );
}
