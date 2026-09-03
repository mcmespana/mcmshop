# 003 · Conmutador de tema (claro / oscuro / sistema)

**Superficie:** global · **Riesgo:** bajo · **Depende de:** `002` (recomendado)

## Contexto

Esta es la única de las cuatro apps donde el modo oscuro va **solo** por
`@media (prefers-color-scheme: dark)`. Bank, Recursos y Votaciones tienen conmutador con las
tres opciones (claro / oscuro / sistema) y guardan la preferencia.

Consecuencia práctica: quien tiene el móvil en oscuro por la noche no puede poner la tienda
en claro para mirar bien el color de una camiseta, que es exactamente lo que se hace en una
tienda de ropa.

## Qué hacer

1. Pasar el modo oscuro de media query a **clase**: `html.dark { … }`, manteniendo el media
   query como valor por defecto para "sistema".
   Patrón: `:root { …claro… }`, `@media (prefers-color-scheme: dark) { :root:not(.light) { …oscuro… } }`,
   `:root.dark { …oscuro… }`. Así la clase gana en los dos sentidos.
   **Ojo con Tailwind 4:** hay que declarar el variant, `@custom-variant dark (&:is(.dark *));`
   como hace `mcmrecursos/app/src/app.css`.
2. Un composable `useTema.ts` junto a `useModo.ts`, con `'claro' | 'oscuro' | 'sistema'`,
   persistido en `localStorage`.
3. **Aplicar la clase antes del primer pintado**, con un script inline en `app.vue` o en
   `nuxt.config.ts` (`app.head.script`). Si se aplica después de la hidratación, la página
   parpadea en blanco al cargar en oscuro, que es peor que no tener conmutador.
4. Control en la cabecera (`app/layouts/default.vue`), junto al indicador de modo. Icono
   Lucide con `aria-label`, tres estados.
5. `theme-color` debe seguir al tema elegido, no solo al del sistema (ver plan `004`).

## Qué NO tocar

El tinte B2B/B2C (`html[data-modo]`) es **otra** dimensión y se combina con el tema: hay que
comprobar las cuatro combinaciones, no dos.

## Validación

`npm run build`. Las cuatro combinaciones (claro/oscuro × particular/delegación) en catálogo,
carrito y checkout. Recargar con oscuro forzado y comprobar que **no hay parpadeo blanco**.
Cerrar y reabrir el navegador y comprobar que la preferencia se recuerda.
