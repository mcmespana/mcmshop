import { Img, interpolate, Easing, spring, useVideoConfig } from "remotion";
import { fig } from "../theme";

/**
 * Un monigote del póster. Entra con muelle, flota suavemente
 * y puede aparecer "apagado" (gris) o a todo color.
 */
export const Doodle: React.FC<{
  name: string;
  /** Posición del centro, en % del lienzo. */
  x: number;
  y: number;
  /** Altura en px (1080 = pantalla completa). */
  size: number;
  /** Tiempo actual en segundos. */
  time: number;
  /** Segundo en el que entra. */
  appearAt: number;
  /** Segundo en el que se va (opcional). */
  hideAt?: number;
  rotate?: number;
  flip?: boolean;
  opacity?: number;
  /** 0 = color normal, 1 = totalmente desaturado y pálido. */
  faded?: number;
  /** Amplitud del flotado, en px. */
  float?: number;
  floatSpeed?: number;
  seed?: number;
  /** Escala extra (p. ej. pulso a negra). */
  pulse?: number;
  blur?: number;
}> = ({
  name,
  x,
  y,
  size,
  time,
  appearAt,
  hideAt,
  rotate = 0,
  flip = false,
  opacity = 1,
  faded = 0,
  float = 10,
  floatSpeed = 1,
  seed = 0,
  pulse = 0,
  blur = 0,
}) => {
  const { fps } = useVideoConfig();
  const s = spring({
    frame: (time - appearAt) * fps,
    fps,
    config: { damping: 13, mass: 0.7, stiffness: 110 },
    durationInFrames: Math.round(fps * 0.8),
  });
  const gone =
    hideAt === undefined
      ? 1
      : interpolate(time, [hideAt, hideAt + 0.7], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.in(Easing.quad),
        });
  const bob = Math.sin(time * floatSpeed * 1.3 + seed) * float;
  const tilt = Math.sin(time * floatSpeed * 0.7 + seed * 1.7) * 1.8;

  return (
    <Img
      src={fig(name)}
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        height: size,
        width: "auto",
        opacity: opacity * s * gone,
        translate: `-50% calc(-50% + ${bob.toFixed(2)}px)`,
        rotate: `${rotate + tilt}deg`,
        scale: (interpolate(s, [0, 1], [0.72, 1]) * (1 + pulse * 0.03)).toFixed(4),
        filter: `saturate(${1 - faded * 0.9}) brightness(${1 + faded * 0.06}) blur(${blur}px)`,
        transform: flip ? "scaleX(-1)" : undefined,
        pointerEvents: "none",
      }}
    />
  );
};
