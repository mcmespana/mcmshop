# Playbook: montar un lyric video con Remotion desde cero

Aprendizajes de haber montado *Samaritano*. Está escrito para **volver a
ejecutarlo en una sesión limpia y en otro repo**: la parte 1 es el prompt, la
parte 2 son las decisiones técnicas que costaron encontrar, y la parte 3 es tu
checklist.

---

## 1. Qué darle a Claude al abrir la sesión

Adjunta estos tres y di lo de abajo:

| Fichero | Para qué |
|---|---|
| El **audio** (mp3/wav) | Se analiza para sacar tempo y estructura |
| La **letra** en .txt, un verso por línea | Es el guion del vídeo |
| El **material gráfico** (PDF del cartel, o mejor: SVG/AI sueltos) | Paleta, tipografías y elementos |

Y un prompt tipo:

```
Quiero un lyric video con Remotion.

Estilo: [joven, colorido, artesanal, elegante...]
Temática: [de qué va la canción]
Formato: 1920x1080 a 30fps
Alcance: maqueta de [X] segundos primero, luego extendemos

Antes de escribir código:
1. Analiza el audio para sacar BPM y límites de sección (estrofa,
   estribillo...). No inventes los tiempos, mídelos.
2. Saca del PDF/AI los elementos gráficos, la paleta y las fuentes
   embebidas si las hay.
3. Cuéntame el concepto visual antes de lanzarte.

Instala las skills de Remotion primero:
npx -y skills@latest add remotion-dev/skills -g -y
```

Lo importante de ese prompt: **"no inventes los tiempos, mídelos"** y
**"cuéntame el concepto antes de lanzarte"**. Sin lo primero sale un vídeo
desincronizado; sin lo segundo sale bonito pero sin idea detrás.

---

## 2. Lo que costó descubrir

### 2.1 Un PDF de cartel es una mina de assets

Casi nunca hace falta redibujar nada. De un PDF de InDesign/Illustrator salen:

```python
import pymupdf, io
from PIL import Image
d = pymupdf.open("cartel.pdf")

# Imágenes CON su transparencia (el smask va aparte, hay que componerlo)
for im in d[0].get_images(full=True):
    base = d.extract_image(im[0])
    img = Image.open(io.BytesIO(base["image"])).convert("RGB")
    if im[1]:  # im[1] = xref del smask (canal alfa)
        m = d.extract_image(im[1])
        img.putalpha(Image.open(io.BytesIO(m["image"])).convert("L").resize(img.size))
    img.save(f"fig/{im[0]}.png")

# Fuentes embebidas
for f in d[0].get_fonts(full=True):
    name, ext, _, data = d.extract_font(f[0])
    open(f"{name.split('+')[-1]}.{ext}", "wb").write(data)
```

Dos avisos que cuestan tiempo si no los sabes:

- `pymupdf.Pixmap.save()` **peta** con imágenes RGB+alfa
  (*"pixmap must be grayscale or rgb"*). Componer el alfa con **PIL**, no con
  pymupdf.
- Las fuentes embebidas van **subsetadas**: sólo traen los glifos que el
  cartel usa. La de *Samaritano* sólo tenía `s,i,n` y `d,e,o,r,s` — vale
  para el lockup del lema y para nada más. Compruébalo antes de contar con ella:

  ```python
  from fontTools.ttLib import TTFont
  print(''.join(chr(c) for c in sorted(TTFont("fuente.ttf").getBestCmap())))
  ```

Recorta cada figura por su bounding box de alfa (`img.split()[3].getbbox()`)
para poder colocarlas por su centro sin márgenes fantasma.

### 2.2 Medir el audio en vez de adivinar

Sin ffmpeg, con `soundfile` + `numpy` basta:

- **Tempo**: autocorrelación del flujo espectral (diferencia positiva del
  espectro entre frames). Dio 100,4 BPM.
- **Secciones**: energía por bandas, segundo a segundo. El corte se ve solo —
  en *Samaritano*, la banda de graves está a **0 entre los segundos 13 y 26** y
  salta en el 27: eso es la estrofa 1 a piano solo y la entrada de la banda.
  Ese dato es más fiable que cualquier detección de voz.
- **Frases vocales**: energía de la banda 250–4000 Hz del canal *mid*
  (`(L+R)/2`) menos el *side* (`(L−R)/2`), que quita instrumentos abiertos en
  estéreo. Luego agrupar por silencios.

**Lo que se puede medir bien:** tempo y límites de sección. Son sólidos.
**Lo que no:** el ataque exacto de cada verso cuando hay banda tocando encima.
Ahí, repartir por sílabas dentro de la sección y ajustar a mano.

Un truco que salvó el estribillo: los ataques detectados salían separados
2,57 / 2,10 / 2,58 / 2,47 / 2,39 s… y el compás mide 2,39 s. **Un verso por
compás.** Cuadrando a la rejilla del compás en vez de a la detección, queda
clavado.

### 2.3 Fuentes locales, y el `sideEffects` que te la lía

Descargar los woff2 a `public/` en vez de tirar de Google Fonts en runtime:
el render no depende de la red y es reproducible.

```ts
import { loadFont } from "@remotion/fonts";
await loadFont({ family: "Fredoka", url: staticFile("fonts/Fredoka-700.woff2"), weight: "700" });
```

**La trampa:** el `package.json` que genera `create-video` trae

```json
"sideEffects": ["*.css"]
```

que le dice al bundler *"sólo los .css tienen efectos secundarios"*. Un
`import "./fonts"` suelto **se elimina como código muerto** y el vídeo
renderiza con la fuente de fallback sin avisar de nada. Arreglo:

```json
"sideEffects": ["*.css", "./src/fonts.ts"]
```

Si las tipografías salen "raras" pero no hay ningún error, es esto.

### 2.4 El pulso al ritmo: cómo NO hacerlo

Primera versión, un diente de sierra:

```ts
return Math.max(0, 1 - frac / decay);   // ❌ salta de 0 a 1 en UN frame
```

Se ve como un tirón, no como música: a 30 fps eso es un salto del 100% del
valor entre dos frames consecutivos. Y estaba aplicado al frame entero **y**
al texto, así que toda la imagen daba el respingo cada 0,6 s.

Las tres reglas:

1. **Envolvente continua.** Que salga de 0 y vuelva a 0 con pendiente cero:

   ```ts
   const smoothstep = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
   const envelope = (frac: number, attack: number, decay: number) =>
     frac < attack          ? smoothstep(frac / attack)
   : frac < attack + decay  ? 1 - smoothstep((frac - attack) / decay)
   : 0;
   ```

   Con `attack = 0,26` de negra (≈5 frames a 30 fps) el salto máximo por frame
   baja de 1,00 a 0,32.

2. **Nunca pulses el frame entero ni el texto.** Escalar toda la imagen en
   cada negra es la marca de "hecho con prisa". El pulso va en elementos
   sueltos, donde se lee como que respiran.

3. **Amplitudes bajas.** 3% en un elemento es un montón. El movimiento
   continuo (flotado con seno, deriva lenta de cámara) es lo que da vida;
   el pulso sólo la subraya.

Regla de bolsillo: **si un valor cambia más de ~1% por frame y no es una
entrada o un corte a propósito, se va a ver como un tirón.**

### 2.5 Un solo mando para cada idea

Lo que mejor funcionó del código: cada idea del vídeo es **un número entre 0 y
1** definido en un solo sitio, y los componentes lo consumen.

```ts
const tangle = kf(t, [48.75, 56.5, 58.9, 59.7], [1, 0.92, 0.85, 0.04]);
// 1 = el hilo va lleno de bucles · 0 = recto
```

El hilo no son dos dibujos con una transición: es **una fórmula paramétrica**
con un mando que la aplana. Por eso el gesto se siente físico. Lo mismo con
`warmth` (papel frío→cálido), `camera`, `glow`.

Beneficio real: para cambiar la sensación del vídeo se tocan cinco arrays al
principio del fichero, sin entrar en ningún componente.

### 2.6 Colisiones de layout

Con figuras y texto en la misma pantalla, lo que evitó pelearse frame a frame:
**reservar bandas**. Los hilos viven en `baseY` 0,17 / 0,79 / 0,93 — nunca
entre 0,35 y 0,65, que es donde va la letra. Se decide una vez y se acabó el
problema.

### 2.7 Render

- `Config.setVideoImageFormat("jpeg")` viene por defecto. Con degradados
  suaves **salen bandas** → ponerlo a `"png"` para el máster.
- `--crf`: 18 por defecto, 16 para máster, 26 para mandar por chat.
- `--scale=2` da 4K desde una composición de 1080 sin tocar código. Ojo: los
  PNG tienen que tener resolución de sobra o se nota el reescalado.
- `--frames=1770-2100` renderiza sólo un trozo. **Imprescindible** para
  iterar: 10 segundos en vez de 82.
- `npx remotion still <Comp> out.png --frame=N --scale=0.5` para revisar un
  frame suelto en segundos.

---

## 3. Tu checklist

### Antes de empezar
- [ ] Audio, letra (un verso por línea) y material gráfico a mano
- [ ] Los gráficos **en vectorial** si puedes (SVG/AI). Si no, PNG con alfa lo
      más grandes posible
- [ ] ¿Tienes las fuentes de la marca completas? Ahorra depender de las
      subsetadas del PDF
- [ ] Decidido el formato (16:9 para YouTube, 9:16 para redes, o los dos)

### Durante
- [ ] Que mida BPM y secciones **antes** de escribir código, y que te diga los
      números
- [ ] Que te cuente el concepto visual antes de lanzarse
- [ ] Empezar por una **maqueta corta** (1-1,5 min) con un momento fuerte
      dentro, no por la canción entera
- [ ] Pedir stills de control cada poco, no esperar al render completo

### Antes de dar por bueno un render
- [ ] Abrir el Studio y ver el vídeo **con audio** de principio a fin
- [ ] Buscar tirones: ¿algo cambia de tamaño a saltos?
- [ ] ¿La letra entra antes o después de que se cante? (frame a frame con la
      rueda del ratón)
- [ ] ¿Se cruza algo por encima del texto?
- [ ] Márgenes: nada importante a menos de 80 px de los bordes
- [ ] `setVideoImageFormat("png")` para el máster
- [ ] Verlo en el móvil, que es donde lo va a ver la gente

### Para la siguiente vuelta
- [ ] Timing fino con SRT (ver abajo)
- [ ] Versión vertical 9:16
- [ ] 4K con `--scale=2` si los assets dan
- [ ] Reacción real al audio con `visualizeAudio()` de `@remotion/media-utils`

---

## 4. Cómo dejar la letra perfecta

Los tiempos viven en `src/data/lyrics.ts`, en **segundos del audio original**:

```ts
{ start: 26.65, end: 28.40, text: "Y no pasaste.", accent: ["no", "pasaste."] },
```

### Opción A — a mano, en el Studio

```bash
npm run dev
```

Te pones en el segundo, ves que el verso entra tarde, cambias el número,
guardas. Recarga en caliente sin perder la posición. Para 30 versos son 20
minutos y queda perfecto.

### Opción B — desde un .srt o .lrc

```bash
npm run subs -- letra.srt
```

Empareja cada línea **por texto** (ignorando mayúsculas, tildes y puntuación),
reescribe sólo `start` y `end`, y **respeta los `accent`**. Avisa por consola
de las líneas que no encuentre.

Para que empareje todo, el texto del SRT tiene que coincidir con el de
`lyrics.ts`. Si en el SRT pone "y no pasaste" y en el código "Y no pasaste.",
empareja igual — la comparación es laxa. Si parte un verso en dos subtítulos,
no.

**De dónde sacar el SRT:** cualquier herramienta de subtitulado automático, o
a mano en un editor de subtítulos. También `@remotion/install-whisper-cpp`
(modelo `medium` o `large-v3` con `language: "es"` — el `medium.en` de los
ejemplos es sólo inglés) — con música de fondo se equivoca, así que conviene
corregir el texto contra la letra real y quedarse sólo con los tiempos.

### El `accent`

Es la lista de palabras de ese verso que se pintan distinto: cambian a la
tipografía **manuscrita** (Caveat), suben un 34% de tamaño y cogen el color de
acento de la sección (cian en las estrofas, dorado en el estribillo).

```ts
{ start: 68.54, end: 70.85, text: "Solo no estarás,", accent: ["Solo"] },
```

Reglas para que funcione:

- La palabra tiene que ir **exactamente** como aparece en `text`,
  **con su puntuación**: si en el texto pone `pasaste.` el accent es
  `"pasaste."`, no `"pasaste"`.
- Mayúsculas da igual, se compara en minúsculas.
- Una o dos por verso como mucho. Si acentúas todo, no acentúas nada.
- Elige la palabra que **carga el significado**: `no` en "Y **no** pasaste",
  `Solo` en "**Solo** no estarás". Esas dos son la canción entera.

Dónde está implementado, por si quieres cambiar el efecto:
`src/components/LyricLine.tsx`, la constante `VARIANTS` (tamaño, color y
color de acento de cada sección) y el `isAccent` de dentro del `map`.
