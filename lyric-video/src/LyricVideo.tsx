import {
  AbsoluteFill,
  Img,
  interpolate,
  Easing,

  staticFile,
  useCurrentFrame,
  useVideoConfig,
  random,
} from "remotion";
import { Audio } from "@remotion/media";
import { COLORS, FONTS, beatPulse, barPulse, fig } from "./theme";
import { ALL_LINES, CUT_START, CUT_END, type Line } from "./data/lyrics";
import { Paper } from "./components/Paper";
import { Threads, THREADS } from "./components/Thread";
import { Doodle } from "./components/Doodle";
import { LyricLine, type Variant } from "./components/LyricLine";
import { Lockup } from "./components/Lockup";
import { fontsReady } from "./fonts";

// Evita que el bundler elimine la carga de fuentes.
if (!fontsReady) throw new Error("fonts");

const kf = (t: number, xs: number[], ys: number[], ease = Easing.bezier(0.4, 0, 0.2, 1)) =>
  interpolate(t, xs, ys, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

const activeLine = (t: number): Line | null => {
  for (const l of ALL_LINES) {
    if (t >= l.start - 0.3 && t < l.end + 0.5) return l;
  }
  return null;
};

const variantFor = (t: number): Variant =>
  t < 28.6 ? "soft" : t < 48.75 ? "bold" : t < 58.9 ? "rise" : "hero";

/** Confeti de destellos dorados para el estribillo. */
const Sparks: React.FC<{ time: number; amount: number }> = ({ time, amount }) => {
  if (amount <= 0) return null;
  return (
    <AbsoluteFill>
      {new Array(26).fill(0).map((_, i) => {
        const sx = random(`sx${i}`);
        const sy = random(`sy${i}`);
        const sp = 0.35 + random(`sp${i}`) * 0.5;
        const sz = 46 + random(`sz${i}`) * 120;
        const drift = ((time * sp * 60 + sy * 1400) % 1400) - 200;
        return (
          <Img
            key={i}
            src={fig("spark")}
            style={{
              position: "absolute",
              left: `${sx * 100}%`,
              top: 1180 - drift,
              width: sz,
              height: sz,
              opacity:
                amount *
                (0.3 + 0.4 * (0.5 + 0.5 * Math.sin(time * 1.7 + i))) *
                interpolate(drift, [-200, 100, 1000, 1400], [0, 1, 1, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              translate: "-50% -50%",
              mixBlendMode: "multiply",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const LyricVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = CUT_START + frame / fps;

  // ───────── Curvas maestras del vídeo ─────────
  // De papel frío y apagado a papel cálido y luminoso.
  const warmth = kf(t, [0, 6, 12.9, 28.6, 48.75, 58.4, 59.6, 76.8, 82], [0.2, 0.28, 0.04, 0.32, 0.55, 0.62, 1, 1, 0.75]);
  // "Rodeos" -> "sin rodeos": el hilo se estira de golpe al entrar el estribillo.
  const tangle = kf(t, [0, 12.9, 48.75, 56.5, 58.9, 59.7, 76.8, 78.5], [1, 1, 1, 0.92, 0.85, 0.04, 0.04, 0.5], Easing.bezier(0.85, 0, 0.15, 1));
  // El hilo se dibuja solo durante la intro.
  const draw = kf(t, [0.6, 4.6], [0, 1]);
  const phase = t * 0.32;
  const glow = kf(t, [56, 59.6, 76.8, 80], [0, 1, 1, 0.3]);
  // Zoom suave de cámara, se aleja un poco al llegar el estribillo.
  const camera = kf(t, [0, 12.9, 48.75, 58.9, 59.6, 76.8], [1.06, 1.02, 1.05, 1.11, 1.0, 1.03]);
  const gridOffset = kf(t, [0, 82], [0, -70]);

  const beat = beatPulse(t);
  const bar = barPulse(t);
  const line = activeLine(t);
  const variant = variantFor(t);
  const inChorus = t >= 58.9 && t < 77;

  // El ritmo NO se aplica al frame entero ni al texto: escalar toda la
  // imagen en cada negra se lee como un tirón, no como música. El pulso
  // vive sólo en los monigotes, donde se lee como que respiran.

  const fadeIn = kf(t, [0, 1.2], [0, 1]);
  const fadeOut = kf(t, [CUT_END - 1.6, CUT_END], [1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <Audio
        src={staticFile("samaritano.mp3")}
        trimBefore={Math.round(CUT_START * fps)}
        volume={(f) =>
          interpolate(
            CUT_START + f / fps,
            [CUT_START, CUT_START + 0.4, CUT_END - 4.5, CUT_END - 0.3],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )
        }
      />

      <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
        <AbsoluteFill style={{ scale: camera.toFixed(4), transformOrigin: "50% 50%" }}>
          <Paper warmth={warmth} gridOffset={gridOffset} scale={1} />

          {/* ── El hilo amarillo: el camino. Pasa por detrás de los monigotes, como en el póster. ── */}
          <Threads
            configs={THREADS}
            width={width}
            height={height}
            tangle={tangle}
            phase={phase}
            draw={draw}
            glow={glow}
          />

          {/* ── Monigotes: la historia visual detrás de la letra ── */}
          <AbsoluteFill>
            {/* Intro: el mundo lleno de gente que sufre y pasa de largo */}
            <Doodle name="question" x={12} y={26} size={230} time={t} appearAt={2.0} hideAt={11.6} faded={0.9} opacity={0.55} seed={1} />
            <Doodle name="group-push" x={80} y={22} size={200} time={t} appearAt={2.5} hideAt={11.6} faded={0.9} opacity={0.5} seed={2} />
            <Doodle name="walk" x={90} y={72} size={250} time={t} appearAt={3.0} hideAt={11.6} faded={0.9} opacity={0.5} seed={3} />
            <Doodle name="crowd-white" x={8} y={78} size={230} time={t} appearAt={3.4} hideAt={11.6} faded={0.9} opacity={0.5} seed={4} />

            {/* Estrofa 1 — soledad. Sólo sombras y grises. */}
            <Doodle name="sit-sad" x={80} y={58} size={520} time={t} appearAt={13.0} hideAt={22.0} faded={0.85} opacity={0.9} float={5} seed={5} />
            <Doodle name="shadow-fear" x={26} y={30} size={330} time={t} appearAt={16.4} hideAt={22.0} faded={0.9} opacity={0.5} float={7} seed={6} />
            <Doodle name="crowd-grey" x={79} y={57} size={540} time={t} appearAt={22.4} hideAt={28.5} faded={0.5} opacity={0.95} float={5} seed={7} />
            <Doodle name="grey-alone" x={22} y={80} size={200} time={t} appearAt={24.8} hideAt={28.5} faded={1} opacity={0.45} seed={8} />

            {/* Estrofa 2 — alguien se acerca, cura, carga con el peso. */}
            <Doodle name="lying" x={76} y={76} size={330} time={t} appearAt={28.8} hideAt={34.4} faded={0.6} opacity={0.95} float={4} seed={9} />
            <Doodle name="helping-hand" x={78} y={50} size={430} time={t} appearAt={34.7} hideAt={40.6} faded={0.35} opacity={1} float={7} seed={10} pulse={beat * 0.5} />
            <Doodle name="crawl-tear" x={22} y={72} size={300} time={t} appearAt={37.7} hideAt={44.1} faded={0.5} opacity={0.75} float={6} seed={11} />
            <Doodle name="carry" x={77} y={52} size={470} time={t} appearAt={44.4} hideAt={48.6} faded={0.15} opacity={1} float={9} seed={12} pulse={beat * 0.6} />

            {/* Pre-estribillo — la voz que llama a levantarse. */}
            <Doodle name="spark" x={79} y={46} size={620} time={t} appearAt={48.9} hideAt={58.4} opacity={kf(t, [48.9, 51, 57, 58.4], [0, 0.5, 0.75, 0]) } float={0} seed={13} pulse={bar} />
            <Doodle name="free" x={79} y={60} size={kf(t, [48.9, 58.4], [400, 500])} time={t} appearAt={49.0} hideAt={58.5} faded={0.15} opacity={0.95} float={8} seed={14} pulse={beat * 0.7} />

            {/* Estribillo — la mano tendida y el que vuelve a caminar. */}
            <Doodle name="helping-hand" x={17} y={74} size={400} time={t} appearAt={59.0} hideAt={76.9} faded={0} opacity={1} float={11} seed={15} pulse={beat} />
            <Doodle name="free" x={84} y={72} size={430} time={t} appearAt={59.3} hideAt={76.9} faded={0} opacity={1} float={12} seed={16} pulse={beat} />
            <Doodle name="run" x={91} y={26} size={220} time={t} appearAt={63.6} hideAt={76.9} faded={0.1} opacity={0.8} float={14} seed={17} pulse={beat * 0.6} />
            <Doodle name="crowd-white" x={9} y={24} size={210} time={t} appearAt={66.1} hideAt={76.9} faded={0.1} opacity={0.75} float={10} seed={18} pulse={beat * 0.6} />
          </AbsoluteFill>

          <Sparks time={t} amount={kf(t, [58.6, 60, 76.8, 78.4], [0, 1, 1, 0])} />
        </AbsoluteFill>

        {/* ── Capa de texto: siempre nítida, sin zoom ni pulso ── */}
        <AbsoluteFill>
          {/* Intro: lockup del lema */}
          {t < 12.6 ? (
            <AbsoluteFill
              style={{
                justifyContent: "center",
                alignItems: "center",
                opacity: kf(t, [4.4, 5.2, 11.2, 12.4], [0, 1, 1, 0]),
              }}
            >
              <Lockup time={t} appearAt={4.6} size={0.92} />
              <div
                style={{
                  marginTop: -30,
                  fontFamily: FONTS.body,
                  fontWeight: 600,
                  fontSize: 44,
                  letterSpacing: 12,
                  color: COLORS.cyan,
                  textTransform: "uppercase",
                  opacity: kf(t, [7.6, 8.6], [0, 1]),
                  translate: `0px ${kf(t, [7.6, 8.6], [26, 0]).toFixed(1)}px`,
                }}
              >
                Samaritano
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontFamily: FONTS.script,
                  fontWeight: 700,
                  fontSize: 46,
                  color: COLORS.blue,
                  opacity: kf(t, [8.4, 9.4], [0, 0.85]),
                }}
              >
                canción lema · Consolación 26·27
              </div>
            </AbsoluteFill>
          ) : null}

          {/* Letra sincronizada */}
          {line ? (
            <AbsoluteFill
              style={{
                justifyContent: "center",
                alignItems: inChorus ? "center" : "flex-start",
                paddingLeft: inChorus ? 110 : 150,
                paddingRight: inChorus ? 110 : 500,
              }}
            >
              <div
                style={{
                  position: "relative",
                  display: "inline-flex",
                  padding: inChorus ? "26px 60px" : "0",
                }}
              >
                {/* Trazo de rotulador: se pinta de izquierda a derecha en cada verso */}
                {inChorus ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 999,
                      background: `linear-gradient(100deg, ${COLORS.yellow}, ${COLORS.gold})`,
                      opacity: 0.44 + bar * 0.07,
                      rotate: "-1.2deg",
                      filter: "blur(1.5px)",
                      transformOrigin: "0% 50%",
                      scale: `${kf(t, [line.start, line.start + 0.32], [0, 1], Easing.bezier(0.2, 0.9, 0.2, 1)).toFixed(3)} 1`,
                    }}
                  />
                ) : null}
                {/* Subrayado a mano bajo la letra en estrofa 2 y pre-estribillo */}
                {!inChorus && t >= 28.6 ? (
                  <svg
                    width="100%"
                    height="26"
                    viewBox="0 0 600 26"
                    preserveAspectRatio="none"
                    style={{ position: "absolute", left: 0, bottom: -22, overflow: "visible" }}
                  >
                    <path
                      d="M4,16 C120,6 240,22 360,12 C450,5 530,16 596,10"
                      fill="none"
                      stroke={COLORS.yellow}
                      strokeWidth={9}
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={1 - kf(t, [line.start + 0.15, line.start + 0.75], [0, 1])}
                      opacity={0.9}
                    />
                  </svg>
                ) : null}
                <LyricLine line={line} time={t} variant={variant} />
              </div>
            </AbsoluteFill>
          ) : null}

          {/* Cierre: la frase del evangelio + logo */}
          {t > 76.6 ? (
            <AbsoluteFill
              style={{
                justifyContent: "center",
                alignItems: "center",
                gap: 40,
                opacity: kf(t, [77.0, 78.2], [0, 1]),
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.script,
                  fontWeight: 700,
                  fontSize: 132,
                  color: COLORS.blue,
                  textAlign: "center",
                  maxWidth: 1500,
                  lineHeight: 1.05,
                  translate: `0px ${kf(t, [77.0, 78.4], [40, 0]).toFixed(1)}px`,
                  textShadow: `6px 8px 0 ${COLORS.cyanSoft}66`,
                }}
              >
                Ahora ve y haz tú lo mismo…
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 70,
                  opacity: kf(t, [78.4, 79.6], [0, 1]),
                  translate: `0px ${kf(t, [78.4, 79.6], [22, 0]).toFixed(1)}px`,
                }}
              >
                <Img src={fig("logo")} style={{ width: 380 }} />
                <div style={{ width: 3, height: 96, backgroundColor: COLORS.cyan, opacity: 0.5 }} />
                <div style={{ marginTop: -26 }}>
                  <Lockup time={t} appearAt={78.4} size={0.26} />
                </div>
              </div>
            </AbsoluteFill>
          ) : null}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* Fogonazo en la entrada del estribillo: el hilo se estira "sin rodeos" */}
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.white,
          opacity: kf(t, [58.78, 58.95, 59.75], [0, 0.72, 0]),
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* Grano de papel, encima de todo */}
      <AbsoluteFill
        style={{
          opacity: 0.05,
          mixBlendMode: "multiply",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </AbsoluteFill>
  );
};
