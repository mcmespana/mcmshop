/**
 * Mapa de sincronización de "Samaritano" (premaster, 263,4 s).
 *
 * Los tiempos de sección y el tempo (100,4 BPM) están medidos sobre el audio
 * (flujo espectral + energía de banda vocal). Los tiempos de verso están
 * ajustados a los ataques vocales detectados y repartidos por número de
 * sílabas. Son un primer pase: se afinan cambiando SÓLO los números de aquí,
 * o importando un .srt/.lrc con `npm run srt -- fichero.srt`.
 *
 * `start` y `end` van en SEGUNDOS del audio original.
 */

export type Line = {
  start: number;
  end: number;
  text: string;
  /** Palabras que se resaltan en cian/amarillo dentro de la línea. */
  accent?: string[];
};

export type SectionId = "intro" | "verse1" | "verse2" | "prechorus" | "chorus";

export type Section = {
  id: SectionId;
  /** Etiqueta legible, sólo informativa. */
  label: string;
  start: number;
  end: number;
  lines: Line[];
};

export const SECTIONS: Section[] = [
  {
    id: "intro",
    label: "Intro instrumental",
    start: 0,
    end: 12.91,
    lines: [],
  },
  {
    id: "verse1",
    label: "Estrofa 1 — sólo piano",
    start: 12.91,
    end: 28.6,
    lines: [
      { start: 12.91, end: 14.30, text: "Me encontraste", accent: ["encontraste"] },
      { start: 14.37, end: 16.3, text: "sufriendo en silencio" },
      { start: 16.37, end: 18.6, text: "el miedo al abandono." },
      { start: 18.7, end: 20.6, text: "Me sentía incomprendido," },
      { start: 20.69, end: 22.35, text: "a la vez tan dolorido." },
      { start: 22.42, end: 24.75, text: "Solo y despreciado," },
      { start: 24.83, end: 26.55, text: "hasta que llegaste Tú." },
      { start: 26.65, end: 28.40, text: "Y no pasaste.", accent: ["no", "pasaste."] },
    ],
  },
  {
    id: "verse2",
    label: "Estrofa 2 — entra la banda",
    start: 28.6,
    end: 48.75,
    lines: [
      { start: 28.66, end: 31.8, text: "Te acercaste con ternura", accent: ["ternura"] },
      { start: 31.9, end: 34.5, text: "para curar mis heridas." },
      { start: 34.6, end: 37.5, text: "Tú me viste ahí tan débil," },
      { start: 37.6, end: 40.8, text: "magullado por la vida" },
      { start: 40.9, end: 44.2, text: "que me hundía y me hundía…" },
      { start: 44.3, end: 47.6, text: "Pero ahí Tú me amaste.", accent: ["amaste."] },
    ],
  },
  {
    id: "prechorus",
    label: "Pre-estribillo",
    start: 48.75,
    end: 58.9,
    lines: [
      { start: 48.8, end: 51.5, text: "y escuché una voz tan suave" },
      { start: 51.6, end: 53.25, text: "llena de seguridad," },
      { start: 53.32, end: 55.5, text: "que invitaba a levantarme" },
      { start: 55.6, end: 57.8, text: "y a volver a caminar…", accent: ["caminar…"] },
    ],
  },
  {
    id: "chorus",
    label: "Estribillo — un compás por verso",
    start: 58.9,
    end: 78.0,
    lines: [
      { start: 58.9, end: 61.3, text: "Ven, amigo, ven,", accent: ["ven,"] },
      { start: 61.38, end: 63.55, text: "que te voy a cuidar." },
      { start: 63.62, end: 66.05, text: "Yo te tiendo la mano" },
      { start: 66.11, end: 68.45, text: "y te ayudo a levantar." },
      { start: 68.54, end: 70.85, text: "Solo no estarás,", accent: ["Solo"] },
      { start: 70.93, end: 73.25, text: "pues yo me quedaré" },
      { start: 73.33, end: 76.8, text: "contigo hasta el final." },
    ],
  },
];

/** Duración del corte que se está montando (demo del primer minuto largo). */
export const CUT_START = 0;
export const CUT_END = 82;

export const sectionAt = (t: number) =>
  SECTIONS.find((s) => t >= s.start && t < s.end) ?? SECTIONS[SECTIONS.length - 1];

export const ALL_LINES: Line[] = SECTIONS.flatMap((s) => s.lines);
