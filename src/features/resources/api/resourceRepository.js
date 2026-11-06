import { storageService } from '../../../core/services/index.js';

const COLLECTION = 'resources';

/**
 * Semilla estandarizada de 8 artículos y guías psicoeducativas de salud mental.
 * Mantiene paridad exacta con `supabase/seed_resources.sql`:
 * - Callout superior (`summary`): Resumen introductorio
 * - Párrafo clínico: Contexto breve de 1 a 2 líneas
 * - Bloque de tarjetas: 4 pautas prácticas numeradas (`1. **Título clave:** Explicación`)
 * - Nota de cierre (`**Nota clínica:** ...`)
 */
export const DEFAULT_RESOURCES = Object.freeze([
  {
    id: 'res-001',
    title: 'Manejo de la ansiedad en la vida cotidiana',
    category: 'Ansiedad',
    readingTimeMinutes: 5,
    readingTime: '5 min de lectura',
    summary:
      'Estrategias prácticas basadas en terapia cognitivo-conductual para identificar detonantes tempranos y reducir la activación fisiológica mediante ejercicios de anclaje.',
    content: [
      'La **ansiedad** es una respuesta adaptativa de alerta ante posibles amenazas, pero cuando se activa de forma intensa sin un peligro inmediato genera desgaste físico y mental.',
      [
        '1. **Identifica las señales tempranas:** Presta atención a cambios físicos como tensión muscular, respiración superficial o aceleración cardíaca; nombrar lo que sientes disminuye la reactividad emocional.',
        '2. **Aplica el anclaje sensorial 5-4-3-2-1:** Observa 5 objetos a tu alrededor, identifica 4 texturas que puedas tocar, escucha 3 sonidos distintos, reconoce 2 aromas y percibe 1 sabor para volver al presente.',
        '3. **Regula el ritmo respiratorio:** Realiza inhalaciones lentas por la nariz llevando el aire hacia el abdomen y exhala suavemente por la boca duplicando el tiempo de salida del aire.',
        '4. **Cuestiona la anticipación catastrófica:** Pregúntate qué evidencia objetiva existe a favor de ese pensamiento y cuál sería una interpretación más equilibrada y realista de la situación.',
      ].join('\n'),
      '**Nota clínica:** Practicar estas pautas en momentos de calma fortalece tu capacidad de autorregulación ante episodios agudos; si la ansiedad persiste o limita tus actividades diarias, acompáñate de seguimiento psicoterapéutico.',
    ].join('\n\n'),
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-11-06T12:25:00.000Z',
    version: 1,
  },
  {
    id: 'res-002',
    title: 'Higiene del sueño: guía para un descanso reparador',
    category: 'Descanso y Sueño',
    readingTimeMinutes: 6,
    readingTime: '6 min de lectura',
    summary:
      'Hábitos diurnos y nocturnos para sincronizar tu reloj biológico, conciliar el sueño con mayor facilidad y lograr un descanso profundo.',
    content: [
      'El **sueño reparador** es un pilar biológico indispensable para la consolidación de la memoria, la regulación emocional y la restauración del sistema nervioso.',
      [
        '1. **Mantén horarios fijos de sueño y vigilia:** Procura acostarte y levantarte a la misma hora todos los días, incluyendo los fines de semana, para estabilizar tu ritmo circadiano.',
        '2. **Desconexión digital 60 minutos antes:** La luz azul de teléfonos y monitores inhibe la secreción natural de melatonina; sustituye las pantallas por lectura impresa o música tranquila.',
        '3. **Acondiciona tu entorno de descanso:** Conserva la habitación fresca, oscura y silenciosa, reservando la cama exclusivamente para dormir y evitando trabajar o comer en ella.',
        '4. **Limita estimulantes por la tarde:** Evita el consumo de cafeína, bebidas energéticas, nicotina y comidas copiosas durante las 6 horas previas a irte a dormir.',
      ].join('\n'),
      '**Nota clínica:** Si tras 20 minutos en la cama no logras conciliar el sueño, levántate y realiza una actividad tranquila con luz tenue hasta sentir somnolencia nuevamente, evitando mirar el reloj.',
    ].join('\n\n'),
    createdAt: '2026-09-18T12:00:00.000Z',
    updatedAt: '2026-11-06T12:25:00.000Z',
    version: 1,
  },
  {
    id: 'res-003',
    title: 'Técnicas de respiración diafragmática (4-7-8)',
    category: 'Mindfulness',
    readingTimeMinutes: 4,
    readingTime: '4 min de lectura',
    summary:
      'Guía paso a paso para activar el sistema nervioso parasimpático mediante la respiración consciente y disminuir picos de tensión aguda.',
    content: [
      'La **respiración diafragmática** estimula el nervio vago y activa el sistema nervioso parasimpático, enviando al cerebro una señal fisiológica inmediata de seguridad y calma.',
      [
        '1. **Postura cómoda:** Siéntate con la espalda recta y los hombros relajados, colocando una mano sobre tu pecho y otra sobre el abdomen para percibir la expansión del diafragma.',
        '2. **Inhala en 4 segundos:** Toma aire suavemente por la nariz contando mentalmente hasta 4, procurando que se eleve la mano ubicada en tu abdomen mientras el pecho permanece estable.',
        '3. **Retén durante 7 segundos:** Mantén una pausa respiratoria contando hasta 7 sin apretar la mandíbula ni generar tensión en el cuello o los hombros.',
        '4. **Exhala en 8 segundos:** Suelta todo el aire lentamente por la boca entreabierta durante 8 segundos continuos y repite el ciclo completo 4 veces seguidas.',
      ].join('\n'),
      '**Nota clínica:** Si al inicio los tiempos te resultan extensos, conserva la misma proporción reduciendo los segundos (por ejemplo, 2-3-4) y realiza una pausa si experimentas mareo leve.',
    ].join('\n\n'),
    createdAt: '2026-09-22T09:30:00.000Z',
    updatedAt: '2026-11-06T12:25:00.000Z',
    version: 1,
  },
  {
    id: 'res-004',
    title: 'Regulación emocional y práctica de la autocompasión',
    category: 'Bienestar Emocional',
    readingTimeMinutes: 6,
    readingTime: '6 min de lectura',
    summary:
      'Cómo relacionarte con tus emociones difíciles sin juzgarte y construir un diálogo interno más constructivo para fortalecer tu resiliencia.',
    content: [
      'La **regulación emocional** no consiste en suprimir lo que sentimos, sino en comprender el mensaje adaptativo de cada emoción y responder con cuidado hacia nosotros mismos.',
      [
        '1. **Pausa y nombra la emoción:** Detente unos segundos ante el malestar e identifica con precisión qué sientes (tristeza, frustración, miedo o cansancio) y en qué zona del cuerpo se manifiesta.',
        '2. **Valida tu experiencia sin juicio:** Recuerda que todas las emociones cumplen una función informativa; sustituye la autocrítica por aceptación comprensiva del momento que atraviesas.',
        '3. **Transforma tu diálogo interno:** Detecta expresiones absolutas como "siempre fallo" o "nunca podré" y reformúlalas con la misma empatía que brindarías a un buen amigo.',
        '4. **Ejecuta un gesto de autocuidado:** Pregúntate qué necesitas en este instante para apoyarte y realiza una acción concreta como hidratarte, descansar o pedir ayuda.',
      ].join('\n'),
      '**Nota clínica:** Practicar la autocompasión reduce los niveles de cortisol y fortalece la motivación intrínseca; llevar un breve registro emocional entre sesiones facilita identificar patrones recurrentes.',
    ].join('\n\n'),
    createdAt: '2026-10-01T14:15:00.000Z',
    updatedAt: '2026-11-06T12:25:00.000Z',
    version: 1,
  },
  {
    id: 'res-005',
    title: 'Prevención del agotamiento laboral (Burnout) y límites saludables',
    'category': 'Gestión del Estrés',
    readingTimeMinutes: 6,
    readingTime: '6 min de lectura',
    summary:
      'Pautas clínicas para detectar el síndrome de desgaste profesional a tiempo y establecer límites claros entre la vida laboral y personal.',
    content: [
      'El **síndrome de agotamiento o burnout** surge por estrés laboral crónico no gestionado, manifestándose con fatiga persistente, distanciamiento mental y sensación de baja eficacia.',
      [
        '1. **Reconoce las señales de sobrecarga:** Identifica indicadores tempranos como cansancio al despertar, irritabilidad constante, dificultad para concentrarte o sensación de que ninguna pausa basta.',
        '2. **Define rituales de cierre de jornada:** Establece una hora límite para revisar mensajes de trabajo y realiza una transición clara como apagar el equipo o dar una caminata breve.',
        '3. **Comunica límites con asertividad:** Negocia plazos y expresa tu disponibilidad real mediante frases claras y respetuosas sobre tu carga actual de actividades.',
        '4. **Agenda espacios de recuperación:** Incorpora en tu calendario actividades recreativas, movimiento físico y descanso con la misma prioridad que asignas a tus compromisos laborales.',
      ].join('\n'),
      '**Nota clínica:** Establecer límites no es falta de compromiso, sino la condición indispensable para sostener tu salud mental a largo plazo; aborda en consulta si sientes culpa frecuente al descansar.',
    ].join('\n\n'),
    createdAt: '2026-10-08T11:00:00.000Z',
    updatedAt: '2026-11-06T12:25:00.000Z',
    version: 1,
  },
  {
    id: 'res-006',
    title: 'Reestructuración cognitiva: cómo cuestionar pensamientos intrusivos',
    category: 'Ansiedad',
    readingTimeMinutes: 5,
    readingTime: '5 min de lectura',
    summary:
      'Método estructurado para identificar distorsiones cognitivas y reemplazar pensamientos automáticos negativos por evaluaciones objetivas.',
    content: [
      'Nuestros **pensamientos automáticos** influyen directamente en nuestras emociones; con frecuencia interpretamos la realidad mediante distorsiones cognitivas que amplifican el malestar.',
      [
        '1. **Registra el pensamiento automático:** Anota brevemente la situación detonante y la frase exacta que cruzó por tu mente en el momento en que surgió la incomodidad.',
        '2. **Identifica la distorsión cognitiva:** Observa si estás aplicando un filtro de todo o nada, adivinando el futuro sin pruebas o magnificando un error menor por encima de tus logros.',
        '3. **Contrasta con la evidencia real:** Escribe qué hechos comprobables respaldan ese pensamiento y qué experiencias previas demuestran tu capacidad para afrontar situaciones similares.',
        '4. **Formula un pensamiento alternativo:** Redacta una interpretación balanceada, realista y funcional que disminuya la rumiación y te permita actuar con serenidad.',
      ].join('\n'),
      '**Nota clínica:** La reestructuración cognitiva es una habilidad que se consolida con la práctica escrita; compartir tus registros en sesión permite trabajar tus esquemas de pensamiento con mayor profundidad.',
    ].join('\n\n'),
    createdAt: '2026-10-14T16:20:00.000Z',
    updatedAt: '2026-11-06T12:25:00.000Z',
    version: 1,
  },
  {
    id: 'res-007',
    title: 'Escaneo corporal progresivo para liberar tensión física',
    category: 'Mindfulness',
    readingTimeMinutes: 5,
    readingTime: '5 min de lectura',
    summary:
      'Ejercicio guiado de atención plena corporal para detectar contracturas inconscientes y promover la relajación neuromuscular al finalizar el día.',
    content: [
      'El cuerpo suele acumular **tensión muscular** en mandíbula, hombros y espalda antes de que notemos el estrés conscientemente; el escaneo corporal entrena la escucha interna y relaja el organismo.',
      [
        '1. **Prepara un espacio tranquilo:** Recuéstate o siéntate cómodamente durante 10 minutos, cierra suavemente los ojos y realiza tres respiraciones lentas para centrar tu atención.',
        '2. **Recorre pies y piernas con atención:** Dirige tu foco hacia los pies, tobillos y pantorrillas, notando sensaciones de temperatura, peso o rigidez y permitiendo que se suavicen al exhalar.',
        '3. **Explora abdomen, pecho y espalda:** Percibe el movimiento natural de tu respiración en el torso y suelta conscientemente la tensión acumulada en la zona lumbar y los omóplatos.',
        '4. **Suaviza cuello, hombros y rostro:** Libera la presión dental, relaja el entrecejo y deja caer el peso de los hombros antes de abrir los ojos lentamente.',
      ].join('\n'),
      '**Nota clínica:** Si tu mente se distrae con pendientes durante el recorrido, obsérvalo con amabilidad y regresa tu atención a la zona corporal donde estabas; ese retorno consciente fortalece tu atención plena.',
    ].join('\n\n'),
    createdAt: '2026-10-20T09:00:00.000Z',
    updatedAt: '2026-11-06T12:25:00.000Z',
    version: 1,
  },
  {
    id: 'res-008',
    title: 'Organización mental y pausa activa ante la sobrecarga diaria',
    category: 'Gestión del Estrés',
    readingTimeMinutes: 5,
    readingTime: '5 min de lectura',
    summary:
      'Estrategias de descarga cognitiva y priorización consciente para recuperar la claridad mental y reducir la fatiga de decisión.',
    content: [
      'La **sobrecarga cognitiva** ocurre al retener múltiples pendientes simultáneos en la memoria de trabajo, generando bloqueo y urgencia constante; exteriorizar y priorizar devuelve el control.',
      [
        '1. **Realiza un vaciado mental en papel:** Escribe todas las tareas, ideas y preocupaciones pendientes en una lista externa para liberar espacio inmediato en tu memoria operativa.',
        '2. **Elige tres prioridades esenciales:** Clasifica tus actividades por impacto real y selecciona únicamente tres objetivos principales para resolver durante el día de hoy.',
        '3. **Trabaja por bloques de enfoque único:** Dedica periodos de 25 a 45 minutos a una sola tarea con notificaciones silenciadas, evitando la multitarea que incrementa el agotamiento cerebral.',
        '4. **Integra micropausas regenerativas:** Al concluir cada bloque, levántate durante 5 minutos para hidratarte, descansar la vista mirando a lo lejos y estirar cuello y muñecas.',
      ].join('\n'),
      '**Nota clínica:** Evaluar tu día por el cuidado de tu energía y no solo por el volumen de tareas completadas previene la saturación mental y protege tu estabilidad emocional.',
    ].join('\n\n'),
    createdAt: '2026-10-28T13:45:00.000Z',
    updatedAt: '2026-11-06T12:25:00.000Z',
    version: 1,
  },
]);

let seededPromise = null;

function ensureResourcesSeeded() {
  if (!seededPromise) {
    seededPromise = storageService.seed({ [COLLECTION]: DEFAULT_RESOURCES });
  }
  return seededPromise;
}

export const resourceRepository = {
  /**
   * Lista los artículos y guías de salud mental con filtrado opcional por categoría o texto.
   * @param {{ category?: string, query?: string, signal?: AbortSignal }} [options]
   */
  async getAll({ category, query, signal } = {}) {
    await ensureResourcesSeeded();

    const result = await storageService.list(COLLECTION, { signal });
    const list = Array.isArray(result) ? result : (result?.items || []);

    const normalizedQuery = (query ?? '').trim().toLowerCase();

    return list.filter((item) => {
      if (category && item.category !== category) return false;
      if (normalizedQuery) {
        const haystack = `${item.title} ${item.category} ${item.summary} ${item.content}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  },

  /**
   * Obtiene un artículo educativo por su ID.
   * @param {string} id
   * @param {{ signal?: AbortSignal }} [options]
   */
  async getById(id, { signal } = {}) {
    await ensureResourcesSeeded();
    return await storageService.getById(COLLECTION, id, { signal });
  },

  /**
   * Devuelve la lista de categorías disponibles.
   * @returns {string[]}
   */
  getCategories() {
    return Array.from(new Set(DEFAULT_RESOURCES.map((item) => item.category)));
  },
};
