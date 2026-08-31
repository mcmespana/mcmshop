# 001 · `--font-sans` declara `'Inter var'` y no se carga ninguna fuente

**Superficie:** global · **Riesgo:** bajo · **Depende de:** nada

## Contexto

`app/assets/css/main.css` declara:

```css
--font-sans: 'Inter var', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
```

**Inter no se carga en ningún sitio**: no hay `@fontsource`, ni `@import`, ni `<link>` en
`nuxt.config.ts` ni en `app.vue`. Comprobado con `grep -rn "font\|Inter" nuxt.config.ts app/`.
Lo que se ve hoy es `ui-sans-serif` / `system-ui`, es decir la fuente del sistema.

No es un fallo visual —la tienda se ve bien— pero es una declaración que miente, y el
siguiente que la lea creerá que la app usa Inter.

## Qué hacer

Elegir una de las dos, con la persona responsable si hace falta:

**Opción A — autoalojar la tipografía del sistema MCM** (`design.md` §3.2, lo coherente con
las otras tres apps a medio plazo):

1. `npm i @fontsource-variable/figtree`
2. `@import '@fontsource-variable/figtree';` al principio de `main.css`
3. `--font-sans: 'Figtree Variable', ui-sans-serif, system-ui, sans-serif;`

Es un cambio visible: pídelo confirmado antes.

**Opción B — asumir la del sistema a conciencia** (defendible, y hoy es lo que pasa de
hecho): quitar `'Inter var'` de la declaración y dejar
`--font-sans: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;` con un
comentario de dos líneas explicando que es deliberado — la tienda es la app más ligera y una
fuente menos son 40–80 KB menos en el camino a la caja.

En cualquiera de los dos casos, **deja escrito por qué** en el comentario del bloque `@theme`.

## Validación

`npm run build`. Abrir el catálogo y el checkout y comprobar en las herramientas de
desarrollo qué familia se está renderizando de verdad (`Computed → font-family`), y que
coincide con lo declarado. Si has elegido A: comprobar que no hay FOUT y que las peticiones
de fuente salen del propio dominio.
