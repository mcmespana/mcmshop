import { staticFile } from "remotion";

/**
 * Paleta y tipografías extraídas del póster "SIN RODEOS"
 * (Fundación Educativa Consolación, lema 26/27).
 */
export const COLORS = {
  paper: "#EAF1FB",
  paperDeep: "#DCE8F8",
  grid: "#B9D3F0",
  gridBold: "#9DC2E9",
  blue: "#005B8E",
  blueDark: "#01446B",
  cyan: "#29ABE2",
  cyanSoft: "#7FCDF0",
  yellow: "#FFD23F",
  yellowDeep: "#F5B301",
  gold: "#FFC107",
  ink: "#3A3F46",
  grey: "#9AA3AD",
  white: "#FFFFFF",
} as const;

export const FONTS = {
  /** Cuerpo de la letra: redondeada, joven, muy legible en vídeo. */
  body: "Fredoka, system-ui, sans-serif",
  /** Remates y palabras destacadas: manuscrita. */
  script: "Caveat, cursive",
  /** Titulares muy contundentes. */
  heavy: "Nunito, system-ui, sans-serif",
  /** Fuentes reales de la marca (sólo tienen glifos de "sin rodeos"). */
  lava: "LavaPro-Rough, Nunito, sans-serif",
  jenthill: "JenthillLight, Caveat, cursive",
} as const;

export const fig = (name: string) => staticFile(`figures/${name}.png`);

/** Tempo medido sobre el premaster: 100,4 BPM. */
export const BPM = 100.4;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
/** Primer tiempo fuerte de la estrofa 1. */
export const BEAT_ANCHOR = 12.91;

/** Pulso 0→1 que decae en cada negra, para animar al ritmo. */
export const beatPulse = (timeInSeconds: number, decay = 0.55) => {
  const p = (timeInSeconds - BEAT_ANCHOR) / BEAT;
  const frac = p - Math.floor(p);
  if (p < 0) return 0;
  return Math.max(0, 1 - frac / decay);
};

/** Igual pero por compás (cada 4 negras): para acentos grandes. */
export const barPulse = (timeInSeconds: number, decay = 0.35) => {
  const p = (timeInSeconds - BEAT_ANCHOR) / BAR;
  const frac = p - Math.floor(p);
  if (p < 0) return 0;
  return Math.max(0, 1 - frac / decay);
};
