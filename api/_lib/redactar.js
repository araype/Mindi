// Mindi · Quita datos personales de una pregunta del chat antes de guardarla (nivel 2, solo con la
// casilla marcada). Es un filtro automático: puede no detectarlos todos (por eso la casilla y la
// política piden no incluir datos personales). Cambia cada dato por una marca: [correo], [teléfono],
// [DNI], [dirección], [nombre].

const RULES = [
  // Correos
  [/[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi, '[correo]'],
  // DNI con la palabra (DNI 12345678, D.N.I. n.º 12345678)
  [/\bd\.?\s?n\.?\s?i\.?\s*(?:n[°º.o]*\s*)?:?\s*\d{8}\b/gi, 'DNI [DNI]'],
  // Teléfonos: 9 o más dígitos, con o sin +51, espacios, guiones o puntos
  [/(?:\+?\d[\d\s().-]{7,}\d)/g, (m) => (m.replace(/\D/g, '').length >= 9 ? '[teléfono]' : m)],
  // Números sueltos de 8 dígitos (DNI)
  [/\b\d{8}\b/g, '[DNI]'],
  // Direcciones: Av., Jr., Calle, Pasaje, Urb., Mz., Lt., Dpto. seguidos de su nombre o número
  [/\b(?:av(?:enida)?|jr|jir[oó]n|calle|ca|psje|pasaje|urb(?:anizaci[oó]n)?|mz|manzana|lt|lote|dpto|interior|int)\.?\s+[^\n,;.!?]{1,60}/gi, '[dirección]'],
  // Nombres presentados: "me llamo Ana", "mi nombre es Ana Pérez", "soy Ana"
  // Sin la bandera i: el nombre tiene que empezar con mayúscula, así "soy diabética" no se toca.
  [/(^|[^\p{L}])([Mm]e llamo|[Mm]i nombre es|[Ss]oy)\s+(?!Mindi(?:[^\p{L}]|$))\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+){0,3}/gu, '$1$2 [nombre]'],
];

/** Texto de la usuaria → el mismo texto con los datos personales reemplazados. */
export function redact(text, max = 1000) {
  let s = String(text || '');
  for (const [re, to] of RULES) s = s.replace(re, to);
  return s.trim().slice(0, max);
}
