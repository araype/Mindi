// Mindi · Arma el paquete del sistema de diseño a partir de los archivos fuente:
//   _ds_bundle.js        componentes y pantallas (components/**/*.jsx, ui_kits/**/*.jsx) para las tarjetas
//   _ds_manifest.json    componentes, tarjetas (@dsCard), tokens (tokens/*.css) y fuentes
//   _adherence.oxlintrc.json  reglas de uso (tokens, fuentes, importar desde el paquete)
// Uso: npm run build:ds   (correrlo después de cambiar components/, ui_kits/, guidelines/ o tokens/)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { transformSync } from 'esbuild';

const ROOT = path.resolve(import.meta.dirname, '..');
const NS = 'MindiDesignSystem_ef6b32';
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const walk = (dir, ext) => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? walk(p, ext) : (p.endsWith(ext) ? [p] : []);
}).sort();

/* ---------- Bundle ---------- */
const sources = [...walk(path.join(ROOT, 'components'), '.jsx'), ...walk(path.join(ROOT, 'ui_kits'), '.jsx')];
const hashes = {}, components = [], exposed = [];
let body = '';
for (const file of sources) {
  const src = readFileSync(file, 'utf8');
  const r = rel(file);
  hashes[r] = createHash('sha256').update(src).digest('hex').slice(0, 12);
  const names = [...src.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
  if (r.startsWith('components/')) names.forEach((name) => components.push({ name, sourcePath: r }));
  exposed.push(...names);
  const code = transformSync(src.replace(/^import .*$/gm, '').replace(/^export (?=function|const)/gm, ''), { loader: 'jsx', jsx: 'transform' }).code;
  body += `// ${r}\ntry { (() => {\n${code}Object.assign(__ds_scope, { ${names.join(', ')} });\n})(); } catch (e) { __ds_ns.__errors.push({ path: ${JSON.stringify(r)}, error: String((e && e.message) || e) }); }\n\n`;
}
const header = { format: 4, namespace: NS, components, sourceHashes: hashes, inlinedExternals: [], unexposedExports: [] };
writeFileSync(path.join(ROOT, '_ds_bundle.js'),
  `/* @ds-bundle: ${JSON.stringify(header)} */\n\n(() => {\n\nconst __ds_ns = (window.${NS} = window.${NS} || {});\n\nconst __ds_scope = {};\n\n(__ds_ns.__errors = __ds_ns.__errors || []);\n\n` +
  body + exposed.map((n) => `__ds_ns.${n} = __ds_scope.${n};\n`).join('') + '\n})();\n');

/* ---------- Manifest ---------- */
const cards = ['guidelines', 'components', 'ui_kits'].flatMap((d) => walk(path.join(ROOT, d), '.html')).map((f) => {
  const m = readFileSync(f, 'utf8').match(/<!-- @dsCard ([^>]*?) -->/);
  if (!m) return null;
  const attrs = Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
  return { path: rel(f), group: attrs.group, viewport: attrs.viewport, subtitle: attrs.subtitle, name: attrs.name };
}).filter(Boolean);

const globalCssPaths = ['tokens/colors.css', 'tokens/typography.css', 'tokens/spacing.css', 'tokens/radius.css', 'tokens/shadow.css', 'tokens/motion.css', 'base.css', 'components.css', 'styles.css'];
const kindOf = (name, value) => {
  if (/^--(font|fs|lh|tracking)/.test(name)) return 'font';
  if (/^--(space|gutter|container|tap)/.test(name)) return 'spacing';
  if (/^--radius/.test(name)) return 'radius';
  if (/^--shadow/.test(name)) return 'shadow';
  if (/^#|^rgb|^hsl/.test(value) || /color|magenta|plum|pink|line|paper|black|wordmark|scale|bubble|chat|overlay|surface|text-|action|brand|border|focus|success|danger|warning|ok-|sev|test-bg/.test(name)) return 'color';
  return 'other';
};
const tokens = [];
for (const f of walk(path.join(ROOT, 'tokens'), '.css')) {
  const css = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rootBlock = (css.match(/:root\s*\{([\s\S]*?)\}/) || [])[1] || '';
  for (const m of rootBlock.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.push({ name: m[1], value: m[2].trim(), kind: kindOf(m[1], m[2].trim()), definedIn: rel(f) });
  }
}
const brandFonts = [
  { family: 'Special Gothic', status: 'ok', tokens: ['--font-display'], path: 'tokens/typography.css' },
  { family: 'Signika', status: 'ok', tokens: ['--font-body'], path: 'tokens/typography.css' },
  { family: 'Space Mono', status: 'ok', tokens: ['--font-mono'], path: 'tokens/typography.css' },
  { family: 'DM Mono', status: 'ok', tokens: ['--font-tagline'], path: 'tokens/typography.css' },
];
writeFileSync(path.join(ROOT, '_ds_manifest.json'), JSON.stringify({
  namespace: NS, components, startingPoints: [], cards, templates: [], hasThumbnailHtml: true,
  globalCssPaths, tokens, themes: [], fonts: [], brandFonts, source: 'spa',
}));

/* ---------- Reglas de uso ---------- */
const dirs = [...new Set(sources.map((f) => rel(f).split('/').slice(0, 2).join('/')))];
writeFileSync(path.join(ROOT, '_adherence.oxlintrc.json'), JSON.stringify({
  plugins: ['react', 'import'],
  rules: {
    'no-restricted-imports': ['warn', { patterns: [{ group: dirs.map((d) => `${d}/**`), message: "Importa los componentes del paquete, no sus archivos internos." }] }],
    'no-restricted-syntax': ['warn',
      { selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]', message: 'Color en hexadecimal: usa un token de tokens/colors.css con var().' },
      { selector: "Literal[value=/font-family\\s*:\\s*(?!['\\\"]?(?:Special Gothic|Signika|Space Mono|DM Mono|var\\())/i]", message: 'Fuente fuera del sistema. Disponibles: Special Gothic, Signika, Space Mono, DM Mono.' },
    ],
  },
}, null, 2) + '\n');

console.log(`bundle: ${sources.length} archivos, ${exposed.length} exports · tarjetas: ${cards.length} · tokens: ${tokens.length}`);
