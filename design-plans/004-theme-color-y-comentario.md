# 004 · `theme-color`: el comentario dice "marino" y el color es verde

**Superficie:** global · **Riesgo:** ninguno · **Depende de:** nada

## Contexto

En `nuxt.config.ts`:

```ts
// Color de la barra del navegador en móvil: el marino de la marca.
{ name: 'theme-color', content: '#13684b' },
```

`#13684b` es el **verde** de la Tienda (el mismo del logo y de `--color-acento`), no un
marino. El comentario es de otra época y confunde: alguien lo leerá y cambiará el color para
"arreglarlo".

Además: solo hay **un** `theme-color`, así que en modo oscuro la barra del navegador sale
verde brillante sobre una app oscura; y en modo delegación el acento es azul, pero la barra
sigue verde.

## Qué hacer

1. Corregir el comentario: es el verde de la Tienda, el mismo `#13684b` del logo y de
   `--color-acento` en claro. Decir eso, y que se mantiene fijo aunque el acento cambie a
   azul en modo delegación (misma razón que el logo, `design.md` §3.1).
2. Declarar **dos** `theme-color` con `media`:
   ```ts
   { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#13684b' },
   { name: 'theme-color', media: '(prefers-color-scheme: dark)',  content: '<--color-lienzo oscuro en hex>' },
   ```
   El de oscuro es el **fondo** de la app, no el acento: la barra imita la página, no la marca.
3. Si existe un manifest de PWA con `theme_color`, que diga lo mismo. (Hoy hay iconos
   `icono-192.png` / `icono-512.png` pero no se ve manifest: si lo añades algún día, acuérdate.)

## Validación

`npm run build`. Abrir en Chrome Android (o simular) en los dos temas y comprobar el color de
la barra. Comprobar que en modo delegación la barra **no** cambia (es lo correcto).
