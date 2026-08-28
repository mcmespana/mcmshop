import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const f = (n: string) => staticFile(`fonts/${n}`);

/**
 * Fuentes locales: nada se descarga en tiempo de render.
 * LavaPro-Rough y JenthillLight son las fuentes reales del póster,
 * extraídas del PDF; sólo contienen los glifos de "sin rodeos",
 * así que se usan exclusivamente en el lockup del lema.
 */
export const fontsReady = Promise.all([
  loadFont({ family: "Fredoka", url: f("Fredoka-600.woff2"), weight: "600" }),
  loadFont({ family: "Fredoka", url: f("Fredoka-700.woff2"), weight: "700" }),
  loadFont({ family: "Caveat", url: f("Caveat-700.woff2"), weight: "700" }),
  loadFont({ family: "Nunito", url: f("Nunito-800.woff2"), weight: "800" }),
  loadFont({ family: "LavaPro-Rough", url: f("LavaPro-Rough.ttf"), format: "truetype" }),
  loadFont({ family: "JenthillLight", url: f("JenthillLight.ttf"), format: "truetype" }),
]);
