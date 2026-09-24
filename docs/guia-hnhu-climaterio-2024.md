# Guía de Práctica Clínica para Diagnóstico y Tratamiento del Climaterio

**Hospital Nacional Hipólito Unanue — 2024**
**Aprobada por Resolución Directoral N° 211-2024-DG/HNHU** (Lima, 12 de agosto de 2024)

> Fuente primaria del proyecto Mindi. Este archivo es la transcripción a Markdown del PDF
> oficial compartido por el equipo, usado para fundamentar el contenido clínico de la landing
> (`index.html`, `src/main.js`) y del reporte enviado por correo/enlace
> (`supabase/functions/send-report/index.ts`).
>
> **Si el contenido de la landing o del reporte cita "la guía", esta es la guía.** Mantener este
> archivo si se actualiza la versión oficial, y revisar que las citas en el código sigan siendo
> exactas.
>
> **Decisión registrada (2026-09-24):** se evaluó dar respuestas libres post-resultado con un
> LLM (Claude) grounded en esta misma guía — técnicamente viable ya que el documento completo
> cabe como contexto sin necesitar RAG con embeddings. Se decidió **esperar señal del
> experimento actual** (interés real en pagar S/29/mes) antes de invertir en esa capa de IA,
> siguiendo la misma razón del handoff original: no meter una variable de IA en un experimento
> pensado para medir algo simple. Retomar esta decisión solo si los datos del experimento lo
> justifican.

---

## Resolución Directoral N° 211-2024-DG/HNHU

Ministerio de Salud — Hospital Nacional "Hipólito Unanue", Lima, 12 de agosto de 2024.

Aprueba la Guía Técnica: "Guía de Práctica Clínica para Diagnóstico y Tratamiento del
Climaterio", propuesta por el Departamento de Gineco-Obstetricia, con el visto bueno del
Departamento de Gineco-Obstetricia, la Oficina de Gestión de la Calidad y la Oficina de
Asesoría Jurídica.

- **Artículo 1.-** APRUEBA la Guía Técnica.
- **Artículo 2.-** ENCARGA al Departamento de Gineco-Obstetricia la ejecución y
  seguimiento de la guía.
- **Artículo 3.-** DISPONE la publicación en la página web del hospital
  (https://www.gob.pe/hnhu).

Firmado: Dr. Moisés Enrique Tambini Acosta, Director General (e), CMP: 16412.

### Equipo de Gestión del Hospital Nacional Hipólito Unánue

| Nombre | Cargo |
|---|---|
| M.C Moisés Enrique Tambini Acosta | Director General |
| M.C Moisés Enrique Tambini Acosta | Director Adjunto |
| CPC. Arnaldo Rojas Altamirano | Director Administrativo |
| CPC. Juan José Castillo Serna | Director Ejecutivo de la Oficina de Planeamiento Estratégico |
| M.C. Víctor Raúl Arámbulo Ostos | Jefe de la Oficina de Gestión de la Calidad |

### Grupo Elaborador de la Guía Técnica (Junio 2024)

| Nombre | Cargo |
|---|---|
| M.C. Dante Mendoza Baez | Jefe del Departamento de Gineco Obstetricia |
| M.C. Bertha Elizabeth Arroyo Montes | Jefa del Servicio de Ginecología |
| M.C. Juan Adrian Romero Quispe | Jefe del Servicio de Obstetricia Médico Quirúrgica |
| M.C. Juan Carlos Auqui Guerrero | Jefe de Servicio de Reproducción Humana |
| M.C. Verónica Liviac Anicama | Jefa de la Unidad de Menopausia |
| M.C. Maria Martínez Altamirano | Médico Ginecóloga Obstetra |
| M.C. Jesús Bonilla Yaranga | Médico Ginecólogo Obstetra |
| M.C. Emaly Mauricio Orcon | Médico Ginecóloga Obstetra |
| M.C. Johan Zapata Moreno | Médico Ginecólogo Obstetra |
| M.C. Katterin Mery Guzman Mancilla | Médico Revisor de la Oficina de la Calidad |
| M.C. Jhelitza Milagros Huamán Huamán | Médico Ginecólogo Obstetra |

Lima, 26 de junio del 2024.

### Ficha técnica

| Campo | Detalle |
|---|---|
| Profesionales elaboradores | Médicos del Servicio de Reproducción Humana del Departamento de Ginecología y Obstetricia |
| Clasificación de la enfermedad | Climaterio |
| Categoría de la guía | Tercer nivel de atención |
| Usuarios potenciales | Médico Asistentes del Departamento de Ginecología y Obstetricia, Residentes de los 3 años de la especialidad |
| Población blanco | Pacientes con Diagnóstico de Climaterio |
| Fuente de financiamiento | No ha recibido financiación alguna |
| Impacto esperado en salud | Promover el cuidado integral de la mujer en edad de climaterio |
| Metodología | Adaptación ADAPTE (MINSA, NT 414_2015): preguntas clínicas PICO, revisión sistemática (PubMed, Scielo), búsqueda manual, adopción de guías internacionales evaluadas con AGREE II |

**Declaración de conflicto de intereses:** los autores declaran no tener conflictos de interés
ni financiación por actividades relacionadas con el contenido de la guía.

### Preguntas a responder con la guía

- ¿Cómo se define el climaterio?
- ¿Cuál es el impacto del climaterio en mujeres de 45 a 60 años?
- ¿Cuál es la precisión diagnóstica de las pruebas de laboratorio para evaluar los niveles
  hormonales durante el climaterio en mujeres sintomáticas?
- ¿Cuál es la eficacia de la terapia de reemplazo hormonal en el manejo de los síntomas
  del climaterio en mujeres postmenopáusicas?
- ¿Cuál es la diferencia en la incidencia de complicaciones entre mujeres que reciben
  terapia de reemplazo hormonal y aquellas que no la reciben?
- ¿Cuál es la calidad de vida percibida por mujeres que reciben diferentes modalidades de
  tratamiento para el climaterio?
- ¿Cuál es la utilidad de los cuestionarios estandarizados para el diagnóstico temprano de
  síntomas del climaterio como los sofocos y la sequedad vaginal?
- ¿Cuál es la sensibilidad y especificidad de las escalas de evaluación de síntomas del
  climaterio en comparación con el diagnóstico clínico por especialistas?
- ¿Cuál es el impacto de un diagnóstico temprano y tratamiento adecuado del climaterio en
  la calidad de vida de las mujeres?
- ¿Cuál es la eficacia relativa de diferentes tipos de terapia de reemplazo hormonal
  (estrógeno solo vs. combinación de estrógeno y progestágeno)?
- ¿Cuál es la efectividad de las intervenciones no hormonales, como la fitoterapia o
  cambios en el estilo de vida, en mujeres con contraindicaciones para la terapia de
  reemplazo hormonal?
- ¿Cuál es el efecto de los suplementos de calcio y vitamina D en la prevención de la
  pérdida ósea durante el climaterio?
- ¿Cuál es la satisfacción del paciente y la adherencia al tratamiento a largo plazo entre
  diferentes modalidades terapéuticas?

---

## I. Finalidad

Mejorar la atención de las pacientes que acuden al Hospital Nacional Hipólito Unanue en la
etapa de climaterio.

## II. Objetivo

Promover el cuidado integral de la mujer en edad de climaterio, otorgando herramientas
sencillas basadas en la mejor evidencia disponible, de modo de facilitar la práctica del
profesional y la toma de decisiones.

## III. Ámbito de aplicación

Unidad de Menopausia - Servicio de Reproducción Humana, Departamento de Ginecología y
Obstetricia del Hospital Nacional Hipólito Unanue.

**Criterios de inclusión:**
- Todas las mujeres entre los 35 y 65 años
- Mujer <35 años con falla ovárica prematura

## IV. Proceso o procedimiento a estandarizar

Diagnóstico y Tratamiento del Climaterio.

### 4.1 Nombre y código

- Climaterio: CIE 10 N95.1
- Perimenopausia: CIE 10 N95.9

### 4.2 Proceso de desarrollo de la guía

Adaptación de guías de práctica clínica (Ministerio de Salud 2015). Búsqueda sistemática en
PUBMED y Scielo:

- PubMed: `("Climacteric"[Title/Abstract] AND hormone replacement therapy[Title/Abstract]) AND Practice Guideline[ptyp]`
- Scielo: `(climacteric AND (Non-hormonal therapies) AND (Hormone replacement therapy*))`

También se revisó la guía de la Sociedad Peruana de Climaterio. Evaluación con AGREE II:
mayor puntaje para la guía de la **SOGIBA (2018)**, seguida de la **Sociedad Chilena de
Endocrinología Ginecológica (2020)** — de estas se adaptó la mayor parte de las
recomendaciones. Cada recomendación se validó por consenso del comité de redacción, con
opinión de médicos del servicio y un revisor externo.

---

## V. Consideraciones generales

El climaterio abarca la transición hacia y desde la menopausia, con transformaciones físicas,
emocionales y sociales. En Perú, desde 2020 la esperanza de vida femenina supera los 75
años — más de un tercio de la vida de una mujer peruana se vive después de la menopausia.

### 5.1 Definiciones

**5.1.1 Menopausia** — Última menstruación. El diagnóstico es retrospectivo, tras 12 meses
sin menstruación. Es una falla ovárica primaria por depleción de folículos: el ovario deja de
responder a FSH/LH y cesa la producción de estrógenos y progesterona.

**5.1.2 Climaterio** — Del griego *klimater* (escalón). Período de transición desde la etapa
reproductiva (premenopausia) hasta la etapa no reproductiva (postmenopausia). La
transición a la menopausia puede durar hasta 4 años, con irregularidades menstruales,
síntomas vasomotores (SVM), síndrome genitourinario (SGM), trastornos del sueño y del
humor. Se caracteriza por:
- Disminución de la actividad ovárica: menos inhibina B, más FSH, menos estradiol.
- Sintomatología por carencia estrogénica, influenciada también por factores
  socioculturales y personales.
- Disminución de la masa ósea.
- Incremento del riesgo cardiovascular.

**5.1.3 Postmenopausia** — Desde la menopausia hasta el inicio de la vejez (~65 años).
Etapa donde suelen manifestarse enfermedades crónicas y degenerativas.

**5.1.4 Menopausia prematura** — Antes de los 40 años ("falla ovárica prematura"),
asociada a factores hereditarios, ambientales, autoinmunes, metabólicos o tratamientos
oncológicos. Afecta ~1% de la población general.

### 5.2 Etiología

Los folículos alcanzan 5-7 millones hacia el 5° mes de vida intrauterina y se reducen a 1-2
millones al nacer por atresia. En la mujer adulta, los folículos pueden permanecer en reposo,
ovular, o sufrir apoptosis; cuando se agota la población de ovocitos, sobreviene la
menopausia.

### 5.3 Fisiopatología

La fisiopatología exacta se desconoce y probablemente involucra múltiples factores. El
descenso de estrógeno coincide con la transición y su reposición alivia los SVM, **pero no
serían los únicos factores involucrados** (mujeres jóvenes con amenorrea hipotalámica
hipoestrogénica no tienen sofocos, tampoco las niñas prepuberales). La teoría más aceptada:
los mecanismos termorreguladores cambian, acortando la zona termoneutral y haciéndola más
sensible — pequeños aumentos de temperatura gatillan el sofoco. Los neurotransmisores
(norepinefrina, serotonina) están involucrados; se relaciona con el mecanismo de los ISRS.

### 5.4 Aspectos epidemiológicos

La edad de la menopausia parece genéticamente determinada (no afectada por raza, edad de
menarquía, N° de ovulaciones ni nivel socioeconómico). Promedio: EE.UU./Europa 51 años;
**Perú ~47 años**; en altura ocurre antes — Cusco (3400 msnm) 45 años, Cerro de Pasco (4300
msnm) 42 años.

### 5.5 Factores de riesgo asociados

- **5.5.1 Medio ambiente:** la altitud puede afectar síntomas, salud ósea (menor
  disponibilidad de oxígeno) y disponibilidad de actividad física al aire libre.
- **5.5.2 Estilos de vida:** obesidad, depresión, ansiedad, bajo estatus socioeconómico,
  tabaquismo.
- **5.5.3 Factores hereditarios:** predisposición genética, polimorfismos relacionados con
  el metabolismo de esteroides sexuales.

---

## VI. Consideraciones específicas

### 6.1 Cuadro clínico

#### 6.1.1 Signos y síntomas

1. **Alteraciones menstruales.** Variabilidad del ciclo por disminución hormonal,
   anovulación crónica y escasa progesterona; puede causar sangrado sin ovulación o
   periodos con intervalos >35 días.

2. **Síntomas vasomotores (SVM).** Sofocos y sudores diurnos/nocturnos. **Hasta el 80%
   de las mujeres experimenta SVM** durante la transición. Comienzan en la transición y
   alcanzan su pico 1-2 años tras el cese menstrual; pueden durar años.

   Estudio SWAN — duración de los SVM:
   - **Mayor** en: inicio en premenopausia/perimenopausia temprana (media 11.8 años),
     mujeres afroamericanas (10.1 años), inicio a edad joven, fumadoras y obesas, alta
     ansiedad/estrés/depresión.
   - **Menor** en: inicio en postmenopausia (3.4 años), mujeres japonesas/chinas (4.8-5.4
     años), casadas o en pareja, mayor nivel educativo y soporte social.

   El sofoco: calor extremo repentino en cara/cuello/pecho, dura 1-5 minutos, con
   transpiración, enrojecimiento, escalofríos, ansiedad y a veces palpitaciones. Puede
   interferir con el sueño.

3. **Síndrome genitourinario de la Menopausia (SGM).** Reemplaza el término "atrofia
   vulvovaginal". Cambios en labios, vestíbulo, introito, vagina, uretra y vejiga por
   deficiencia estrogénica. La sequedad vaginal es el primer síntoma, evidente 4-5 años
   tras la menopausia. También: irritación, picazón, flujo, dispareunia, frecuencia
   urinaria, urgencia, nicturia, disuria, incontinencia, infecciones urinarias a repetición.
   **Es crónico y progresivo — a diferencia de los SVM, no mejora con el tiempo.**

4. **Enfermedades cardiovasculares.** ~45% de las muertes en mujeres. El síndrome
   metabólico triplica el riesgo de infarto/ACV y duplica el de muerte por enfermedad
   vascular.

5. **Osteoporosis.** Reducción de fortaleza ósea (calidad y cantidad), más fragilidad y
   riesgo de fractura; más común con la edad, sobre todo en hueso trabecular (columna
   lumbar). Asociación inversa con el IMC.

6. **Síntomas psicológicos y del estado de ánimo.** El riesgo de depresión mayor es 1.5-1.7
   veces mayor en mujeres que en hombres. La perimenopausia es una ventana de especial
   vulnerabilidad. Un episodio depresivo previo (sobre todo ligado a eventos
   reproductivos) es el predictor más importante. **Cerca del 75% de las mujeres
   perimenopáusicas refiere alteraciones del ánimo y del sueño.**

7. **Sexualidad.** La OMS (2002) define salud sexual como bienestar físico, emocional,
   mental y social relacionado con la sexualidad. Factores que influyen en la disminución
   de la función sexual femenina en la postmenopausia:
   - *Psicosociales:* actitudes previas hacia el sexo, costumbres culturales/religiosas,
     mala relación de pareja, sentimientos hacia la pareja, tiempo de relación, pérdida de
     interés (propio o de la pareja), no tener pareja, estrés laboral/familiar, imagen
     corporal negativa.
   - *Desórdenes psicológicos:* depresión, ansiedad, otras enfermedades psiquiátricas.
   - *Problemas médicos:* menopausia, atrofia vaginal, SVM, declinación del deseo por
     edad, fatiga, incontinencia, enfermedades crónicas (cardiovasculares, diabetes,
     artritis, falla renal), cáncer ginecológico (especialmente de mama).
   - *Agentes farmacológicos:* psicotrópicos (ISRS, tricíclicos, benzodiazepinas,
     barbitúricos), cardiovasculares (betabloqueantes, clonidina, metildopa,
     espironolactona), hormonas (agonistas/antagonistas GnRH, corticoides,
     anti-andrógenos), otras (alcohol, marihuana, cocaína, heroína).

#### 6.1.2 Interacción cronológica — Criterios STRAW+10

Actualización de los criterios STRAW (IMS/NAMS). **Etapas:**

- **-3 "Reproductiva tardía"** (subetapas -3b, -3a): ciclos regulares → acortamiento de
  ciclos con sangrado frecuente.
- **-2 "Transición temprana":** variabilidad en duración del sangrado. FSH sube, HAM baja.
  Inicio de la "perimenopausia".
- **-1 "Transición tardía":** ausencia de sangrado >60 días, fluctuaciones hormonales,
  anovulación frecuente, **FSH ≥25 UI/L**. Dura 1-3 años. Posibles SVM.
- **+1 "Postmenopausia temprana"** (subetapas +1a/+1b/+1c): dura 5-8 años. +1a marca el
  fin de 12 meses tras la FUM (fin de la "perimenopausia"). SVM habituales en +1a/+1b.
- **+2 "Postmenopausia tardía":** función reproductiva estable. SGM evidente.

**Mujeres en las que NO debiera aplicarse STRAW+10:**
- Insuficiencia ovárica primaria/precoz
- **Histerectomizadas o con ablación endometrial** (no hay cambios en el sangrado)
- Síndrome de ovario poliquístico
- Amenorrea hipotalámica
- Bajo tratamiento con quimioterapia
- Bajo tratamiento con tamoxifeno
- VIH/SIDA

> **Nota para Mindi:** esto confirma por qué el producto no debe asignar una etapa STRAW+10
> — no se recolectan FSH/AMH, y una parte de las usuarias (histerectomizadas) queda
> explícitamente excluida del sistema.

#### 6.1.3 Figuras de la guía (resumen)

**Figura 1 — Objetivos clínicos:** calidad de vida, síndrome climatérico, comorbilidad,
problemas ginecológicos, fertilidad, enfermedades crónicas, problemas biopsicosociales →
mejorar calidad de vida (tratar comorbilidad, detectar riesgos, prevenir enfermedades
crónicas).

**Figura 2 — STRAW, tabla de estadios:** duración, ciclo menstrual, FSH/AMH/Inhibina B,
recuento de folículos antrales y síntomas por etapa (ver tabla completa en el PDF original).

**Figura 3 — Dosificaciones diarias de THM** (estrógenos, progestágenos, combinaciones,
tibolona, THM local genitourinaria) — ver tabla completa en el PDF original; incluye dosis en
mg/µg por vía y presentación.

**Figura 4 — Metas de manejo del riesgo metabólico:** hipertensión (<130/85), tabaquismo
(cero), diabetes (HbA1c <6.5%), obesidad (cintura <88 cm), dislipidemia (ATP-III <3/5,
score CV <7.5% a 10 años), sedentarismo (2.5 h/semana o 30 min diarios + ejercicios de
potencia). Recurso principal en todos: estilo de vida.

**Figura 5 — Terapias por dominio de síntoma** (THM, THM local, alternativas):

| Dominio | THM | THM local | Alternativas |
|---|---|---|---|
| Vasomotores | ++++ | – | ISRS + |
| Palpitaciones | ++++ | – | Betabloqueadores ++ |
| Artralgias | +++ | – | AINEs +++ |
| Insomnio | ++ | – | Trazodona/zolpidem/zopiclona +++; ISRS +; quetiapina dosis muy bajas ++ |
| Depresión | ++ | – | ISRS +++; duales +++ |
| Ansiedad, angustia | ++ | – | ISRS +++ |
| Irritabilidad | ++ | – | ISRS +++ |
| Olvidos | ++ | – | ISRS ? |
| Sexual | + | + | Andrógenos ++ |
| Incontinencia | contradictorio | dudoso como terapia única | Kegel / vejiga hiperactiva: tolterodina, darifenacina, trospio, solifenacina |
| Atrofia genital | ++++ | ++++ | Paliativos humectantes y lubricantes |

**Figura 6 — Sugerencias en situaciones clínicas comunes, Parte I**

| Situación | Condición | Recomendación |
|---|---|---|
| Tratamiento por síntomas | MRS Total ≥15 | **THM muy recomendable** |
| | MRS Total ≥8 / Somático ≥8 / Psicológico ≥6 / Urogenital ≥3 | Cualquier THM según evaluación individual |
| Mujer sin comorbilidad | <60 años | Cualquier TH con estrógenos sistémicos, tibolona, TSEC |
| | ≥60 años | Evaluación previa especial, CV y de placa ATE inestable |
| Mujer obesa sana | IMC 30-40 | Preferir E2 transdérmico o E2 oral dosis bajas; tibolona, TSEC |
| Hipertensión arterial | Tratada, cumple meta ≤130/85 | Preferir E2 transdérmico + progesterona micronizada, drospirenona o dihidrogesterona |
| | Tratada, resultado insatisfactorio | Determinar causa endocrinológica/nefrológica. E2 TD + drospirenona, PM o dihidrogesterona |
| Mujer diabética | Lípidos normales | Preferir E2 transdérmico u oral dosis bajas, tibolona o TSEC |
| | Hipertrigliceridemia | Preferir E2 transdérmico o tibolona, evitar estrógenos orales |
| Antecedente trombosis venosa | Episodio único, dada de alta | E2 transdérmico + progesterona micronizada/dihidrogesterona, o tibolona |
| | Trombofilia o 2 episodios | E2 transdérmico + PM/dihidrogesterona; tibolona; eventual anticoagulante |
| Antecedente CV arterial | IAM o AVE | **No iniciar THM con estrógenos sistémicos, tibolona ni TSEC** |
| Migraña | Sin aura | Cualquier THM sistémico continuo y estable |
| | **Con aura** | **Estradiol transdérmico continuo. Preferir P micronizada secuencial** |
| Cirugía bariátrica | Cualquier tipo | Cualquier THM con estrógenos sistémicos; tibolona; TSEC |

**Figura 7 — Sugerencias en situaciones clínicas comunes, Parte II**

| Situación | Condición | Recomendación |
|---|---|---|
| Síndrome premenstrual / disfórico PM | Antecedente compatible | THM continua + oposición con drospirenona, DHP o trimegestona. Evitar Progesterona, levonorgestrel y MPA |
| Síndrome urogenital | Sin contraindicación sistémica | Cualquier THM sistémica y/o local: estradiol, estriol, DHEA, promestrieno |
| | Con contraindicación sistémica | Preferir tibolona local |
| Disfunción sexual | Libido disminuida | Preferir tibolona; cualquier THM con estrógenos sistémicos; TSEC; puede asociar testosterona o DHEA; prasterona + estradiol valerato |
| Depresión | MRS Psicológico ≥6 / depresión mayor | Cualquier THM con estrógenos sistémicos, tibolona, TSEC. **Tratamiento coordinado con psiquiatra** |
| Insomnio | Identificar subtipos | Cualquier THM. Preferir E2 + progesterona micronizada nocturna. Puede asociar hipnóticos |
| Endometriosis/adenomiosis | Antecedente o síntomas remotos | Tibolona, TSEC o THM con oposición continua o DIU-LNG |
| Osteopenia/osteoporosis | FRAX o DXA | Cualquier THM con estrógenos sistémicos; tibolona; TSEC |
| **Tabaquismo** | Riesgo cardiovascular y de cáncer | **THM transdérmica + oposición con PM o DHP. Tratar la adicción** |
| Mastopatía benigna | MFQ o densificación mamaria | Tibolona, TSEC o cualquier THM sistémica |
| Cáncer de mama | Antecedente personal | **No usar THM sistémica de ningún tipo** |
| | **Antecedente familiar** | **Puede usar cualquier THM sistémica. Tamizaje genético en casos índice** |
| Cáncer de endometrio | Curadas estadios I-II | Preferir THM con progestágeno continuo |
| Otros cánceres | Ginecológicos y no ginecológicos | Considerar receptores. Evitar en ER(+) o PR(+) |
| VIH | Portadora o con SIDA | Cualquier THM con estrógenos sistémicos; tibolona; TSEC |

**Figura 8 — Terapias no hormonales para síntomas vasomotores**

| Tratamiento | Dosis diaria | Comentarios |
|---|---|---|
| Escitalopram | 10 mg | Eficacia 61% |
| Paroxetina | 7.5-25 mg | Eficacia 18%. Contraindicado con tamoxifeno. Asociación con fracturas |
| Sertralina | 50 mg | Eficacia 18% |
| Venlafaxina | 75-150 mg | Eficacia 15% |
| Desvenlafaxina | 50-200 mg | Eficacia 49% (100mg) / 60-65% (≥150mg); riesgo hipertensivo |
| Isoflavona | 100 mg | Eficacia 25-33% |
| Vortioxetina | 5-20 mg | Evidencia en depresión mayor + síntomas climatéricos |
| Pregabalina | 75-300 mg | Eficacia hasta 50% (1 estudio). Rápido efecto |
| Gabapentina | 300-900 mg | Eficacia 14.8%. Rápido efecto |
| Clonidina | 100 mg | Eficacia 14.8%. Puede causar hipotensión |
| Bloqueo simpático (bupivacaína) | — | Similar a paroxetina en cáncer de mama |

### 6.2 Diagnóstico

#### 6.2.1 Criterios de diagnóstico clínico

Diagnóstico fundamentalmente clínico, por grupos etarios promedio:
- **Premenopausia:** 35 a 45 años
- **Menopausia:** 45 a 55 años
- **Postmenopausia:** hasta los 65 años

El diagnóstico de menopausia es **retrospectivo**: 12 meses de amenorrea desde el último
período menstrual, sin otra causa patológica o fisiológica.

#### 6.2.2 Diagnóstico diferencial

1. Patología tiroidea (hiper/hipotiroidismo)
2. Patología cardiovascular
3. Problemas psicológicos (ansiedad, depresión)

### 6.3 Exámenes auxiliares

**6.3.1 De patología clínica** — Solicitar: hemograma, hemoglobina glicosilada, TGO, TGP,
**FSH**, **estradiol**, inhibina B, glucosa sérica, perfil de lípidos, examen de orina, TSH.

**6.3.2 De imágenes**

1. **Ecografía** transvaginal — evalúa pelvis, monitoriza endometrio. Grosor endometrial:
   ≤3 mm en postmenopáusica sin THM; ≤8 mm en usuaria de THM.
2. **Mamografía** — sensibilidad 61-95% (menor en mamas densas), especificidad 80-90%
   (ambas mejoran con la edad, mejor >50 años). **Iniciar a los 40 años, repetir cada año**;
   a los 35 si hay alto riesgo de cáncer de mama. Junto con ecografía mamaria.
3. **Densitometría ósea (DEXA)** — T-score: >-1 normal, -1 a -2.5 osteopenia, <-2.5
   osteoporosis. Indicar a toda paciente menopáusica con factor de riesgo.

**6.3.3 Exámenes especializados complementarios**

1. **Papanicolaou** — detecta cambios precursores de cáncer de cérvix (VPH 16/18 causan
   ~70% de los casos). Parte de la evaluación epidemiológica anual.
2. **Biopsia de endometrio** — estándar para descartar hiperplasia/cáncer endometrial
   (sensibilidad 73%, especificidad 100%). Indicada ante hemorragia uterina anormal con
   sospecha de hiperplasia/cáncer.

### 6.4 Manejo según nivel de complejidad y capacidad resolutiva

#### 6.4.1 Medidas generales y preventivas

**6.4.1.1 Cambios del estilo de vida**

1. **Dieta.** Favorecer **dieta mediterránea**: legumbres, frutas, verduras, semillas, granos,
   huevos, lácteos, pescado y aceite de oliva. Con IMC elevado: plan integral con
   alimentación, ejercicio y educación, con metas realistas y autonomía.
   **Calcio 600-1,200 mg/día** (dieta + suplementos) y **vitamina D 800-4,000 UI/día**.

2. **Ejercicio.** Actividad física regular al aire libre, ejercicio aeróbico de por vida.
   **150 minutos de ejercicio moderado/intenso a la semana, o 30 minutos diarios.**
   Beneficio principal: salud cardiovascular. También reduce sudores nocturnos, cambios
   de humor e irritabilidad (vía β-endorfinas hipotalámicas, estabilizando la
   termorregulación). Probable asociación con menor riesgo de cáncer de mama. En riesgo
   de osteosarcopenia: evaluación previa por reumatólogo/endocrinólogo/geriatra; plan
   guiado por fisiatra, kinesiólogo o médico del deporte.

3. **Retiro de hábitos nocivos.** Dejar de fumar, beber alcohol u otras drogas o fármacos
   sin indicación médica.

4. **Autorrealización.** Descanso suficiente, control del estrés, tiempo con familia y
   amigos, redes de apoyo, actividades mentalmente estimulantes.

**6.4.1.2 Prevención de enfermedades**

1. **Sistema cardiovascular.** Criterios ATP-III. Puntos clave: normalizar peso, mantener
   normotensión, glicemia y lípidos en rango, no fumar, mantener masa muscular activa.
   Riesgo CV a 10 años por escala ACC/AHA.

2. **Detección temprana de cánceres.** Mayor mortalidad en la mujer: mama, vesícula,
   estómago, tráquea-bronquios-pulmón, colon, cérvico-uterino.

3. **Depresión.** **Prevalencia de síntomas depresivos en mujeres de 45-64 años: 30.1%.**
   **Se sugiere derivar a salud mental a toda mujer con el dominio psicológico del MRS
   alterado (≥6 puntos).**

4. **Salud músculo-esquelética.** Dolores musculares/articulares muy frecuentes en pre y
   posmenopausia, asociados al déficit de estrógenos y a la osteoartritis. No requiere
   evaluación rutinaria por especialista salvo contraindicación o respuesta insuficiente a
   THM (ahí, AINEs con apoyo de reumatología). Ejercicio regular + ≥1 g de proteína/kg de
   peso al día reduce el riesgo de sarcopenia/osteosarcopenia (prevalencia 6% en mujeres
   de 60-65 años).

5. **Prevención primaria de osteopenia y osteoporosis.** **Calcio 1,200 mg/día** (dieta o
   suplementos) y **al menos 800 UI/día de vitamina D**. Ejercicios que favorezcan
   remodelación ósea y equilibrio, con carga progresiva. La THM previene la osteopenia.

#### 6.4.2 Terapéutico

**Individualización.** La THM debe confeccionarse según síntomas, necesidades de
prevención, antecedentes personales/familiares, estudios pertinentes, y preferencias de la
mujer.

**6.4.2.1 Tratamiento hormonal**

**Solo se debe prescribir en pacientes con síndrome climatérico — síntomas moderados a
severos. Nunca en leves.**

Dos tipos:
- **Sistémica:** solo en síndrome climatérico.
- **Local:** cuando el único síntoma es la atrofia urogenital.

Condiciones básicas para iniciar THM: dosis bajas, tiempo corto, individualizadas,
seguimiento periódico. (Los estrógenos no producen cáncer, pero sí lo promueven —
mitogénico, no mutagénico.)

**Indicaciones de THM (estrógenos sistémicos):** tratamiento de SVM, tratamiento del SGM,
prevención de osteoporosis en mujeres de alto riesgo que no toleran medicamentos
preventivos estándar.

**Indicaciones de progestágenos (FDA):** amenorrea primaria/secundaria, fertilización
asistida, hiperplasia endometrial, sangrado uterino disfuncional.

**Ventana de oportunidad terapéutica:** la relación riesgo/beneficio de la THM es más
favorable en mujeres posmenopáusicas jóvenes que la inician antes de los 60 años o dentro
de los 10 años desde la menopausia. No existe una formulación ideal única — manejo
individualizado (tipo de estrógeno/progestina, dosis, vía).

> **Nota para Mindi:** este es el concepto de "ventana terapéutica" que el equipo decidió
> **no** comunicar en el producto por ahora, para evitar lenguaje de presión de tiempo. Queda
> documentado aquí para una v2 con más cuidado de redacción y revisión de un especialista.

**Contraindicaciones absolutas:**
- Sangrado vaginal sin explicación
- Disfunción o enfermedad hepática
- Historia de trombosis venosa profunda o embolia pulmonar
- Trastorno de coagulación conocido o trombofilia (la vía transdérmica puede ser una
  opción en algunas mujeres con riesgo elevado de trombosis venosa)
- Hipertensión no tratada
- Historia de cáncer de mama, endometrio u otra neoplasia estrogenodependiente
- Hipersensibilidad conocida a terapia hormonal
- Historia de Enfermedad Coronaria, ACV o AIT

(Requiere progestacional concomitante cuando el útero esté presente.)

**Contraindicaciones relativas:**
- Triglicéridos >400 mg/dL
- Enfermedad de la vesícula biliar (evitar estrógenos orales; el transdérmico puede ser
  opción)
- Riesgo elevado de cáncer de mama (riesgo a 5 años >5% por NCI o IBIS)

Estas contraindicaciones no aplican a estrógenos transvaginales (concentración sérica muy
baja) — recomendación de NAMS.

**Elección de la terapia hormonal:** primero distinguir contraindicaciones de vía oral, y
presencia o no de útero.

*Estrógenos orales (sin contraindicación):* valerato de estradiol 1 mg/día, 17-β-estradiol 1
mg/día, estrógenos conjugados 0.3-0.45 mg/día.

*Vía transdérmica (con contraindicación oral):* estradiol gel 0.5-1.5 mg/día, estradiol
aerosol 1.53 mg/día.

*Progestinas* (si hay útero): orales (progesterona micronizada 100mg continuo / 200mg
cíclico 10-14 días; drospirenona 2mg; didrogesterona 5mg; dienogest 2mg; MPA 5mg),
transdérmicas (levonorgestrel 10µg/día; noretisterona 250µg/día), endoceptiva
(levonorgestrel 20µg/24h).

*Combinaciones estrógeno+progestina continua:* 17-β-estradiol 1mg + drospirenona 2mg;
estradiol 1mg + didrogesterona 5mg; valerato de estradiol 1mg + dienogest 2mg.

*Tibolona:* 2.5 mg/día o 1.25 mg/día.

*Estrógeno equino conjugado + Bazedoxifeno:* para sensibilidad mamaria/densidad
mamaria/sangrado con THM convencional. Dosis: EC 0.45mg + BZA 20mg/día.

*Ospemifeno (SERM):* 60 mg/día, para síntomas genitourinarios en quienes prefieren vía oral.

*Andrógenos:* testosterona puede ayudar en desorden de interés sexual sin otra causa
demostrable; controlar acné, cambios de pelo, lípidos y función hepática. Riesgos CV y
mamarios a largo plazo desconocidos.

**6.4.2.2 Tratamiento no hormonal**

Fitoestrógenos (isoflavonas — las más estudiadas, reducen síntomas vasomotores),
vitamina E, clonidina, *Cimicifuga racemosa* (black cohosh), *Panax ginseng*, β-sitosterol +
glucosinolatos + citroflavonoides.

*Tratamientos alternativos* (sin estudios controlados): relajación, acupuntura,
reflexoterapia, magnetoterapia y otros.

#### 6.4.3 Efectos adversos o colaterales

Sangrado uterino anormal al inicio del tratamiento con estrógenos (descartar neoplasia).
Cáncer de mama como efecto a largo plazo — evaluar con mamografía anual.

#### 6.4.4 Signos de alarma

Principal riesgo de THM oral: enfermedad tromboembólica (el estrógeno transdérmico y la
tibolona oral muestran riesgo igual a controles sin THM). El riesgo de cáncer de endometrio
por estrógenos sin oposición se evita con cualquier progestágeno aprobado. La evidencia
disponible no muestra aumento del riesgo de cáncer de mama asociado a THM en general; el
primer análisis WHI sí mostró aumento con ECE+MPA tras 5 años (no con estrógenos solos).
Progesterona micronizada y dihidrogesterona no aumentan el riesgo.

#### 6.4.5 Criterios de alta

Estabilidad de síntomas, adecuada respuesta al tratamiento, evaluación de riesgos y
beneficios discutida con la paciente, seguimiento establecido, paciente educada, continuidad
de la atención asegurada.

#### 6.4.6 Pronóstico

La calidad de vida desde los 40 años depende del grado de educación en salud, hábitos
saludables, acceso a tratamiento, soporte social e información veraz y oportuna.

### 6.5 Complicaciones

Riesgo de trombosis (sobre todo vía oral), riesgo cardiovascular (especialmente >60 años o
con factores preexistentes), cáncer de mama (uso prolongado de THM combinada, riesgo
disminuye al suspender), cáncer de endometrio (estrógeno sin progesterona con útero
intacto), cambios en tejido mamario (mamografías más difíciles de interpretar), efectos
secundarios leves (sensibilidad mamaria, hinchazón, cambios de ánimo, cefalea, náuseas).

### 6.6 Criterios de referencia y contrarreferencia

El HNHU es centro de referencia nacional para patologías ginecológicas complejas, con
Unidad de Menopausia propia.

### 6.7 Fluxograma

Valoración clínica de la mujer en climaterio, según sea asintomática (sin factores de riesgo),
asintomática o con síntomas leves (con factores de riesgo), o sintomática (síntomas
molestos, con o sin factores de riesgo):

- **Asintomática, sin factores de riesgo →** prevención primaria: promoción de la salud
  (alimentación correcta, actividad física, autoexploración de mama) → prevención
  secundaria: detección oportuna.
- **Asintomática/leve, con factores de riesgo →** fomento primario + prevención secundaria
  (detección oportuna: citología vaginal, factores de riesgo cardiovascular, densitometría
  ósea, exploración de mama y mastografía) + prevención terciaria (limitación del daño).
  Detección positiva → referencia al médico para confirmar diagnóstico y/o continuar
  tratamiento. Detección negativa → repetir detecciones.
- **Sintomática →** ¿son intensos o afectan la calidad de vida?
  - **No →** promover medidas no farmacológicas (terapias alternativas, eliminación de
    estilos de vida no saludables). Disminución/eliminación de síntomas → repetir
    detecciones; si no → volver a promover medidas.
  - **Sí →** promover medidas no farmacológicas + inicio del tratamiento farmacológico.

---

## VII. Anexos

### Anexo 1 — Escala de puntuación en menopausia (MRS)

Cuestionario de autoevaluación. Para cada uno de los 11 grupos de síntomas, marcar una
casilla según intensidad: **0** No siente molesta, **1** Siente molesta leve, **2** Siente
molesta moderada, **3** Siente molesta importante, **4** Siente demasiado molesta.

| # | Síntoma |
|---|---|
| 1 | Bochornos, sudoración, calores |
| 2 | Molestias al corazón (sentir latidos del corazón, palpitaciones, opresión al pecho) |
| 3 | Molestias musculares y articulares (dolores de huesos y articulaciones, dolores reumáticos) |
| 4 | Dificultades en el sueño (insomnio, duerme poco) |
| 5 | Estado de ánimo depresivo (sentirse deprimida, decaída, triste a punto de llorar, sin ganas de vivir) |
| 6 | Irritabilidad (sentirse tensa, explota fácil, sentirse rabiosa, sentirse intolerante) |
| 7 | Ansiedad (sentirse angustiada, temerosa, inquieta, tendencia al pánico) |
| 8 | Cansancio físico y mental (rinde menos, se cansa fácil, olvidos frecuentes, mala memoria, le cuesta concentrarse) |
| 9 | Problemas sexuales (menos ganas de sexo, menor frecuencia de relaciones sexuales, menor satisfacción sexual) |
| 10 | Problemas con la orina (problemas al orinar, orina más veces, urgencia al orinar, se le escapa la orina) |
| 11 | Sequedad vaginal (sensación de genitales secos, malestar o ardor en los genitales, malestar o dolor con las relaciones sexuales) |

**Subescalas:** Somático (ítems 1-4) · Psicológico (ítems 5-8) · Urogenital (ítems 9-11) ·
Total (ítems 1-11).

> Esta es exactamente la escala usada en `src/main.js` (`MRS_ITEMS`), con la redacción
> oficial del Anexo 1, sin recortes ni reordenamiento.

### Anexo 2 — Evaluación de experto

Observaciones del Dr. Richard F. Corzo Argüelles (Ginecólogo-Obstetra, CMP 38130 / RNE
21551, Hospital II Ramón Castilla — Red Asistencial Almenara, EsSalud):

- El trastorno del sueño es muy frecuente y repercute en el ánimo, trabajo y familia; las
  benzodiacepinas pueden llevar a uso crónico — considerar melatonina como alternativa
  sin dependencia.
- En pacientes con síntomas mínimos alrededor de los 40 años (etapa -3), la prueba
  diagnóstica de elección sería la HAM (requiere infraestructura, costo privado alto).
- La sintomatología urinaria más frecuente es la urgencia — debería contemplarse
  evaluación previa por urología antes de medicar.
- Si se usa tratamiento no hormonal con fitoestrógenos, debería especificarse dosis
  terapéutica, tiempo de uso y efectividad.
- La obesidad mórbida podría considerarse contraindicación relativa para THM.
- Debería considerarse medicación antiresortiva (bifosfonatos) junto a calcio y vitamina D
  en la prevención de osteoporosis.

### IX. Referencias bibliográficas (48 referencias)

Incluye, entre otras: Baber/Panay/Fenton — IMS Recommendations 2016 (Climacteric);
Harlow et al. — STRAW+10 Executive Summary (Climacteric/Fertil Steril/JCEM/Menopause
2012); Avis et al. — Duration of menopausal vasomotor symptoms (JAMA Intern Med 2015);
ACOG Practice Bulletin No. 141 (2014); NAMS 2017 Hormone Therapy Position Statement
(Menopause); NAMS 2013 vulvovaginal atrophy position statement; Soares — Mood disorders
in midlife women (Menopause 2014); Rojas et al. — Atención del Climaterio y Menopausia en
la Mujer Peruana (Diagnóstico 2013); Recomendaciones para el Manejo de la Paciente en
Etapa de Climaterio y Menopausia, Sociedad Peruana del Climaterio (2020); Heinemann et
al. — The Menopause Rating Scale (MRS): a methodological review (Health Qual Life
Outcomes 2004); Speroff's Clinical Gynecologic Endocrinology and Infertility (9th ed., 2020).
Lista completa de 48 referencias en el documento original.

---

*Documento convertido a Markdown a partir de la Resolución Directoral N°
211-2024-DG/HNHU y su anexo "Guía Técnica: Guía de Práctica Clínica para Diagnóstico y
Tratamiento del Climaterio" — Hospital Nacional Hipólito Unanue, 2024. Transcrito para uso
interno del proyecto Mindi; ante cualquier duda, remitirse al PDF oficial del hospital.*
