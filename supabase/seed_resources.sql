-- =============================================================================
-- PsicoApp — Semilla Estandarizada de Recursos de Salud Mental
-- Archivo: supabase/seed_resources.sql
--
-- Instrucciones:
--   Copia y ejecuta este script directamente en el SQL Editor de Supabase.
--   Reemplaza y actualiza todos los artículos de `public.resources` con una
--   estructura visual y clínica 100% homogénea en las 5 categorías:
--   (Ansiedad, Descanso y Sueño, Mindfulness, Bienestar Emocional, Gestión del Estrés)
--
--   Estructura interna de cada artículo:
--     1. Callout superior (`summary`): Resumen introductorio.
--     2. Párrafo clínico: Contexto breve de 1 a 2 líneas.
--     3. Bloque de tarjetas: 4 pautas prácticas numeradas (`1. **Título clave:** Explicación`).
--     4. Nota de cierre: Párrafo final con recomendación terapéutica (`**Nota clínica:** ...`).
-- =============================================================================

BEGIN;

-- Limpia registros previos desalineados para garantizar que toda la colección sea uniforme
DELETE FROM public.resources;

INSERT INTO public.resources (
  id,
  title,
  category,
  reading_time_minutes,
  reading_time,
  summary,
  content,
  created_at,
  updated_at,
  version
)
VALUES
  (
    'res-001',
    'Manejo de la ansiedad en la vida cotidiana',
    'Ansiedad',
    5,
    '5 min de lectura',
    'Estrategias prácticas basadas en terapia cognitivo-conductual para identificar detonantes tempranos y reducir la activación fisiológica mediante ejercicios de anclaje.',
    $$La **ansiedad** es una respuesta adaptativa de alerta ante posibles amenazas, pero cuando se activa de forma intensa sin un peligro inmediato genera desgaste físico y mental.

1. **Identifica las señales tempranas:** Presta atención a cambios físicos como tensión muscular, respiración superficial o aceleración cardíaca; nombrar lo que sientes disminuye la reactividad emocional.
2. **Aplica el anclaje sensorial 5-4-3-2-1:** Observa 5 objetos a tu alrededor, identifica 4 texturas que puedas tocar, escucha 3 sonidos distintos, reconoce 2 aromas y percibe 1 sabor para volver al presente.
3. **Regula el ritmo respiratorio:** Realiza inhalaciones lentas por la nariz llevando el aire hacia el abdomen y exhala suavemente por la boca duplicando el tiempo de salida del aire.
4. **Cuestiona la anticipación catastrófica:** Pregúntate qué evidencia objetiva existe a favor de ese pensamiento y cuál sería una interpretación más equilibrada y realista de la situación.

**Nota clínica:** Practicar estas pautas en momentos de calma fortalece tu capacidad de autorregulación ante episodios agudos; si la ansiedad persiste o limita tus actividades diarias, acompáñate de seguimiento psicoterapéutico.$$,
    '2026-09-15T10:00:00.000Z',
    '2026-11-06T12:25:00.000Z',
    1
  ),
  (
    'res-002',
    'Higiene del sueño: guía para un descanso reparador',
    'Descanso y Sueño',
    6,
    '6 min de lectura',
    'Hábitos diurnos y nocturnos para sincronizar tu reloj biológico, conciliar el sueño con mayor facilidad y lograr un descanso profundo.',
    $$El **sueño reparador** es un pilar biológico indispensable para la consolidación de la memoria, la regulación emocional y la restauración del sistema nervioso.

1. **Mantén horarios fijos de sueño y vigilia:** Procura acostarte y levantarte a la misma hora todos los días, incluyendo los fines de semana, para estabilizar tu ritmo circadiano.
2. **Desconexión digital 60 minutos antes:** La luz azul de teléfonos y monitores inhibe la secreción natural de melatonina; sustituye las pantallas por lectura impresa o música tranquila.
3. **Acondiciona tu entorno de descanso:** Conserva la habitación fresca, oscura y silenciosa, reservando la cama exclusivamente para dormir y evitando trabajar o comer en ella.
4. **Limita estimulantes por la tarde:** Evita el consumo de cafeína, bebidas energéticas, nicotina y comidas copiosas durante las 6 horas previas a irte a dormir.

**Nota clínica:** Si tras 20 minutos en la cama no logras conciliar el sueño, levántate y realiza una actividad tranquila con luz tenue hasta sentir somnolencia nuevamente, evitando mirar el reloj.$$,
    '2026-09-18T12:00:00.000Z',
    '2026-11-06T12:25:00.000Z',
    1
  ),
  (
    'res-003',
    'Técnicas de respiración diafragmática (4-7-8)',
    'Mindfulness',
    4,
    '4 min de lectura',
    'Guía paso a paso para activar el sistema nervioso parasimpático mediante la respiración consciente y disminuir picos de tensión aguda.',
    $$La **respiración diafragmática** estimula el nervio vago y activa el sistema nervioso parasimpático, enviando al cerebro una señal fisiológica inmediata de seguridad y calma.

1. **Postura cómoda:** Siéntate con la espalda recta y los hombros relajados, colocando una mano sobre tu pecho y otra sobre el abdomen para percibir la expansión del diafragma.
2. **Inhala en 4 segundos:** Toma aire suavemente por la nariz contando mentalmente hasta 4, procurando que se eleve la mano ubicada en tu abdomen mientras el pecho permanece estable.
3. **Retén durante 7 segundos:** Mantén una pausa respiratoria contando hasta 7 sin apretar la mandíbula ni generar tensión en el cuello o los hombros.
4. **Exhala en 8 segundos:** Suelta todo el aire lentamente por la boca entreabierta durante 8 segundos continuos y repite el ciclo completo 4 veces seguidas.

**Nota clínica:** Si al inicio los tiempos te resultan extensos, conserva la misma proporción reduciendo los segundos (por ejemplo, 2-3-4) y realiza una pausa si experimentas mareo leve.$$,
    '2026-09-22T09:30:00.000Z',
    '2026-11-06T12:25:00.000Z',
    1
  ),
  (
    'res-004',
    'Regulación emocional y práctica de la autocompasión',
    'Bienestar Emocional',
    6,
    '6 min de lectura',
    'Cómo relacionarte con tus emociones difíciles sin juzgarte y construir un diálogo interno más constructivo para fortalecer tu resiliencia.',
    $$La **regulación emocional** no consiste en suprimir lo que sentimos, sino en comprender el mensaje adaptativo de cada emoción y responder con cuidado hacia nosotros mismos.

1. **Pausa y nombra la emoción:** Detente unos segundos ante el malestar e identifica con precisión qué sientes (tristeza, frustración, miedo o cansancio) y en qué zona del cuerpo se manifiesta.
2. **Valida tu experiencia sin juicio:** Recuerda que todas las emociones cumplen una función informativa; sustituye la autocrítica por aceptación comprensiva del momento que atraviesas.
3. **Transforma tu diálogo interno:** Detecta expresiones absolutas como "siempre fallo" o "nunca podré" y reformúlalas con la misma empatía que brindarías a un buen amigo.
4. **Ejecuta un gesto de autocuidado:** Pregúntate qué necesitas en este instante para apoyarte y realiza una acción concreta como hidratarte, descansar o pedir ayuda.

**Nota clínica:** Practicar la autocompasión reduce los niveles de cortisol y fortalece la motivación intrínseca; llevar un breve registro emocional entre sesiones facilita identificar patrones recurrentes.$$,
    '2026-10-01T14:15:00.000Z',
    '2026-11-06T12:25:00.000Z',
    1
  ),
  (
    'res-005',
    'Prevención del agotamiento laboral (Burnout) y límites saludables',
    'Gestión del Estrés',
    6,
    '6 min de lectura',
    'Pautas clínicas para detectar el síndrome de desgaste profesional a tiempo y establecer límites claros entre la vida laboral y personal.',
    $$El **síndrome de agotamiento o burnout** surge por estrés laboral crónico no gestionado, manifestándose con fatiga persistente, distanciamiento mental y sensación de baja eficacia.

1. **Reconoce las señales de sobrecarga:** Identifica indicadores tempranos como cansancio al despertar, irritabilidad constante, dificultad para concentrarte o sensación de que ninguna pausa basta.
2. **Define rituales de cierre de jornada:** Establece una hora límite para revisar mensajes de trabajo y realiza una transición clara como apagar el equipo o dar una caminata breve.
3. **Comunica límites con asertividad:** Negocia plazos y expresa tu disponibilidad real mediante frases claras y respetuosas sobre tu carga actual de actividades.
4. **Agenda espacios de recuperación:** Incorpora en tu calendario actividades recreativas, movimiento físico y descanso con la misma prioridad que asignas a tus compromisos laborales.

**Nota clínica:** Establecer límites no es falta de compromiso, sino la condición indispensable para sostener tu salud mental a largo plazo; aborda en consulta si sientes culpa frecuente al descansar.$$,
    '2026-10-08T11:00:00.000Z',
    '2026-11-06T12:25:00.000Z',
    1
  ),
  (
    'res-006',
    'Reestructuración cognitiva: cómo cuestionar pensamientos intrusivos',
    'Ansiedad',
    5,
    '5 min de lectura',
    'Método estructurado para identificar distorsiones cognitivas y reemplazar pensamientos automáticos negativos por evaluaciones objetivas.',
    $$Nuestros **pensamientos automáticos** influyen directamente en nuestras emociones; con frecuencia interpretamos la realidad mediante distorsiones cognitivas que amplifican el malestar.

1. **Registra el pensamiento automático:** Anota brevemente la situación detonante y la frase exacta que cruzó por tu mente en el momento en que surgió la incomodidad.
2. **Identifica la distorsión cognitiva:** Observa si estás aplicando un filtro de todo o nada, adivinando el futuro sin pruebas o magnificando un error menor por encima de tus logros.
3. **Contrasta con la evidencia real:** Escribe qué hechos comprobables respaldan ese pensamiento y qué experiencias previas demuestran tu capacidad para afrontar situaciones similares.
4. **Formula un pensamiento alternativo:** Redacta una interpretación balanceada, realista y funcional que disminuya la rumiación y te permita actuar con serenidad.

**Nota clínica:** La reestructuración cognitiva es una habilidad que se consolida con la práctica escrita; compartir tus registros en sesión permite trabajar tus esquemas de pensamiento con mayor profundidad.$$,
    '2026-10-14T16:20:00.000Z',
    '2026-11-06T12:25:00.000Z',
    1
  ),
  (
    'res-007',
    'Escaneo corporal progresivo para liberar tensión física',
    'Mindfulness',
    5,
    '5 min de lectura',
    'Ejercicio guiado de atención plena corporal para detectar contracturas inconscientes y promover la relajación neuromuscular al finalizar el día.',
    $$El cuerpo suele acumular **tensión muscular** en mandíbula, hombros y espalda antes de que notemos el estrés conscientemente; el escaneo corporal entrena la escucha interna y relaja el organismo.

1. **Prepara un espacio tranquilo:** Recuéstate o siéntate cómodamente durante 10 minutos, cierra suavemente los ojos y realiza tres respiraciones lentas para centrar tu atención.
2. **Recorre pies y piernas con atención:** Dirige tu foco hacia los pies, tobillos y pantorrillas, notando sensaciones de temperatura, peso o rigidez y permitiendo que se suavicen al exhalar.
3. **Explora abdomen, pecho y espalda:** Percibe el movimiento natural de tu respiración en el torso y suelta conscientemente la tensión acumulada en la zona lumbar y los omóplatos.
4. **Suaviza cuello, hombros y rostro:** Libera la presión dental, relaja el entrecejo y deja caer el peso de los hombros antes de abrir los ojos lentamente.

**Nota clínica:** Si tu mente se distrae con pendientes durante el recorrido, obsérvalo con amabilidad y regresa tu atención a la zona corporal donde estabas; ese retorno consciente fortalece tu atención plena.$$,
    '2026-10-20T09:00:00.000Z',
    '2026-11-06T12:25:00.000Z',
    1
  ),
  (
    'res-008',
    'Organización mental y pausa activa ante la sobrecarga diaria',
    'Gestión del Estrés',
    5,
    '5 min de lectura',
    'Estrategias de descarga cognitiva y priorización consciente para recuperar la claridad mental y reducir la fatiga de decisión.',
    $$La **sobrecarga cognitiva** ocurre al retener múltiples pendientes simultáneos en la memoria de trabajo, generando bloqueo y urgencia constante; exteriorizar y priorizar devuelve el control.

1. **Realiza un vaciado mental en papel:** Escribe todas las tareas, ideas y preocupaciones pendientes en una lista externa para liberar espacio inmediato en tu memoria operativa.
2. **Elige tres prioridades esenciales:** Clasifica tus actividades por impacto real y selecciona únicamente tres objetivos principales para resolver durante el día de hoy.
3. **Trabaja por bloques de enfoque único:** Dedica periodos de 25 a 45 minutos a una sola tarea con notificaciones silenciadas, evitando la multitarea que incrementa el agotamiento cerebral.
4. **Integra micropausas regenerativas:** Al concluir cada bloque, levántate durante 5 minutos para hidratarte, descansar la vista mirando a lo lejos y estirar cuello y muñecas.

**Nota clínica:** Evaluar tu día por el cuidado de tu energía y no solo por el volumen de tareas completadas previene la saturación mental y protege tu estabilidad emocional.$$,
    '2026-10-28T13:45:00.000Z',
    '2026-11-06T12:25:00.000Z',
    1
  )
ON CONFLICT (id) DO UPDATE
SET
  title                = EXCLUDED.title,
  category             = EXCLUDED.category,
  reading_time_minutes = EXCLUDED.reading_time_minutes,
  reading_time         = EXCLUDED.reading_time,
  summary              = EXCLUDED.summary,
  content              = EXCLUDED.content,
  updated_at           = NOW();

COMMIT;
