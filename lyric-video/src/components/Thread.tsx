import { AbsoluteFill } from "remotion";
import { COLORS } from "../theme";

export type ThreadConfig = {
  /** Altura base (0 = arriba, 1 = abajo). */
  baseY: number;
  /** Amplitud de la onda larga, en px. */
  amp: number;
  /** Nº de ondas largas a lo ancho. */
  waves: number;
  /** Centros (0→1) donde el hilo se enrolla haciendo un bucle. */
  loops: number[];
  /** Radio del bucle en px. */
  loopR: number;
  /** Grosor. */
  width: number;
  color: string;
  opacity: number;
  /** Desfase temporal para que cada hilo ondule distinto. */
  seed: number;
};

const bump = (u: number, center: number, half: number) => {
  const d = Math.abs(u - center) / half;
  if (d >= 1) return 0;
  return Math.cos((d * Math.PI) / 2) ** 2;
};

/**
 * Genera el path del hilo.
 * `tangle` 1 → lleno de rodeos; `tangle` 0 → recto, sin rodeos.
 */
export const threadPath = (
  cfg: ThreadConfig,
  w: number,
  h: number,
  tangle: number,
  phase: number,
) => {
  const N = 420;
  const pad = 260;
  const span = w + pad * 2;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const lin = -pad + u * span;
    const wave =
      Math.sin(u * Math.PI * 2 * cfg.waves + phase + cfg.seed) * cfg.amp;
    let lx = 0;
    let ly = 0;
    for (const c of cfg.loops) {
      const b = bump(u, c, 0.13);
      if (b === 0) continue;
      const a = u * Math.PI * 2 * 7 + phase * 0.5 + cfg.seed;
      lx += Math.cos(a) * cfg.loopR * b;
      ly += Math.sin(a) * cfg.loopR * b;
    }
    const x = lin + lx * tangle;
    const y = h * cfg.baseY + (wave + ly) * tangle;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
};

/**
 * El hilo amarillo del póster: el camino que une a las personas.
 * Durante las estrofas da rodeos; en el estribillo se estira y va directo.
 */
export const Threads: React.FC<{
  configs: ThreadConfig[];
  width: number;
  height: number;
  tangle: number;
  phase: number;
  /** 0→1: cuánto del hilo se ha dibujado ya. */
  draw: number;
  glow?: number;
}> = ({ configs, width, height, tangle, phase, draw, glow = 0 }) => (
  <AbsoluteFill>
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id="brilloHilo" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={14} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {glow > 0
        ? configs.map((cfg, i) => (
            <path
              key={`g${i}`}
              d={threadPath(cfg, width, height, tangle, phase)}
              fill="none"
              stroke={COLORS.gold}
              strokeWidth={cfg.width * 2.4}
              strokeLinecap="round"
              opacity={glow * 0.35 * cfg.opacity}
              filter="url(#brilloHilo)"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - draw}
            />
          ))
        : null}
      {configs.map((cfg, i) => (
        <path
          key={i}
          d={threadPath(cfg, width, height, tangle, phase)}
          fill="none"
          stroke={cfg.color}
          strokeWidth={cfg.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={cfg.opacity}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
        />
      ))}
    </svg>
  </AbsoluteFill>
);

/**
 * Hilos de fondo: los "rodeos" que atraviesan todo el vídeo.
 * Se mantienen fuera de la franja central (0,35-0,65) para no
 * cruzar nunca por encima de la letra.
 */
export const THREADS: ThreadConfig[] = [
  {
    baseY: 0.17,
    amp: 74,
    waves: 1.6,
    loops: [0.22, 0.68],
    loopR: 82,
    width: 10,
    color: COLORS.yellow,
    opacity: 0.95,
    seed: 0,
  },
  {
    baseY: 0.79,
    amp: 82,
    waves: 1.1,
    loops: [0.42],
    loopR: 95,
    width: 12,
    color: COLORS.yellow,
    opacity: 0.9,
    seed: 2.1,
  },
  {
    baseY: 0.93,
    amp: 44,
    waves: 2.2,
    loops: [0.8],
    loopR: 62,
    width: 7,
    color: COLORS.yellowDeep,
    opacity: 0.55,
    seed: 4.4,
  },
];
