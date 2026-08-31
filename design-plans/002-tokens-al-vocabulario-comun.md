# 002 · Tokens al vocabulario común, con los nombres en español como alias

**Superficie:** global · **Riesgo:** medio · **Depende de:** nada

## Contexto

Los tokens de esta app están en español —`--color-lienzo`, `--color-lienzo-alto`,
`--color-tinta`, `--color-tinta-suave`, `--color-borde`, `--color-acento`,
`--color-acento-alto`, `--color-sobre-acento`, `--color-aviso`, `--radius-tarjeta`— y las
otras tres los tienen con los nombres semánticos en inglés
(`background`, `foreground`, `primary`, `border`, `muted`…).

Los nombres de aquí son buenos y están bien documentados. El problema no es la calidad: es
que **un componente no se puede mover entre repos sin traducirlo**, y `design.md` §6.1 dice
que copiar de otra app es la primera opción cuando dudas. También es la convención MCM
(código en inglés, base de datos en español) y lo que esperan los componentes de terceros.

## Qué hacer

1. En el bloque `@theme` de `app/assets/css/main.css`, **añadir** los nombres del sistema
   apuntando a los actuales, sin borrar nada todavía:
   ```css
   --color-background:       var(--color-lienzo);
   --color-card:             var(--color-lienzo-alto);
   --color-foreground:       var(--color-tinta);
   --color-muted-foreground: var(--color-tinta-suave);
   --color-border:           var(--color-borde);
   --color-primary:          var(--color-acento);
   --color-primary-hover:    var(--color-acento-alto);
   --color-primary-foreground: var(--color-sobre-acento);
   --color-destructive:      var(--color-aviso);
   ```
   Comprobar que los alias también funcionan dentro del media query oscuro y de
   `html[data-modo='b2b']`: al redefinir el token base, el alias tiene que seguirlo. Si
   Tailwind 4 resuelve el alias en el `@theme` y no en tiempo de uso, invierte la dirección —
   define el valor en el nombre en inglés y deja el español como alias.
2. Barrer los usos, fichero a fichero:
   ```bash
   grep -rn "lienzo\|tinta\|acento\|borde\|-aviso" app/ --include=*.vue
   ```
3. Cuando no quede ninguno, borrar los nombres en español, **salvo** los que no tienen
   equivalente y son propios de esta app: `--radius-tarjeta` se queda (o pasa a
   `--radius-xl`, ver plan `005`).
4. **`--color-aviso` merece pensarse**: hoy es un naranja que se usa para avisos, no un rojo
   de error. Si su significado es "atención", el nombre del sistema es `warn`, no
   `destructive`. Elige según el uso real, no según el color.
5. Actualizar los comentarios: los del bloque `@theme` explican decisiones reales (por qué el
   cromo es neutro, por qué `--color-sobre-acento` es un token y no un `text-white`) y **hay
   que conservarlos**, traducidos al nombre nuevo.

## Qué NO tocar

`LogoMCM.vue` y `favicon.svg`: sus colores están escritos a mano **a propósito**, porque el
acento cambia a azul en modo delegación y un logo que cambia de color deja de ser un logo.
Es la excepción documentada de `design.md` §3.1.

## Validación

`npm run build`. Recorrer catálogo, ficha de producto, carrito, checkout y las pantallas de
pago OK/KO, en los dos modos (`?modo=b2b` / particular) y en claro y oscuro. Comprobar
especialmente que el tinte azul de delegación sigue aplicándose: es el sitio donde un alias
mal resuelto se nota.
