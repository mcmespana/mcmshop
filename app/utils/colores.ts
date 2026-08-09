/**
 * Los colores de las camisetas y pañuelos vienen como texto ("Azul Royal",
 * "Granate", "Turquesa"). Mostrar una muestra de color real en vez de un botón
 * con la palabra escrita es la diferencia entre una tienda cuidada y una plantilla.
 *
 * Si un color no está en esta tabla no pasa nada: se muestra el nombre como texto.
 */
const MUESTRAS: Record<string, string> = {
  verde: '#2f7d4f',
  'verde botella': '#12503a',
  granate: '#7b1e2b',
  turquesa: '#1aa5a8',
  'azul royal': '#1f4fbf',
  azul: '#1f4fbf',
  celeste: '#7cc4e8',
  marino: '#17264a',
  morado: '#6b3f9e',
  naranja: '#e2661f',
  negra: '#1b1b1b',
  negro: '#1b1b1b',
  blanco: '#f5f5f0',
  blanca: '#f5f5f0',
  rojo: '#b8232f',
  roja: '#b8232f',
  amarillo: '#e8b21c',
  amarilla: '#e8b21c',
  gris: '#8a8a86',
  rosa: '#d97396',
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Devuelve el hex de la muestra, o null si el nombre no es un color conocido. */
export function muestraDeColor(nombre: string | null): string | null {
  if (!nombre) return null
  const clave = normalizar(nombre)
  if (MUESTRAS[clave]) return MUESTRAS[clave]!

  // "COM Verde" o "Pañuelo Azul": basta con que una palabra sea un color.
  for (const palabra of clave.split(/\s+/).reverse()) {
    if (MUESTRAS[palabra]) return MUESTRAS[palabra]!
  }
  return null
}

/** Los colores muy claros necesitan borde para verse sobre fondo blanco. */
export function necesitaBorde(hex: string): boolean {
  const n = hex.replace('#', '')
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 200
}
