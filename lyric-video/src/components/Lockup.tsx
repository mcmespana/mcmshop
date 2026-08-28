import { interpolate, spring, useVideoConfig, Easing } from "remotion";
import { COLORS, FONTS } from "../theme";

/**
 * El lema "SIN RODEOS" con las fuentes reales del póster
 * (LavaPro-Rough + JenthillLight, extraídas del PDF original).
 * "rodeos" lleva el doble contorno azul/cian del cartel.
 */
export const Lockup: React.FC<{
  time: number;
  appearAt: number;
  size?: number;
}> = ({ time, appearAt, size = 1 }) => {
  const { fps } = useVideoConfig();
  const sin = spring({
    frame: (time - appearAt) * fps,
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 120 },
    durationInFrames: Math.round(fps * 0.7),
  });
  const rod = spring({
    frame: (time - appearAt - 0.28) * fps,
    fps,
    config: { damping: 11, mass: 0.7, stiffness: 105 },
    durationInFrames: Math.round(fps * 0.85),
  });
  // "rodeos" se escribe de izquierda a derecha, como a mano.
  const write = interpolate(time, [appearAt + 0.3, appearAt + 1.35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        scale: size.toString(),
      }}
    >
      <div
        style={{
          fontFamily: FONTS.lava,
          fontSize: 190,
          color: COLORS.blue,
          letterSpacing: 6,
          lineHeight: 0.9,
          marginLeft: -230,
          opacity: sin,
          translate: `0px ${interpolate(sin, [0, 1], [50, 0]).toFixed(1)}px`,
          filter: `blur(${interpolate(sin, [0, 1], [14, 0])}px)`,
        }}
      >
        sin
      </div>
      <div
        style={{
          position: "relative",
          marginTop: -110,
          opacity: rod,
          scale: interpolate(rod, [0, 1], [0.86, 1]).toFixed(3),
          clipPath: `inset(0 ${((1 - write) * 100).toFixed(2)}% 0 0)`,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.jenthill,
            fontSize: 360,
            lineHeight: 1,
            color: COLORS.blue,
            textShadow: `10px 12px 0 ${COLORS.cyan}, -3px -3px 0 ${COLORS.cyan}, 0 26px 44px rgba(1,68,107,0.18)`,
            paddingRight: 40,
          }}
        >
          rodeos
        </span>
      </div>
    </div>
  );
};
