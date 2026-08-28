import { AbsoluteFill, Img, staticFile, interpolate } from "remotion";
import { COLORS } from "../theme";

/** Cuadrícula del póster, dibujada en SVG para poder animarla. */
const Grid: React.FC<{ cell: number; offset: number; opacity: number }> = ({
  cell,
  offset,
  opacity,
}) => (
  <AbsoluteFill style={{ opacity }}>
    <svg width="100%" height="100%">
      <defs>
        <pattern
          id="cuadricula"
          width={cell}
          height={cell}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${offset} ${offset * 0.6})`}
        >
          <path
            d={`M ${cell} 0 L 0 0 0 ${cell}`}
            fill="none"
            stroke={COLORS.grid}
            strokeWidth={1.1}
          />
        </pattern>
        <pattern
          id="cuadriculaGruesa"
          width={cell * 5}
          height={cell * 5}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${offset} ${offset * 0.6})`}
        >
          <path
            d={`M ${cell * 5} 0 L 0 0 0 ${cell * 5}`}
            fill="none"
            stroke={COLORS.gridBold}
            strokeWidth={1.8}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cuadricula)" />
      <rect width="100%" height="100%" fill="url(#cuadriculaGruesa)" />
    </svg>
  </AbsoluteFill>
);

/**
 * Fondo de papel cuadriculado.
 * `warmth` 0→1 hace que el papel pase de frío/apagado (estrofa triste)
 * a cálido y luminoso (estribillo).
 */
export const Paper: React.FC<{
  warmth: number;
  gridOffset: number;
  scale: number;
}> = ({ warmth, gridOffset, scale }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper, overflow: "hidden" }}>
      <AbsoluteFill style={{ scale, transformOrigin: "50% 50%" }}>
        {/* Lavado de color: azul frío -> crema cálida */}
        <AbsoluteFill style={{ backgroundColor: COLORS.paper }} />
        {/* Papel frío (estrofas) */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(125% 95% at 50% 45%, #F6FAFF 0%, ${COLORS.paper} 55%, ${COLORS.paperDeep} 100%)`,
            opacity: 1 - warmth,
          }}
        />
        {/* Papel cálido y luminoso (estribillo) */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(120% 95% at 50% 48%, #FFFCF2 0%, #FDF5E2 55%, #F0E4C4 100%)`,
            opacity: warmth,
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(58% 52% at 50% 50%, ${COLORS.gold}3D 0%, transparent 72%)`,
            opacity: warmth,
          }}
        />
        <Grid
          cell={44}
          offset={gridOffset}
          opacity={interpolate(warmth, [0, 1], [0.85, 0.68])}
        />
        {/* Textura real del papel del póster */}
        <Img
          src={staticFile("paper.jpg")}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            mixBlendMode: "multiply",
            opacity: 0.55,
          }}
        />
        {/* Calidez encima */}
        <AbsoluteFill
          style={{
            backgroundColor: COLORS.gold,
            mixBlendMode: "soft-light",
            opacity: warmth * 0.3,
          }}
        />
      </AbsoluteFill>
      {/* Viñeta */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(105% 75% at 50% 50%, rgba(0,0,0,0) 45%, rgba(1,68,107,0.22) 100%)",
          opacity: interpolate(warmth, [0, 1], [1, 0.45]),
        }}
      />
    </AbsoluteFill>
  );
};
