# Pendientes para después del lanzamiento

## Imágenes de la landing en alta calidad (en pausa)

Decisión del 4 de noviembre de 2026: se mantienen las versiones WebP actuales de `public/img/`
(portada 800 y 1440 px, datos 760 y 1262 px, marco del celular) y no se cambia cómo se cargan
hasta después del lanzamiento.

**Qué se hará al retomarlo**

1. Recibir los originales en alta resolución y con licencia (handoff, sección 9):
   - la portada sin oscurecer (el oscurecimiento lo hace solo el CSS: velo `--overlay` al 34 %
     más el degradado ciruela);
   - la foto de la sección de datos.
2. Generar versiones de 800, 1440 y 2880 px de ancho en AVIF con respaldo WebP, calidad 80–85,
   sin agrandar la imagen si el original es más chico. Está bien que la portada pese entre 200
   y 350 KB.
3. Cargarlas con `<picture>` (fuente AVIF y luego `<img>` WebP) con `srcset` y `sizes`, y
   `object-fit: cover`. La portada lleva `fetchpriority="high"` y el resto `loading="lazy"`.
4. Revisar el contraste del texto de la portada con la foto sin oscurecer.

**Qué ya se sabe (prueba del 4 de noviembre con las fotos actuales)**

- Las fotos actuales miden 1440 px (portada) y 1262 px (datos), así que con ellas no salen
  versiones de 2880 px.
- Con calidad 80, el AVIF pesó más que el WebP (portada 1440: 41 KB frente a 31 KB). Con los
  originales hay que comparar pesos y calidad antes de decidir la calidad final.
- Al pasar la portada a `<picture>` hay que quitar el `<link rel="preload">` de `index.html`:
  precarga el WebP y el navegador descargaría las dos versiones.
- `.l-hero-bg img` y `.l-photo img` ya usan `object-fit: cover`. Si se envuelven en `<picture>`,
  agregar `.l-hero-bg picture, .l-photo picture { display: contents }` para no alterar el
  tamaño.
