# Sistema de diseño de Mindi

Identidad oficial: magenta con Special Gothic, Signika, Space Mono y DM Mono (handoff, secciones 3 a 5).
Los valores viven en `tokens/` y son la única fuente para todo el sitio.

## Archivos

| Archivo | Qué tiene |
| :-- | :-- |
| `tokens/colors.css` | Paleta del handoff (sección 3) y roles (`--text-primary`, `--action-primary`, …) |
| `tokens/typography.css` | Familias, escala de escritorio y de móvil (≤ 760 px), interlineados |
| `tokens/spacing.css` | Espacios, margen lateral (`--gutter`, 16 px), contenedores, área táctil (44 px) |
| `tokens/radius.css`, `tokens/shadow.css`, `tokens/motion.css` | Radios, sombras y movimiento (incluye `prefers-reduced-motion`) |
| `tokens/fonts.css` | `@import` de Google Fonts, solo para el paquete de diseño |
| `base.css` | Reglas mínimas comunes (cuerpo, títulos, enlaces, foco) |
| `components.css` | Componentes base con prefijo `m-` |
| `src/ds.css` | Entrada del sitio: tokens + base + componentes (sin fuentes) |
| `styles.css` | Entrada del paquete de diseño (`guidelines/`, `components/`, `ui_kits/`) |
| `sistema.html` | Muestrario de componentes, solo en `npm run dev` (no se publica) |

## Fuentes en cada página

En el `<head>` de cada HTML del sitio:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Special+Gothic:wght@700&family=Signika:wght@400;600&family=Space+Mono&family=DM+Mono:wght@300&display=swap">
```

Y en su JS: `import './ds.css';`

## Componentes

| Clase | Sección del handoff |
| :-- | :-- |
| `m-btn`, `m-btn--outline`, `m-btn--white`, `m-btn--nav`, `m-link` | 5.1 Botones |
| `m-eyebrow`, `m-chip`, `m-chip--sev` | 5.2 y 10.2 |
| `m-card`, `m-card--glass` | 5.4 y 10.4 |
| `m-steps`, `m-step` (`.is-active`) | 5.5 |
| `m-phone`, `m-phone__frame`, `m-phone__screen` | 5.6 (marco en `/img/frame.webp`) |
| `m-chat`, `m-bubble--bot`, `m-bubble--me`, `m-typing`, `m-scale`, `m-progress`, `m-meta`, `m-bar` | 10.1 y 10.2 (test, tema claro) |
| `m-chat--dark`, `m-msg--user`, `m-msg--bot`, `m-chat-input` | 5.7 y 10.5 (chat con IA, tema oscuro) |
| `m-plan`, `m-plan--plus`, `m-plan--ent` | 5.8 |
| `m-faq` | 5.9 |
| `m-field`, `m-input`, `m-check` | Formularios de lista de espera |
| `m-notice--emergency`, `m-notice--eval` | 10.3 (sin rojo intenso) |

Reglas: magenta brillante solo en títulos grandes, botones y acentos; en texto menor a 18 px sobre fondo claro, `--magenta-text`.
Nunca negro puro para texto: `--plum`. Foco visible: 3 px ciruela sobre claro, blanco sobre oscuro (`.m-on-dark`).

## Imágenes

En `public/img/` (WebP): `portada-1440.webp` y `portada-800.webp`, `datos-1262.webp` y `datos-760.webp`, `frame.webp`.
El velo magenta de la portada es CSS (`--overlay` al 34 %), no una imagen. Pendiente (handoff, 9): originales ≥ 1920 px con licencia.
