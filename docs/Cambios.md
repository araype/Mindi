# Antes de cambiar nada
1. Explora el repo y explícame cómo está organizado el flujo del chat, dónde están los
   textos, la lógica de puntaje, las alertas y el envío del correo.
2. Proponme un plan de cambios por archivo y espera mi aprobación.
3. Trabaja en una rama nueva (fix/flujo-chat-experimento-2) con commits pequeños, uno por cambio.

# Restricciones (no romper)
- NO modificar la redacción, el orden ni el puntaje de los 11 ítems MRS, ni los umbrales de
  severidad ni las subescalas (somática, psicológica, urogenital). Vienen de la guía clínica.
- NO modificar la lógica de banderas rojas ni sus dos variantes de pantalla de alerta.
- No usar la palabra "triaje" en nada que vea la usuaria.
- Respetar el design system actual (tipografías, paleta, sin emojis, sin promesas absolutas
  de privacidad).
- Todo debe funcionar bien en móvil.

# Cambios pendientes
1. Bienvenida más corta: máximo dos líneas sobre qué hace Mindi y cuánto toma ("unos 5 minutos").
   Agregar un consentimiento simple (casilla) sobre qué datos se guardan y para qué, antes de empezar.
2. Filtro de etapa al inicio, en un solo paso con botones (edad por rangos y si sigue
   menstruando con regularidad). Si es menor de 40 y menstrúa con normalidad: no mostrar el
   test ni puntaje; mostrar un mensaje amable explicando que Mindi está pensada para otra
   etapa, con opción de dejar su correo en una lista de interés (guardar con etiqueta de segmento).
3. Menos texto entre preguntas: cada mensaje de transición en una sola línea corta.
   Los ejemplos cotidianos de cada ítem pasan a un botón "¿Qué significa esto?" que se
   despliega solo si la usuaria lo toca.
4. Glosario: términos como "aura" muestran una explicación corta al tocarlos.
   Aclarar la pregunta sobre tratamiento actual con un ejemplo breve desplegable.
5. Indicador de avance visible: "Pregunta X de 11".
6. Pantalla de resultado dentro de la app (no solo en el correo):
   - Nivel en palabras simples y qué significa.
   - Área más afectada según la subescala con mayor puntaje.
   - Cuándo conviene ir al médico.
   - Cómo usar el reporte en la consulta.
   - Aviso breve de que no es un diagnóstico.
7. Consejos de vida saludable: mostrar solo 1 o 2, priorizados según el área más afectada.
   El resto va en el reporte por correo.
8. Antes de la pregunta de precio, mostrar en una frase qué incluye la membresía.
   Usar un texto placeholder: [DESCRIPCIÓN DE LA MEMBRESÍA] (yo lo defino).
9. Correo del reporte: priorizar una sección de una página pensada para el médico
   (puntaje total, puntaje por subescala, alertas marcadas y datos de contexto de riesgo).
10. Analítica: registrar un evento por cada paso del flujo (inicio, filtro, cada pregunta,
    resultado, precio, correo) para medir en qué paso abandonan.

# Criterios de aceptación
- Los puntajes y alertas dan exactamente el mismo resultado que antes para las mismas respuestas
  (escribe tests que lo comprueben antes de tocar la interfaz).
- Ningún mensaje de transición supera una línea en móvil.
- Una usuaria joven que menstrúa con normalidad nunca ve un puntaje.
- El resultado se entiende sin abrir el correo.
- Cada paso del flujo dispara su evento de analítica.

Al terminar, dame un resumen de los cambios y una lista de qué debo probar manualmente.