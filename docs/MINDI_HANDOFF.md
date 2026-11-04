# Mindi · Handoff del rediseño de la landing

Documento para implementar el rediseño en el proyecto de Claude Code (repo `araype/Mindi`, desplegado en Vercel). Referencia visual e interactiva: `mindi-landing.html` (prototipo completo). Cuando este documento y el prototipo no coincidan, manda este documento.

> **Rutas por confirmar:** las rutas internas (`/test`, `/chat`, etc.) son las que propongo. Reemplázalas por las rutas reales del proyecto antes de implementar.

---

## 1\. Estructura de la página (orden de secciones)

| \# | Sección | id (ancla) | Fondo |
| :---- | :---- | :---- | :---- |
| 0 | Menú fijo global | `#gnav` | Se adapta a la sección (ver 6.1) |
| 1 | Portada | `#top` | Foto \+ velo magenta |
| 2 | Transición "No es el final" \+ datos | `#esta-etapa` | Blanco → foto oscurecida |
| 3 | ¿Cómo funciona? | `#como-funciona` | Blanco |
| 4 | ¿Aún no te sientes lista para el test? (chat \+ FAQ) | `#pregunta` | Blanco |
| 5 | Planes | `#planes` | Rosa claro |
| 6 | Cierre (wordmark) | `#cierre` | Magenta |
| 7 | Footer | — | Blanco |

> En el prototipo algunos ids son distintos (`#story`, `#how`, `#ready`). En producción usa los de esta tabla, que son legibles en la URL.

---

## 2\. Auditoría de botones y enlaces

Leyenda de estado: **OK** \= el destino existe hoy · **PENDIENTE** \= el producto aún no existe; usar lista de espera · **DECIDIR** \= falta una decisión.

### 2.1 Menú fijo

| Elemento | Texto | Destino | Estado | Evento de analítica |
| :---- | :---- | :---- | :---- | :---- |
| Logo | Mindi | `/` (o `#top` si ya estás en la landing) | OK | — |
| Enlace | Mindi plans | `#planes` | OK | `nav_planes` |
| Enlace | ¿Cómo funciona? | `#como-funciona` | OK | `nav_como_funciona` |
| Enlace \+ ícono calendario | Agendar cita | Modal de lista de espera "Consultas con especialistas" | PENDIENTE | `nav_agendar_cita` |
| Enlace | Para especialistas | `/especialistas` (página Red Mindi) | PENDIENTE | `nav_especialistas` |
| Botón pill | Haz el test → | `/test` | OK | `cta_test_nav` |

**Menú en mobile (≤ 900 px):** se ven el logo, el botón **Haz el test →** y un botón **Menú** (ícono de dos líneas que se convierte en ×, texto "Menú"/"Cerrar"). Al tocarlo se despliega un panel blanco debajo del menú con:

| Opción | Destino |
| :---- | :---- |
| Mindi plans | `#planes` |
| ¿Cómo funciona? | `#como-funciona` |
| Pregúntale a Mindi | `/chat` |
| Agendar cita (etiqueta "Próximamente") | Lista de espera de consultas |
| Para especialistas | `/especialistas` |
| Haz el test gratis → (botón magenta) | `/test` |

El panel se cierra al elegir una opción, al tocar fuera, con la tecla Escape o al agrandar la pantalla. Usa `aria-expanded` y `aria-controls` en el botón, y al abrir el foco pasa a la primera opción. Evento: `nav_menu_open`.

### 2.2 Portada

| Elemento | Texto | Destino | Estado | Evento |
| :---- | :---- | :---- | :---- | :---- |
| Botón principal | Haz el test gratis → | `/test` | OK | `cta_test_hero` |
| Enlace secundario | Hablar con Mindi antes | `/chat` | OK | `cta_chat_hero` |
| Tarjeta · Peso | Pregúntale sobre tu peso | `/chat?tema=peso` (pre-carga el tema si el chat lo soporta) | OK | `cta_card_peso` |
| Tarjeta · Trabajo | Hablar con Mindi | `/chat?tema=trabajo` | OK | `cta_card_trabajo` |
| Tarjeta · Concentración | Haz el test de 5 min | `/test` | OK | `cta_card_concentracion` |
| Tarjeta · Memoria | Haz el test de 5 min | `/test` | OK | `cta_card_memoria` |
| Barritas / flechas | — | Cambian de frase (no navegan) | OK | — |

**Recomendación de copy:** cambiar "Hablar con Mindi antes" por "o pregúntale a Mindi".

### 2.3 Sección "No es el final" (datos)

| Elemento | Texto | Destino | Estado | Evento |
| :---- | :---- | :---- | :---- | :---- |
| Botón | Entiende lo que sientes → | `/test` | OK | `cta_test_datos` |

### 2.4 ¿Cómo funciona?

No tiene botones. **Recomendación:** agregar al final del paso 3 un botón **Haz el test gratis →** a `/test` (`cta_test_como_funciona`).

### 2.5 ¿Aún no te sientes lista para el test?

| Elemento | Texto | Destino | Estado | Evento |
| :---- | :---- | :---- | :---- | :---- |
| Botón contorno | Pregúntale a Mindi → | `/chat` | OK | `cta_chat_pregunta` |
| Botón del celular | "Ver de nuevo" | Reinicia la animación del chat | OK | — |
| FAQ (5 preguntas) | Acordeón | Despliega la respuesta | OK | `faq_open_{n}` |

### 2.6 Planes

| Plan | Botón | Destino | Estado | Evento |
| :---- | :---- | :---- | :---- | :---- |
| Mindi Free | Haz el test gratis → | `/test` | OK | `cta_plan_free` |
| Mindi Plus | Quiero acceso anticipado → | Modal o formulario de lista de espera (nombre, correo, WhatsApp opcional) | PENDIENTE | `waitlist_plus` |
| Mindi Enterprise | Agenda una demo → | `/empresas` con formulario (empresa, cargo, n.º de colaboradoras, correo) | PENDIENTE | `demo_enterprise` |

### 2.7 Cierre

No tiene botones. **Recomendación:** agregar **Haz el test gratis →** (blanco con texto magenta) bajo el tagline, a `/test` (`cta_test_cierre`).

### 2.8 Footer

| Elemento | Destino | Estado |
| :---- | :---- | :---- |
| WhatsApp \+51 927 671 423 | `https://wa.me/51927671423` (nueva pestaña) | OK |
| [mindifem@gmail.com](mailto:mindifem@gmail.com) | `mailto:mindifem@gmail.com` | OK |
| TikTok @mindifem | `https://www.tiktok.com/@mindifem` (nueva pestaña) | OK |
| Haz el test | `/test` | OK |
| Pregúntale a Mindi | `/chat` | OK |
| Términos y condiciones | `/terminos` | DECIDIR: confirmar que la página existe |

### 2.9 Resumen de destinos

| Destino | Botones que llegan ahí |
| :---- | :---- |
| `/test` | 9 (portada, 2 tarjetas, datos, planes Free, footer, \+ 2 recomendados) |
| `/chat` | 5 (portada, 2 tarjetas, sección pregunta, footer) |
| Lista de espera Plus | 1 |
| Lista de espera consultas | 1 (Agendar cita) |
| `/empresas` | 1 |
| `/especialistas` | 1 |

**Recomendación general:** en toda la landing usar solo dos verbos para las acciones principales: **Haz el test gratis** (botón sólido) y **Pregúntale a Mindi** (contorno o enlace).

---

## 3\. Paleta de marca

```css
:root {
  /* Marca */
  --magenta-btn:   #FF3CC7; /* botones sólidos, acentos, barras */
  --magenta:       #FF2FC0; /* títulos grandes */
  --magenta-text:  #C0128C; /* magenta para texto pequeño sobre fondo claro (accesible) */
  --magenta-deep:  #E01AA5; /* texto de botones contorno */
  --overlay:       #FC2CC9; /* velo de la foto de portada, opacidad 34% */

  /* Neutros cálidos */
  --plum:          #2A1026; /* texto principal, fondos oscuros, degradados */
  --plum-soft:     #6A4560; /* texto secundario */
  --body-text:     #4B3646; /* párrafos sobre blanco */
  --pink-bg:       #FDEBF6; /* fondo de secciones rosadas (planes) */
  --pink-tint:     #FFE3F5; /* chips, etiquetas */
  --line:          #F6B8E2; /* bordes de tarjetas */
  --line-soft:     #F3CFE4; /* separadores, pistas de barras */
  --paper:         #FFFFFF;
  --black:         #000000; /* solo tarjeta Enterprise */
  --wordmark:      #FDEEF4; /* "Mindi" gigante del cierre */

  /* Escala de síntomas 0–4 (test) */
  --scale-0: #FDE7F4; --scale-1: #FBCFE9; --scale-2: #F9A8DB; --scale-3: #FF3CC7; --scale-4: #E01AA5;

  /* Chat oscuro */
  --chat-bg: #1B0F19; --chat-header: #2A1026; --bubble-user: #A3207F; --bubble-bot: #3A2236;

  /* Estado */
  --ok-text: #1F7A4D; --ok-bg: #E6F6EE;
}
```

**Reglas de uso**

- Magenta brillante solo para títulos grandes, botones y acentos. En texto menor a 18 px sobre fondos claros, usar `--magenta-text`.  
- No usar negro puro para texto: usar `--plum`.  
- Sobre fotos, el texto va siempre sobre un degradado ciruela, no sobre la foto directa.

>   
> **Por reconciliar:** el design system que compartió tu compañero para la app móvil usaba Petrona/Public Sans y una paleta terracota/ciruela-rosa. La landing nueva usa magenta, Special Gothic y Signika. Decidan cuál es la identidad oficial y unifiquen la app y la landing.

---

## 4\. Tipografía

| Rol | Fuente | Pesos | Uso |
| :---- | :---- | :---- | :---- |
| Display | **Special Gothic** (respaldo: Archivo, Arial Black) | 700 | Títulos, números, botones, nombres de planes |
| Texto | **Signika** (respaldo: Segoe UI, system-ui) | 400, 600 | Párrafos, citas, preguntas |
| Etiquetas | **Space Mono** | 400 | Eyebrows ("■ PLANES"), chips, metadatos. Mayúsculas, letter-spacing 0.12–0.14em |
| Tagline | **DM Mono** | 300 | Solo la frase bajo el wordmark del cierre |

Todas están en Google Fonts.

**Escala**

| Elemento | Desktop | Mobile |
| :---- | :---- | :---- |
| Título portada (mayúsculas, 2 líneas fijas) | 118 px | \~11vw (≈44 px) |
| Wordmark del cierre | hasta 380 px (25vw) | 96 px |
| H2 de sección | 48–52 px | 30 px |
| Título "QUE SEA COMÚN…" (mayúsculas, 3 líneas fijas) | 38 px | 22 px |
| Números de datos | 34–36 px | 22–24 px |
| H3 / nombres de plan | 20–30 px | 18–24 px |
| Párrafo | 16–18 px | 16 px (mínimo) |
| Texto secundario | 14–15 px | 14 px (mínimo) |
| Etiquetas mono | 11–14 px | 11–12 px |

Interlineado: títulos 0.98–1.08, párrafos 1.45–1.55.

---

## 5\. Componentes

### 5.1 Botones

| Tipo | Estilo | Uso |
| :---- | :---- | :---- |
| Primario | Fondo `--magenta-btn`, texto blanco, pill (radio 40 px), padding 16×28, Special Gothic 700 | Acción principal |
| Secundario contorno | Borde 2 px `--magenta-btn`, texto `--magenta-deep`, fondo transparente | Acción secundaria; en hover se rellena magenta |
| Blanco | Fondo blanco, texto `#D9149F` | Sobre fondos magenta (Plus, cierre) |
| Enlace | Subrayado con offset 6 px | Acción terciaria sobre foto |
| Pill del menú | Como primario, padding 12×22 | "Para especialistas" |

Foco visible: outline 3 px (blanco sobre fondos oscuros, ciruela sobre claros), offset 3 px.

### 5.2 Eyebrow (etiqueta de sección)

Cuadrado magenta de 9–11 px \+ texto Space Mono en mayúsculas. Ej.: `■ ¿CÓMO FUNCIONA?`

### 5.3 Tarjeta de frase (portada)

- Fondo blanco, radio 28 px, sombra `0 24px 50px rgba(30,0,25,.3)`, ancho máximo 460 px.  
- Arriba: "LO QUE SIENTEN MUCHAS MUJERES" (mono, `--plum-soft`).  
- Chip del tema (PESO, TRABAJO, CONCENTRACIÓN, MEMORIA) en `--pink-tint` con texto `--magenta-text`.  
- Comilla magenta grande (64 px, Special Gothic) \+ cita en Signika 600, 20 px.  
- 4 barritas de progreso de ancho completo \+ flechas ‹ › (solo desktop) \+ botón contorno contextual.  
- Altura fija (todas las frases apiladas en la misma celda de grid).

### 5.4 Tarjetas de datos (sección 2\)

- Translúcidas: `rgba(255,248,252,.95)` \+ `backdrop-filter: blur(14px)`, radio 24 px.  
- Línea de vida: SVG de 0 a 80 años a escala (transición 43–47, menopausia 47, tramo "30+ años", esperanza de vida \~79).  
- Tres datos con visual propio: anillo (54%), 10 cuadraditos (77%, 7 llenos y el 8.º al 70%), barra (4 de 10 → 41,5%).

### 5.5 Pasos de "¿Cómo funciona?"

Número grande magenta (01–03), título y texto. Línea vertical a la izquierda (`--line-soft`) que se llena de magenta en el paso activo. Pasos inactivos al 32% de opacidad.

### 5.6 Marco de celular

PNG del iPhone con pantalla transparente (`frame.png`, 290×560). Área de pantalla: `left 10.2%, top 4.3%, width 81.7%, height 91.6%`, radio `13% / 6.6%`. El contenido va debajo del marco (z-index menor).

### 5.7 Chat

Fondo `--chat-bg`, cabecera `--chat-header` con avatar "M" magenta y estado ("en línea" / "escribiendo…"). Burbuja usuaria `--bubble-user` (derecha), burbuja Mindi `--bubble-bot` (izquierda), radio 10 px con esquina recortada. Indicador de escritura con 3 puntos animados.

### 5.8 Tarjetas de plan

Radio 30 px, padding 30×28. Free: blanco. Plus: magenta, elevada 18 px y con sombra. Enterprise: negro. Estructura: etiqueta mono → nombre → descripción → "Desde" → precio → lista con checks → botón centrado.

### 5.9 FAQ

`<details>/<summary>` con separadores `--line-soft`, signo "+" magenta que cambia a "–" al abrir.

### 5.10 Radios y sombras

| Elemento | Radio |
| :---- | :---- |
| Botones, chips | 30–40 px (pill) |
| Tarjetas grandes | 24–30 px |
| Tarjetas internas, burbujas | 10–18 px |

Sombra estándar: `0 22px 44px rgba(20,4,18,.32)` sobre fotos; `0 26px 50px rgba(220,20,150,.28)` en la tarjeta Plus.

---

## 6\. Interacciones

| \# | Interacción | Comportamiento | Detalle técnico |
| :---- | :---- | :---- | :---- |
| 6.1 | Menú fijo | Siempre visible. Transparente con texto blanco sobre fondos oscuros; blanco translúcido con texto ciruela sobre fondos claros | Cada sección lleva `data-nav="dark"` o `"light"`; en la sección 2 depende del progreso del scroll |
| 6.2 | Tarjeta de frases | Rota cada 5,5 s, da **una sola vuelta** y se queda en la primera. Pausa: mantener presionado (móvil, con escala 98%), hover (desktop), foco (teclado). Deslizar cambia de frase | Desactivar menú de copiar en la tarjeta (`-webkit-touch-callout:none`, `user-select:none`) |
| 6.3 | Sección 2 | Stage sticky de 100vh dentro de un contenedor de \~560vh. 5 momentos: tipografía → la foto se abre entre las frases → foto completa → mensaje → bloque de datos | `clip-path: inset()` controlado por el scroll |
| 6.4 | Datos | El tramo "30+ años" crece; el anillo, los cuadraditos y la barra se llenan y los números cuentan hacia arriba. Se deshacen al subir | Ligado al progreso del scroll |
| 6.5 | ¿Cómo funciona? | Celular fijo; en 3 tramos de scroll cambian el paso activo y la pantalla (test → resultado → reporte) | Contenedor \~330vh; en mobile, el celular arriba y solo el texto del paso activo |
| 6.6 | Chat en vivo | Al entrar en pantalla se reproduce la conversación con indicador de escritura; botón "Ver de nuevo" al final | `IntersectionObserver` (umbral 0.35); el tiempo de escritura depende del largo del mensaje |
| 6.7 | Planes | Tarjetas entran escalonadas (120 ms). En mobile, carrusel con scroll-snap que empieza en Plus y puntos indicadores | — |
| 6.8 | Cierre | Las letras de "Mindi" suben una por una (70 ms de desfase) y luego aparece el tagline | — |

**Accesibilidad obligatoria:** con `prefers-reduced-motion: reduce`, mostrar todos los estados finales sin animación ni rotación automática.

**Rendimiento:** probar las secciones sticky en un Android de gama media. En mobile, considerar reducir la altura de las secciones sticky a la mitad.

---

## 7\. Contenido y voz de marca

**Reglas**

- Tuteo, español peruano neutro, cálido y directo.  
- Sin emojis.  
- Sin promesas absolutas ("100% privado", "diagnóstico garantizado").  
- La palabra "triaje" no aparece nunca en lo que ve la usuaria.  
- Mindi orienta; no diagnostica ni trata. El aviso médico va siempre en el footer.  
- Fórmula de las tarjetas: **quitar la culpa → darle otro sentido → "Descubre qué está pasando y qué puedes hacer, sin \_\_\_ y sin \_\_\_."**  
- Sobre el peso: hablar de "entender lo que pasa", nunca de "bajar de peso".  
- Las frases de la portada son ilustrativas: no firmarlas como testimonios. Los testimonios reales solo con autorización escrita.

**Textos clave**

- Portada: "ENTIENDE TU / CUERPO" · "Mindi te ayuda a entender lo que sientes con un test gratuito de 5 minutos, basado en una escala que usan los ginecólogos."  
- Sección 2: "NO ES EL FINAL / ES 1/3 DE TU VIDA" → "QUE SEA COMÚN NO / SIGNIFICA QUE TENGAS / QUE AGUANTARLO".  
- Cierre: "The bridge across the menopause / gap in Peru and LATAM" (**DECIDIR:** mantener en inglés o pasar a español).

---

## 8\. Datos y fuentes (todas peruanas)

| Dato | Valor | Fuente |
| :---- | :---- | :---- |
| Edad promedio de la menopausia | 47 años | Guía de Práctica Clínica del Climaterio, Hospital Nacional Hipólito Unanue (2024), sección 5.4 |
| Transición a la menopausia | Hasta 4 años antes (\~43–47) | Misma guía, sección 5.1.2 |
| Vida después de la menopausia | Más de 1/3 de la vida, \~30 años | Misma guía, sección V |
| Esperanza de vida de la mujer peruana | \~79 años | INEI |
| Peruanas de 48–49 años en menopausia | 54% (54,5%) | INEI, ENDES 2016, cuadro 5.17 |
| No busca ayuda médica | 77% | Matzumura-Kasano et al., 2023 (Lima) |
| Síntomas graves en posmenopausia | 4 de 10 (41,5%) | Matzumura-Kasano et al., 2023 (Lima) |

Texto de fuentes en la landing: *"Línea de vida: Guía de Práctica Clínica del Climaterio, Hospital Nacional Hipólito Unanue (2024) e INEI. 54%: INEI, ENDES 2016 (cuadro 5.17). 77% y 4 de 10: Matzumura-Kasano et al., 2023."*

---

## 9\. Assets

| Asset | Uso | Pendiente |
| :---- | :---- | :---- |
| Foto mujeres en la playa | Portada | Original en alta resolución (≥1920 px) con licencia |
| Foto mujer con sofoco frente a la laptop | Sección 2 | Original en alta resolución con licencia |
| `frame.png` (marco de iPhone) | Todos los celulares | — |
| Fuentes | Google Fonts | — |

Subir las imágenes como archivos optimizados (WebP/AVIF), no embebidas en el código, con `loading="lazy"` salvo la de la portada.

---

## 10\. Adaptar el chat del test (y el chat con IA) al nuevo diseño

La landing muestra en los celulares cómo se ve el test, el resultado, el reporte y el chat. **Las pantallas reales de la webapp tienen que verse igual**: si la usuaria hace clic en "Haz el test" y encuentra otro estilo, se rompe la confianza que construyó la landing. Aplica el mismo sistema de diseño de este documento (paleta de la sección 3, tipografía de la sección 4, componentes de la sección 5\) a todo el flujo.

### 10.1 Chat del test (escala MRS)

Referencia: pantalla 1 de "¿Cómo funciona?" en el prototipo.

| Elemento | Especificación |
| :---- | :---- |
| Fondo | `#FFF8FC` (rosa casi blanco) |
| Cabecera | Avatar circular magenta con "M" blanca \+ "Mindi" en Special Gothic 700 |
| Progreso | Barra de 5 px (`--line-soft` de fondo, `--magenta-btn` de relleno) \+ texto mono "PREGUNTA 3 DE 11" |
| Burbuja de Mindi | Fondo blanco, borde 1,5 px `#F6C9E6`, radio `16px 16px 16px 4px`, texto `--plum`. Ejemplo cotidiano debajo en `--plum-soft`, 11,5–13 px |
| Burbuja de la usuaria | Fondo `--magenta-btn`, texto blanco, radio `16px 16px 4px 16px`, alineada a la derecha. Muestra el número y la etiqueta elegidos ("3 · Fuerte") |
| Escala 0–4 | 5 botones en fila con color progresivo (`--scale-0` a `--scale-4`), número grande en Special Gothic \+ etiqueta pequeña (Nada, Leve, Moderado, Fuerte, Muy fuerte). Los niveles 3 y 4 con texto blanco. Seleccionado: anillo de 2 px `--plum`. Área táctil mínima de 44 px |
| Mensajes de transición | Misma burbuja de Mindi, tono empático y corto ("Gracias por contármelo. Sigamos con el sueño.") |
| Animación | Cada mensaje entra con un "pop" suave (0,28 s) y los mensajes de Mindi van precedidos por el indicador de 3 puntos |
| Tipografía | Signika para los mensajes, Special Gothic para números y botones, Space Mono para metadatos |

### 10.2 Pantalla de resultado

Referencia: pantalla 2 de "¿Cómo funciona?".

- Título "Tus síntomas hoy" en Special Gothic.  
- Chip de intensidad con fondo `#FFE0F3` y texto `--magenta-text` ("Intensidad moderada").  
- Tres barras: **Cuerpo, Ánimo y Vida íntima** (nunca "somático/psicológico/urogenital" en lo que ve la usuaria), con porcentaje a la derecha. Se llenan con animación al aparecer.  
- Nota explicativa en tarjeta blanca con borde `--line`: qué le afecta más, en lenguaje simple y sin alarmar.

### 10.3 Pantallas de alerta (banderas rojas)

Mantener las dos variantes ya definidas (emergencia real vs. evaluación antes de tratamiento), con tono suave:

- Fondo blanco o `#FFF8FC`, **sin rojo intenso**. Para emergencia, un acento ciruela (`--plum`) con un ícono discreto. Para evaluación, el acento magenta normal.  
- Botones con el mismo estilo de la landing (primario para la acción principal, contorno para la secundaria).

### 10.4 Reporte para la consulta

Referencia: pantalla 3 de "¿Cómo funciona?".

- Tarjeta blanca con borde `--line` y filas "Escala MRS / Síntoma principal / Banderas rojas" con el valor en `--magenta-text`.  
- Bloque "Preguntas para tu médica".  
- Botón primario **Descargar PDF** y botón contorno **Compartir con mi médica**.  
- El PDF descargable usa la misma paleta y tipografía (logo Mindi, magenta solo en acentos, texto `--plum`).

### 10.5 Chat con IA ("Pregúntale a Mindi")

Referencia: sección "¿Aún no te sientes lista para el test?".

- Tema oscuro: fondo `--chat-bg`, cabecera `--chat-header`, burbuja de la usuaria `--bubble-user`, burbuja de Mindi `--bubble-bot`, texto blanco.  
- Estado bajo el nombre: "en línea" / "escribiendo…" mientras responde, con el indicador de 3 puntos.  
- Campo de texto "Escribe tu duda…" con botón de envío circular magenta.  
- **DECIDIR:** si prefieren que el chat con IA también sea claro (como el test), cambien la sección de la landing para que coincida. Lo importante es que la landing y la app muestren lo mismo.

### 10.6 Reglas que aplican a todo el flujo

- Mismos botones, radios, sombras y foco visible que la landing (sección 5).  
- Mismas reglas de voz (sección 7): tuteo, sin emojis, sin la palabra "triaje", sin promesas absolutas.  
- Mobile primero: el flujo completo debe poder hacerse con una mano en un celular de 360 px de ancho.  
- `prefers-reduced-motion`: sin animaciones de entrada ni barras animadas.  
- Textos mínimos de 14 px; los ejemplos cotidianos bajo cada pregunta no bajan de 12 px.

---

## 11\. Arquitectura y seguridad para publicar en mindifem.com

Los datos del test son **datos de salud**, es decir, datos sensibles según la Ley 29733 de Protección de Datos Personales. La seguridad es obligatoria desde el primer día.

### 11.1 Arquitectura

```
Usuaria (navegador)
   │  HTTPS
   ▼
Cloudflare  (DNS de mindifem.com, firewall, anti-bots, HTTPS)
   │
   ▼
Vercel  (landing + webapp en Next.js)
   │  solo desde el servidor (API routes / server actions)
   ├──► Supabase  (Postgres, región São Paulo): respuestas del test
   ├──► Cloud Run (agente de Mindi con ADK, privado)
   └──► Proveedor de correo (Resend o similar): envío del reporte
```

**Regla principal:** el navegador nunca habla directo con la base de datos, el agente ni el correo. Todo pasa por el backend de Vercel.

### 11.2 Dominio (Hostinger \+ Cloudflare)

- [ ] Mantener el dominio registrado en Hostinger y cambiar los nameservers a Cloudflare (plan gratuito).  
- [ ] En Cloudflare, apuntar `mindifem.com` y `www.mindifem.com` a Vercel (registros que indique Vercel al agregar el dominio).  
- [ ] SSL/TLS en modo **Full (strict)**, "Always Use HTTPS" activado y HSTS.  
- [ ] Redirigir `www` → dominio raíz (o al revés, pero uno solo).

### 11.3 Frontend y backend (Vercel / Next.js)

- [ ] Todas las claves en **variables de entorno de Vercel**. Ninguna clave con prefijo `NEXT_PUBLIC_` salvo las que de verdad son públicas.  
- [ ] La `service_role key` de Supabase solo se usa en el servidor; jamás en el cliente.  
- [ ] Validar en el servidor todo lo que llega (con Zod): respuestas MRS enteros del 0 al 4, número de ítems correcto, correo y teléfono con formato válido, longitud máxima de las preguntas al chat.  
- [ ] Rate limiting en las rutas del test, del chat y de los formularios (Vercel Firewall o Upstash Ratelimit).  
- [ ] Cloudflare Turnstile (captcha invisible) en los formularios de lista de espera, demo y envío del reporte.  
- [ ] Cabeceras de seguridad en `next.config.js`: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (o `frame-ancestors 'none'`), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva.  
- [ ] Mensajes de error genéricos para la usuaria; el detalle técnico solo en logs del servidor, sin datos personales.

### 11.4 Base de datos (Supabase)

- [ ] **Row Level Security activado en todas las tablas.** Sin políticas explícitas, nadie lee ni escribe. Revisar con el "Security Advisor" de Supabase.  
- [ ] Separar en dos tablas:  
  - `test_responses`: ID aleatorio (UUID), respuestas, puntajes por área, banderas rojas, fecha. **Sin datos personales.**  
  - `contacts`: UUID de la respuesta, correo y/o WhatsApp **cifrados** (pgcrypto o cifrado de columnas), consentimiento y fecha. Solo se llena si la usuaria pide el reporte o se une a una lista de espera.  
- [ ] Guardar solo lo necesario: si el reporte se descarga en el momento, no guardar nombre.  
- [ ] Región **São Paulo (sa-east-1)**.  
- [ ] Respaldos automáticos activados.  
- [ ] Política de retención: borrar o anonimizar datos de contacto a los 12 meses (o el plazo que definan en la política de privacidad).

### 11.5 Agente de IA (Cloud Run)

- [ ] Servicio **privado**: desactivar invocaciones sin autenticar. Solo el backend de Vercel lo llama, con una cuenta de servicio (ID token) o un secreto compartido.  
- [ ] No enviar datos personales al agente: solo respuestas del test y la pregunta, sin nombre, correo ni teléfono.  
- [ ] Logs sin el contenido de las conversaciones o con datos identificables enmascarados.  
- [ ] Revisar la política de retención de datos del proveedor del modelo.  
- [ ] Límite de tamaño de mensaje y de mensajes por minuto por usuaria.

### 11.6 Correo

- [ ] Configurar **SPF, DKIM y DMARC** para mindifem.com en Cloudflare.  
- [ ] El correo lleva un resumen breve y un enlace de descarga del reporte, no el detalle clínico completo en el cuerpo.

### 11.7 Repositorios y cuentas (lo más urgente)

- [ ] Los repos `araype/Mindi` y `araype/Mindi_agents` son **públicos**: escanear todo el historial en busca de claves (por ejemplo, con `gitleaks detect`). Si alguna clave se subió alguna vez, **rotarla**, aunque se haya borrado.  
- [ ] Pasar los repos a **privados**.  
- [ ] Agregar `.env*` al `.gitignore` y activar GitHub Secret Scanning y Push Protection.  
- [ ] **2FA** en GitHub, Vercel, Supabase, Cloudflare, Hostinger, Google Cloud y el correo de Mindi.  
- [ ] Acceso mínimo: cada persona del equipo solo con los permisos que necesita.

### 11.8 Analítica

- [ ] Vercel Analytics o Plausible (sin cookies de terceros).  
- [ ] Los eventos solo llevan el nombre de la acción (`cta_test_hero`, `test_completed`). **Nunca** respuestas del test, puntajes, correos ni teléfonos.

### 11.9 Cumplimiento legal (validar con un abogado o con el área legal de UTEC)

- [ ] **Consentimiento explícito** antes del test: casilla no marcada por defecto que explique para qué se usan sus datos de salud.  
- [ ] **Política de privacidad** clara: qué datos se guardan, para qué, por cuánto tiempo y con qué proveedores se comparten. Supabase, el proveedor de IA y el de correo procesan datos fuera del Perú, y eso debe informarse.  
- [ ] Inscripción del banco de datos ante la **Autoridad Nacional de Protección de Datos Personales**.  
- [ ] Canal para ejercer derechos (acceso, rectificación, eliminación): correo o formulario, con plazo de respuesta.  
- [ ] Términos y condiciones con el aviso de que Mindi orienta y no reemplaza la consulta médica.

### 11.10 Antes de lanzar

- [ ] Probar que la clave pública de Supabase no pueda leer `test_responses` ni `contacts` (intentar una consulta desde el navegador).  
- [ ] Probar que Cloud Run responda "no autorizado" si se llama directo, sin pasar por Vercel.  
- [ ] Revisar las cabeceras con securityheaders.com.  
- [ ] Pedirle a Claude Code una revisión de seguridad del repo completo antes del lanzamiento.

---

## 12\. Pendientes antes de publicar

1. Confirmar las rutas reales (`/test`, `/chat`, `/terminos`) y crear las listas de espera (Plus, consultas) y las páginas `/empresas` y `/especialistas`, o quitar esos botones hasta que existan.  
2. Configurar los eventos de analítica de la sección 2 (necesarios para la semana 14).  
3. Corregir en Figma: "Escríbenos", "Cuéntale cómo te **has** sentido", "Elige **cómo**", "Sigue tu **evolución**", y quitar "Desde" en el plan Free.  
4. Aplicar el feedback UX pendiente: unificar CTAs, simplificar el menú, revisar contraste del magenta en textos pequeños, tamaño mínimo de letra y línea de confianza bajo el botón de la portada.  
5. Decidir el tagline del cierre (inglés o español) y si se agrega botón.  
6. Reconciliar el design system de la app (Petrona/Public Sans) con el de la landing.  
7. Rediseñar el chat del test, el resultado, el reporte, las alertas y el chat con IA según la sección 10, para que coincidan con lo que muestra la landing.  
8. Completar el checklist de seguridad de la sección 11, empezando por el 11.7 (claves en repos públicos y 2FA).