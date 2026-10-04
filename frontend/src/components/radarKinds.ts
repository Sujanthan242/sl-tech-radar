/**
 * Kind → color mapping shared by the 3D radar scene (RadarScene.tsx) and its
 * HTML legend/tooltip (RadarHero3D.tsx). Single source of truth so the scene
 * and the overlay can never disagree.
 *
 * Colors live in the neon-cyan brand family: cyan stays primary (hackathons),
 * the rest are luminous accents readable on the #04070f void.
 */
export const KIND_COLORS: Record<string, string> = {
  hackathon: "#00e5ff",
  internship: "#3ddc97",
  course: "#ffb454",
  scholarship: "#ff6b81",
  "free-offer": "#a78bfa",
};

export const KIND_LABELS: Record<string, string> = {
  hackathon: "Hackathons",
  internship: "Internships",
  course: "Courses",
  scholarship: "Scholarships",
  "free-offer": "Free offers",
};

/** Kind → hex color, falling back to neon cyan for unknown kinds. */
export function kindColor(kind: string): string {
  return KIND_COLORS[kind] ?? "#00e5ff";
}

/** Kind → human label, falling back to the raw kind string. */
export function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

/**
 * Deterministic 32-bit hash of a string → [0, 1). Used to jitter node
 * positions so the layout is stable across renders and sessions.
 */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
