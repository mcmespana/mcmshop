# 005 · Reducir a la escala de radios del sistema

**Superficie:** global · **Riesgo:** bajo · **Depende de:** nada

## Contexto

Recuento actual en `app/**/*.vue`: 44 `rounded-lg`, 19 `rounded-tarjeta` (0,875 rem = 14 px),
13 `rounded-full`, 2 `rounded-md`, 1 `rounded-t`.

No está mal —es de lejos la app más consistente de las cuatro— pero conviven dos escalas: la
de Tailwind por defecto y `--radius-tarjeta`. `design.md` §3.3 fija una sola:
base 10 px, `sm` 6, `md` 8, `lg` 10, `xl` 14, y `rounded-full` solo en avatares, pills y
puntos de estado.

## Qué hacer

1. En el bloque `@theme` de `main.css`, declarar la escala del sistema:
   ```css
   --radius:    0.625rem;
   --radius-sm: calc(var(--radius) - 4px);
   --radius-md: calc(var(--radius) - 2px);
   --radius-lg: var(--radius);
   --radius-xl: calc(var(--radius) + 4px);
   ```
   `--radius-tarjeta` (0,875 rem = 14 px) es exactamente `--radius-xl`: sustituirlo por él y
   borrarlo, o dejarlo un tiempo como alias.
2. Barrer:
   ```bash
   grep -rn "rounded-tarjeta\|rounded-md\|rounded-t\b" app --include=*.vue
   ```
   - Tarjeta de producto, panel del carrito, tique → `rounded-xl`
   - Botones, inputs, chips → `rounded-lg` (y `rounded-md` en los `sm`)
   - `rounded-t` en el papel del tique: es intencionado (el tique tiene esquinas rectas
     abajo), déjalo pero con el token nuevo.
3. Comprobar que `rounded-full` queda solo en el contador del carrito, avatares y pills.

## Qué NO tocar

`.mcm-ticket-ventana` usa `border-radius: 0 0 var(--radius-tarjeta) var(--radius-tarjeta)`
en CSS, no en clase: si borras `--radius-tarjeta`, actualiza también esa regla, o el tique
sale con esquinas rectas.

## Validación

`npm run build`. Recorrer catálogo, ficha, carrito, checkout y la pantalla de pedido
completado (donde vive el tique), en claro y oscuro. El tique es lo que más fácil se rompe:
compruébalo entero, con la animación de impresión.
