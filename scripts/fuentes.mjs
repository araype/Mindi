// Mindi · Descarga las fuentes de la marca (WOFF2, subconjuntos latin y latin-ext) a public/fonts/ y
// arma tokens/fonts-local.css con sus @font-face. Así el sitio no le pide nada a Google Fonts y la IP
// de las visitantes no sale a terceros (handoff, sección 4). Correr solo si cambian las fuentes:
//   node scripts/fuentes.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Special+Gothic:wght@700&family=Signika:wght@400;600&family=Space+Mono&family=DM+Mono:wght@300&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const SUBSETS = new Set(['latin', 'latin-ext']);

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();
const faces = [...css.matchAll(/\/\* ([a-z-]+) \*\/\s*@font-face \{([^}]*)\}/g)].map(([, subset, body]) => ({
  subset,
  family: body.match(/font-family: '([^']+)'/)[1],
  weight: body.match(/font-weight: (\d+)/)[1],
  url: body.match(/url\((https:[^)]+)\)/)[1],
  range: body.match(/unicode-range: ([^;]+);/)[1],
})).filter((f) => SUBSETS.has(f.subset));

// Signika es variable: el mismo archivo sirve para 400 y 600 → una sola regla con rango de pesos.
const byFile = new Map();
for (const f of faces) {
  const key = `${f.family}|${f.subset}|${f.url}`;
  const prev = byFile.get(key);
  if (prev) prev.weights.add(f.weight); else byFile.set(key, { ...f, weights: new Set([f.weight]) });
}

mkdirSync(path.join(ROOT, 'public/fonts'), { recursive: true });
let out = `/* Mindi · Fuentes de la marca alojadas en el sitio (public/fonts/, WOFF2). Generado por
   scripts/fuentes.mjs: no editar a mano. Licencia SIL Open Font License (public/fonts/pdf/OFL-*.txt). */\n`;
for (const f of byFile.values()) {
  const file = `${f.family.toLowerCase().replace(/ /g, '-')}-${f.subset}.woff2`;
  const buf = Buffer.from(await (await fetch(f.url)).arrayBuffer());
  writeFileSync(path.join(ROOT, 'public/fonts', file), buf);
  const w = [...f.weights].sort();
  out += `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${w.length > 1 ? `${w[0]} ${w[w.length - 1]}` : w[0]};font-display:swap;` +
    `src:url('/fonts/${file}') format('woff2');unicode-range:${f.range}}\n`;
  console.log(file, buf.length, 'bytes');
}
writeFileSync(path.join(ROOT, 'tokens/fonts-local.css'), out);
