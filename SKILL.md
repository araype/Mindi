---
name: mindi-design
description: Usa esta skill para diseñar interfaces y piezas con la identidad de Mindi (magenta, Special Gothic, Signika, Space Mono, DM Mono), ya sea código de producción o prototipos. Trae tokens, componentes m-, reglas de contraste y voz, y las pantallas del flujo (test, resultado, aviso, chat con IA).
user-invocable: true
---

1. Lee `README.md` (es corto) y `docs/sistema-diseno.md`.
2. Usa solo los tokens de `tokens/` (con `var()`) y las clases `m-` de `components.css`. No inventes colores ni fuentes.
3. Para textos, datos y decisiones, la fuente es `docs/MINDI_HANDOFF.md`. No inventes textos clínicos: los del test y los avisos viven en `supabase/functions/_shared/`.
4. Para mostrar algo visual, arma HTML estático que enlace `styles.css`. Para producción, sigue `src/ds.css` y las reglas del README.
