#!/usr/bin/env node
/**
 * Importa un .srt o un .lrc y reescribe los tiempos de src/data/lyrics.ts.
 *
 *   npm run subs -- letra.srt
 *
 * Empareja cada línea del fichero con la línea de `lyrics.ts` que tenga el
 * mismo texto (ignorando mayúsculas, tildes y puntuación). Las que no
 * encuentre las deja como están y avisa por consola.
 */
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Uso: npm run subs -- <fichero.srt|fichero.lrc>");
  process.exit(1);
}

const norm = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const raw = readFileSync(file, "utf8");
const cues = [];

if (/^\s*\[\d+:\d+/m.test(raw)) {
  // LRC: [mm:ss.cc] texto
  const rows = [];
  for (const m of raw.matchAll(/\[(\d+):(\d+(?:[.:]\d+)?)\]\s*(.*)/g)) {
    const t = Number(m[1]) * 60 + Number(m[2].replace(":", "."));
    if (m[3].trim()) rows.push({ start: t, text: m[3].trim() });
  }
  rows.forEach((r, i) => {
    cues.push({ ...r, end: rows[i + 1] ? rows[i + 1].start - 0.05 : r.start + 3 });
  });
} else {
  // SRT / VTT
  const T = (s) => {
    const [h, m, rest] = s.split(":");
    return Number(h) * 3600 + Number(m) * 60 + Number(rest.replace(",", "."));
  };
  for (const m of raw.matchAll(
    /(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*\n([\s\S]*?)(?=\n\s*\n|\n*$)/g,
  )) {
    const text = m[3].replace(/<[^>]+>/g, "").split("\n").join(" ").trim();
    if (text) cues.push({ start: T(m[1]), end: T(m[2]), text });
  }
}

if (!cues.length) {
  console.error(`No se ha encontrado ninguna línea con tiempos en ${file}.`);
  process.exit(1);
}

const path = new URL("../src/data/lyrics.ts", import.meta.url);
let src = readFileSync(path, "utf8");

const used = new Set();
let hits = 0;
const misses = [];

src = src.replace(
  /\{ start: [\d.]+, end: [\d.]+, text: "((?:[^"\\]|\\.)*)"((?:, accent: \[[^\]]*\])?) \}/g,
  (whole, text, accent) => {
    const target = norm(text);
    const idx = cues.findIndex((c, i) => !used.has(i) && norm(c.text) === target);
    if (idx === -1) {
      misses.push(text);
      return whole;
    }
    used.add(idx);
    hits++;
    const c = cues[idx];
    return `{ start: ${c.start.toFixed(2)}, end: ${c.end.toFixed(2)}, text: "${text}"${accent} }`;
  },
);

writeFileSync(path, src);
console.log(`✓ ${hits} línea(s) sincronizada(s) desde ${file}`);
if (misses.length) {
  console.log(`⚠ Sin coincidencia (se dejan como estaban):`);
  for (const m of misses) console.log(`   · ${m}`);
}
