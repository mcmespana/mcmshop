import { interpolate, Easing, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../theme";
import type { Line } from "../data/lyrics";

export type Variant = "soft" | "bold" | "rise" | "hero";

const VARIANTS: Record<
  Variant,
  {
    size: number;
    weight: number;
    color: string;
    accentColor: string;
    lift: number;
    letterSpacing: number;
  }
> = {
  soft: {
    size: 98,
    weight: 600,
    color: COLORS.blue,
    accentColor: COLORS.cyan,
    lift: 34,
    letterSpacing: -1,
  },
  bold: {
    size: 114,
    weight: 700,
    color: COLORS.blue,
    accentColor: COLORS.cyan,
    lift: 46,
    letterSpacing: -1.5,
  },
  rise: {
    size: 106,
    weight: 700,
    color: COLORS.blueDark,
    accentColor: COLORS.cyan,
    lift: 62,
    letterSpacing: -1.5,
  },
  hero: {
    size: 120,
    weight: 700,
    color: COLORS.blue,
    accentColor: COLORS.yellowDeep,
    lift: 70,
    letterSpacing: -3,
  },
};

/** Reparte la duración de la línea entre sus palabras, según su longitud. */
const wordTimings = (line: Line) => {
  const words = line.text.split(" ");
  const weights = words.map((w) => Math.max(2, w.replace(/[.,…]/g, "").length));
  const total = weights.reduce((a, b) => a + b, 0);
  const dur = line.end - line.start;
  let acc = 0;
  return words.map((w, i) => {
    const start = line.start + (acc / total) * dur;
    acc += weights[i];
    const end = line.start + (acc / total) * dur;
    return { word: w, start, end };
  });
};

/**
 * Una línea de letra con entrada palabra a palabra y resaltado
 * de la palabra que se está cantando.
 */
export const LyricLine: React.FC<{
  line: Line;
  /** Tiempo actual, en segundos del audio. */
  time: number;
  variant: Variant;
  /** Se desvanece al terminar la línea. */
  fadeOutAfter?: number;
}> = ({ line, time, variant, fadeOutAfter = 0.45 }) => {
  const { fps } = useVideoConfig();
  const v = VARIANTS[variant];
  const words = wordTimings(line);
  const accents = new Set((line.accent ?? []).map((a) => a.toLowerCase()));

  const out = interpolate(
    time,
    [line.end, line.end + fadeOutAfter],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) },
  );

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: variant === "hero" ? "center" : "flex-start",
        alignItems: "baseline",
        gap: `${v.size * 0.06}px ${v.size * 0.28}px`,
        opacity: out,
        maxWidth: variant === "hero" ? 1680 : 1240,
      }}
    >
      {words.map((w, i) => {
        const isAccent = accents.has(w.word.toLowerCase());
        // Entrada: la palabra se anticipa ligeramente a su ataque.
        const appear = (w.start - line.start > 0 ? w.start - 0.12 : line.start) ;
        const s = spring({
          frame: (time - appear) * fps,
          fps,
          config: { damping: 14, mass: 0.55, stiffness: 130 },
          durationInFrames: Math.round(fps * 0.55),
        });
        // Resaltado mientras se canta esa palabra.
        const sung = interpolate(
          time,
          [w.start - 0.05, w.start + 0.12, w.end + 0.1, w.end + 0.5],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontFamily: isAccent ? FONTS.script : FONTS.body,
              fontWeight: isAccent ? 700 : v.weight,
              fontSize: isAccent ? v.size * 1.34 : v.size,
              lineHeight: 1.02,
              letterSpacing: v.letterSpacing,
              color: isAccent ? v.accentColor : v.color,
              opacity: interpolate(s, [0, 1], [0, 1]),
              filter: `blur(${interpolate(s, [0, 1], [10, 0])}px)`,
              translate: `0px ${interpolate(s, [0, 1], [v.lift, 0]).toFixed(2)}px`,
              scale: interpolate(sung, [0, 1], [1, 1.055], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              textShadow:
                variant === "hero"
                  ? `0 ${6 + sung * 6}px 0 ${COLORS.cyanSoft}55, 0 ${
                      14 + sung * 10
                    }px 34px rgba(1,68,107,0.20)`
                  : `0 ${4 + sung * 4}px 16px rgba(1,68,107,${0.1 + sung * 0.12})`,
              transformOrigin: "50% 90%",
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
