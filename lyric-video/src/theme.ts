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

/**
 * Curva suave (C1): sale de 0 y llega a 1 con pendiente cero en ambos
 * extremos. Es la clave para que un pulso no dé el tirón.
 */
const smoothstep = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

/**
 * Envolvente de un golpe: sube en `attack`, baja en `decay` y se queda
 * quieta en 0 hasta el siguiente. Sin saltos de un frame a otro.
 */
const envelope = (frac: number, attack: number, decay: number) => {
  if (frac < attack) return smoothstep(frac / attack);
  if (frac < attack + decay) return 1 - smoothstep((frac - attack) / decay);
  return 0;
};

/**
 * Pulso 0→1 en cada negra.
 * `attack` y `decay` van en fracción de negra: por defecto sube en unos
 * 3 frames (a 30 fps) y baja en unos 9. Se apoya en el ritmo sin dar
 * el respingo de un diente de sierra.
 */
export const beatPulse = (timeInSeconds: number, attack = 0.26, decay = 0.5) => {
  const p = (timeInSeconds - BEAT_ANCHOR) / BEAT;
  if (p < 0) return 0;
  return envelope(p - Math.floor(p), attack, decay);
};

/** Igual pero por compás (cada 4 negras): para acentos grandes y lentos. */
export const barPulse = (timeInSeconds: number, attack = 0.06, decay = 0.3) => {
  const p = (timeInSeconds - BEAT_ANCHOR) / BAR;
  if (p < 0) return 0;
  return envelope(p - Math.floor(p), attack, decay);
};
