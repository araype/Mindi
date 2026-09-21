# Mindi Design System

## Company & product

Mindi es un espacio de acompañamiento para la salud y el bienestar de las mujeres, **comenzando por la menopausia — no limitado a ella**. La menopausia es el mercado de entrada; la marca debe poder expandirse a otras necesidades de bienestar y salud femenina. El centro de Mindi es la mujer, no el síntoma ni la tecnología.

**Lo que creemos:** ver a la mujer, no solo al síntoma. Cada experiencia es única. La confianza se construye con información clara y respaldada. Toda mujer merece un espacio seguro, sin juicio. El cuidado se adapta al ritmo de cada una, no al revés.

**Público:** mujeres con vidas profesionales y personales exigentes, acostumbradas a resolver por sí mismas, que postergan su cuidado y se ponen al final de su lista. Quieren mantener su autonomía ("yo puedo con todo") y buscan una relación 50/50 — alguien que ayude a entender y decidir, no alguien que las cuide o les diga qué hacer. Valoran privacidad, baja fricción y tienen precaución razonable frente a compartir información personal con IA.

There is one product surface represented in this pass: the **Mindi mobile app** — see `ui_kits/app/`.

**Sources provided:** one brand mark image (`assets/logo/mindi-logo.jpeg`) and two rounds of written strategic/brand brief. No codebase, Figma file, or additional brand assets were attached. Palette, type, components, and the app UI kit are built from scratch to match the brief, not sourced from an existing product.

## Product architecture

The core proposition is **"hay alguien aquí cuando necesites entender qué te está pasando"** — not a symptom tracker. Home leads with **Hablar con Mindi**, a natural-language conversation entry point (`ui_kits/app/AskMindiScreen.jsx`). Symptom check-in exists but is secondary, opt-in, and never pre-filled. Navigation is **Inicio / Mindi / Recursos / Perfil** — check-in is not one of the four pillars.

## Content fundamentals

- **Language:** Spanish (Latin America), "tú" — never "usted".
- **Voice:** "Mindi se siente como una compañía cercana que sabe escuchar y orienta con respaldo confiable." Calm, clear, adult, respectful — not a casual friend riffing, not a clinic.
- **Medical language:** not avoided — translated. Use medical terms when they help understanding, always explained in plain language. Mindi traduce el lenguaje médico; no lo esconde ni infantiliza.
- **Avoid:** streaks, daily goals, "¡Tú puedes!", "Racha", "Completa tu check-in", guilt over missed check-ins, drama, romanticizing symptoms, absolute privacy promises the product can't yet back up.
- **Sensitive questions:** always explain why ("Te pregunto esto porque…") and offer a real "Prefiero no responder" — see the `SensitiveQuestion` component.
- **Emoji:** not used in UI copy.
- **Repetition:** "a tu ritmo" / "sin presión" are principles, not slogans — don't repeat them on every screen.

## Trust & evidence

Guidance is never presented as diagnosis. Every piece of orientation pairs with its limits (what it can't determine, when to see a professional) via `GuidanceCard`. Attribution uses `ReviewedBy` and `SourceList`, grouped in a `TrustPanel`. **No real clinical reviewers, medical sources, studies, statistics, or testimonials exist yet in this design system** — everything demonstrative is explicitly labeled "Ejemplo" / "Marcador de posición." Do not remove those labels without real, authorized content behind them.

## Privacy & data

No real data/privacy architecture exists yet, so the product never makes absolute promises ("nunca compartimos tu información"). Instead: "Tú decides qué compartir con Mindi. Siempre queremos que entiendas cómo usamos tu información y puedas elegir tus preferencias." Any toggle that shares additional data (e.g. "Compartir datos anónimos") defaults **off**. Reminders default **off** and, if enabled, let the user choose frequency — never a forced daily cadence.

## Visual foundations

- **Color:** decorative brand accent (`--brand-accent` / `--terracotta-500`, from the logo) vs. accessible action color (`--action-primary`, a darkened terracotta, AA-safe with white text at 5.6:1). Never put white text on the light decorative accent — verified mathematically, see `guidelines/colors-brand.card.html`. `--brand-secondary` (plum-rose) is a high-contrast alternative fill. Semantic colors have separate tint (background) and `-text` (AA-safe foreground) tokens — see `guidelines/colors-semantic.card.html`.
- **Cool colors:** not part of the core identity, but not banned outright — a functional color may use blue/cool tones only when semantically necessary and accessible.
- **Type:** two fonts with two jobs. `--font-editorial` (Petrona) is reserved for welcome/reassurance moments and brand headlines — not applied to every heading. `--font-ui` (Public Sans) drives navigation, forms, settings, resource titles, and functional headings. Body base is 16px (`--text-body-m`); captions are 13px minimum for anything essential. Neither font was provided — both are Google Fonts substitutes. **Flag: ask for real brand typefaces.**
- **Backgrounds:** flat warm sand or white. No photography, gradients, or patterns yet — none invented.
- **Animation:** gentle only, standard/gentle eases, no bounces. `prefers-reduced-motion` is honored globally (`tokens/motion.css`).
- **Hover/press:** links darken toward `--brand-secondary-hover`; buttons hold color and scale down slightly on press.
- **Borders/shadows:** thin warm-gray borders used sparingly; one warm-tinted "whisper" shadow system (`--shadow-card`, `--shadow-raised`).
- **Corner radii:** 10/16/24px, full pill for buttons/tags/switches.
- **Transparency/blur:** only on modal scrims.
- **Layout:** generous whitespace, single-column mobile-first, 44px+ tap targets, low density — calm, not a dashboard. Historical/weekly symptom data (if shown) stays secondary and descriptive, never scored or gamified.
- **Subtle brand geometry:** the logo's "M" gesture (looping, continuous curves) can inform soft separators or transition shapes very subtly — never literal M-shapes repeated as decoration, never a redraw of the mark itself.

## Accessibility

Baseline for every component in this system (see `guidelines/accessibility.card.html`):
- Text meets WCAG AA (4.5:1; 3:1 only at headline scale) — verified mathematically for every token pairing actually used for text-on-color.
- Native `<input>`/`<select>`/checkbox/radio controls (Checkbox, Radio, Switch, Select) — real keyboard operation and screen-reader semantics, not custom divs.
- `:focus-visible` ring on every interactive element (`base.css`).
- 44px minimum tap targets (buttons, tags, tabs, switches, nav items).
- Dialog: `role="dialog"`, `aria-modal`, focus trap, Escape to close, focus returns to the trigger.
- Tabs: `role="tablist"`/`"tab"`, `aria-selected`, arrow-key navigation.
- Toast: `role="status"`/`aria-live="polite"` (or `"alert"` only when genuinely urgent).
- Tooltip: shows on focus as well as hover, `role="tooltip"` + `aria-describedby`.
- Selection/error state is never color-only (checkmark, border, or text label always present too).

## Iconography

No icon font, sprite, or SVG set was provided. `components/core/Icon.jsx` is a small hand-built line-icon set (24×24, 1.75px stroke, Lucide-style proportions) standing in until a real system is chosen or a CDN (Lucide/Phosphor) is wired in. **Flag: confirm Mindi's preferred icon library.** No emoji, no Unicode glyphs (▲▼ⓘ) used as icons anywhere in the current kit.

## Fonts — substitution flag

Petrona (editorial) and Public Sans (UI) are Google Fonts substitutes, since no real Mindi typefaces were supplied. Please share brand font files if they exist, or confirm these are fine to keep.

## Logo

`assets/logo/mindi-logo.jpeg` is the only real asset — a 640×640 JPEG on white. Used as-is everywhere the mark appears (thumbnail, brand card); never redrawn, vectorized, or approximated. **Before production, this needs:** an official SVG, a transparent PNG, a monochrome version, a dark-background version, clear-space rules, and a minimum size — none of which exist yet.

## Components

- `components/core/` — Button, Card, Icon
- `components/forms/` — Input, Select, Checkbox, Radio, Switch
- `components/feedback/` — Badge, Tag, Dialog, Toast, Tooltip
- `components/navigation/` — Tabs
- `components/trust/` — GuidanceCard, ReviewedBy, SourceList, TrustPanel, SensitiveQuestion

### Intentional additions
No source component library was attached, so this is a standard set sized to what the app UI kit needs. The `trust/` group (GuidanceCard, ReviewedBy, SourceList, TrustPanel, SensitiveQuestion) and `Icon` are additions beyond a typical base kit, built specifically to carry Mindi's trust, evidence, and privacy patterns — documented above.

## UI kit

`ui_kits/app/` — Mindi mobile app, click-through: **Onboarding → Home (Hablar con Mindi hero) → Ask Mindi conversation → optional check-in → Recursos → Perfil (privacidad y datos)**.

## Open questions / needs before production

- Official brand typefaces (currently Google Fonts substitutes).
- Official logo files: SVG, transparent PNG, monochrome, dark-background version, clear-space + min-size rules.
- Real privacy policy / data architecture (what's stored, shared, for how long, with whom).
- The AI architecture behind "Hablar con Mindi" (model, provider, data handling).
- Real clinical reviewers for any health guidance shown to users.
- Real medical sources/citations for resource content.
- Authorized real testimonials/stories, with proper consent and privacy treatment, to replace the labeled prototype placeholder.
- A defined escalation policy — when Mindi should point a user to a real healthcare professional.
- Preferred icon library (Lucide/Phosphor/custom) to replace the hand-built substitute set.

## Index

- `styles.css` — root stylesheet, imports everything below
- `tokens/` — colors, typography, spacing, radius, shadow, motion
- `base.css` — resets + base element styles, focus-visible
- `assets/logo/` — real brand mark (photo)
- `guidelines/` — foundation cards: colors, type, spacing, radius/shadow, logo, voice, trust, privacy, accessibility
- `components/` — 18 React primitives across core/forms/feedback/navigation/trust, see above
- `ui_kits/app/` — Mindi app screens
- `SKILL.md` — Claude Code–compatible skill file
- `thumbnail.html` — project homepage tile (uses the real logo)
