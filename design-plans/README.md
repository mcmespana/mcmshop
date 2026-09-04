# Planes de diseño — Tienda MCM

Cada plan es autocontenido: un agente ejecutor no necesita ningún contexto de la
conversación. **Ejecutor:** lee `../design.md` primero, después el plan entero, haz solo lo
que dice, ejecuta su sección Validación, y actualiza tu fila de estado aquí al terminar. Si
un paso no cuadra con el código actual, PARA, marca BLOCKED con una línea de motivo, y no
improvises.

Estos planes son la **unificación con el sistema de diseño MCM** (`../design.md`), común a
`mcmbank`, `mcmrecursos`, `mcmshop` y `mcmvotaciones`.

Esta app es la más pequeña y la más limpia de las cuatro; aquí hay poco que arreglar y sobre
todo **cosas que nombrar igual que las demás**. No la "mejores" de paso: su sobriedad es una
decisión, no un descuido.

**Todos hechos el 2026-09-03**, en ese orden. Si aparece deuda nueva, un plan numerado y una fila aquí.

## Estado

| Plan | Título | Superficie | Estado |
|------|--------|------------|--------|
| [001](001-fuente-declarada-que-no-carga.md) | `--font-sans` declara `'Inter var'` y no se carga ninguna fuente | global | DONE (2026-09-03) — Figtree autoalojada; Bricolage no entra, la tienda no tiene titulares ≥24 px |
| [002](002-tokens-al-vocabulario-comun.md) | Tokens al vocabulario común, con los nombres en español como alias | global | DONE (2026-09-03) — barrido de 407 clases en 27 ficheros; los nombres en español quedan como alias |
| [003](003-conmutador-de-tema.md) | Conmutador de tema (claro / oscuro / sistema) | global | DONE (2026-09-03)  |
| [004](004-theme-color-y-comentario.md) | `theme-color`: el comentario dice "marino" y el color es verde | global | DONE (2026-09-03)  |
| [005](005-escala-de-radios.md) | Reducir a la escala de radios del sistema | global | DONE (2026-09-03) — `--radius-tarjeta` era exactamente el `xl` de la escala |

Estados: TODO | IN PROGRESS | DONE (fecha) | BLOCKED (motivo en una línea)
