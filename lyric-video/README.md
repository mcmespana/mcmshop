# Samaritano — lyric video

Lyric video en [Remotion](https://remotion.dev) para la canción lema
**"Samaritano"** (Fundación Educativa Consolación, lema *SIN RODEOS* 26·27).

Este repo contiene la **maqueta del primer minuto largo** (0:00 → 1:22): intro,
estrofa 1, estrofa 2, pre-estribillo, estribillo completo y cierre.

## El enfoque

La idea visual sale directamente del póster: **el hilo amarillo es el camino**.

- Durante la **intro y las estrofas** el hilo va lleno de vueltas y bucles: son
  los *rodeos*, el dar la vuelta para no ver al herido.
- Al entrar el **estribillo** ("Ven, amigo, ven") el hilo **se estira de golpe**
  y cruza la pantalla recto. Ese es el momento *sin rodeos*, y va sincronizado
  con la entrada de la sección (58,9 s).

Alrededor de eso:

| | |
|---|---|
| **Papel** | La cuadrícula y la textura del propio póster. Pasa de azul frío y apagado (estrofa 1, soledad) a crema cálido y luminoso (estribillo). |
| **Monigotes** | Los del póster, extraídos del PDF con su transparencia. Van contando la parábola: el que está solo → el que yace en el camino → el que se acerca → el que carga con él → los dos que se levantan. |
| **Letra** | Aparece **palabra a palabra**, con muelle y desenfoque, y la palabra que se está cantando se resalta. En el estribillo cada verso lleva su trazo de rotulador amarillo que se pinta de izquierda a derecha. |
| **Ritmo** | Todo pulsa a **100,4 BPM** (el tempo medido del premaster): el zoom, los monigotes y el trazo de rotulador. |
| **Tipografía** | `LavaPro-Rough` y `JenthillLight` — las fuentes **reales** del cartel, extraídas del PDF — para el lockup "sin rodeos". Fredoka para la letra y Caveat para las palabras destacadas. |

## Sincronización

Los tiempos están en **`src/data/lyrics.ts`**, en segundos del audio original.

Se han sacado analizando el propio premaster (flujo espectral + energía de banda
vocal): los **límites de sección y el tempo están medidos** y son fiables; los
tiempos verso a verso son un primer pase (ataques vocales detectados + reparto
por sílabas) y puede que alguna línea pida ±0,2 s.

Estructura detectada:

| Sección | Entra en |
|---|---|
| Intro instrumental | 0,0 s |
| Estrofa 1 (sólo piano) | 12,91 s |
| Estrofa 2 (entra la banda) | 28,66 s |
| Pre-estribillo | 48,80 s |
| Estribillo (1 compás por verso) | 58,90 s |
| Estribillo *bis* | 77,92 s |

### Afinar los tiempos

**Opción A — a mano.** Abre el Studio, ve al momento exacto y cambia el número
en `src/data/lyrics.ts`. Se recarga en caliente.

**Opción B — con un fichero de subtítulos.** Si preparas un `.srt` o `.lrc`:

```bash
npm run subs -- letra.srt
```

Empareja cada línea por texto y reescribe sólo los tiempos (respeta los
`accent`). Avisa por consola de las que no encuentre.

## Uso

```bash
npm install
npm run dev      # Remotion Studio
npm run render   # -> out/samaritano.mp4
```

## Estructura

```
src/
  data/lyrics.ts        Mapa de sincronización (aquí se toca todo lo de timing)
  theme.ts              Paleta, fuentes, BPM y helpers de pulso
  fonts.ts              Carga de fuentes locales (nada se baja en render)
  LyricVideo.tsx        Montaje: curvas maestras, coreografía y capas
  components/
    Paper.tsx           Papel cuadriculado + textura + calidez
    Thread.tsx          El hilo amarillo (paramétrico: `tangle` 1 → 0)
    Doodle.tsx          Monigote con entrada de muelle y flotado
    LyricLine.tsx       Letra palabra a palabra con resaltado
    Lockup.tsx          "sin rodeos" con las fuentes del cartel
public/
  samaritano.mp3        Premaster completo (4:23)
  figures/              Monigotes extraídos del póster (PNG con alfa)
  fonts/                Fuentes locales
  paper.jpg             Textura de papel del póster
```

## Extender al resto de la canción

La canción entera dura **4:23**. Para seguir montando:

1. Añade las secciones que faltan a `SECTIONS` en `src/data/lyrics.ts`.
2. Sube `CUT_END` en ese mismo fichero (la duración de la composición sale de
   ahí automáticamente).
3. Añade la coreografía de monigotes de esas secciones en `LyricVideo.tsx`.

Las curvas maestras (`warmth`, `tangle`, `camera`, `glow`) son listas de
keyframes en segundos al principio de `LyricVideo.tsx`: para una sección nueva
basta con añadirles un punto.

## Créditos de los materiales

Los monigotes, la textura de papel, el logo y las fuentes `LavaPro-Rough` /
`JenthillLight` se han extraído del PDF del póster *SIN RODEOS* de la Fundación
Educativa Consolación. Son material de la propia campaña.
