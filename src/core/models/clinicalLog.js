import { MEDIA_TYPE } from './enums.js';
import { generateId } from '../utils/id.js';
import {
  buildResult,
  isHttpUrl,
  isImageDataUrl,
  isNonEmptyString,
  isOneOf,
  isValidISODate,
} from './validation.js';

export const CLINICAL_LOG_RULES = Object.freeze({
  MAX_TITLE_LENGTH: 120,
  MAX_CONTENT_LENGTH: 20_000,
  MAX_MEDIA_ITEMS: 10,
  MAX_TAGS: 15,
  MAX_CAPTION_LENGTH: 140,
  /** Tamaño máximo (caracteres) de una imagen embebida como data URL (~500 KB). */
  MAX_INLINE_IMAGE_LENGTH: 700_000,
});

/**
 * Adjunto multimedia.
 * - Imágenes: URL http/https o data URL comprimida (imagen local "subida").
 * - Videos: siempre por enlace http/https (YouTube, Vimeo o archivo directo).
 * @typedef {Object} MediaAttachment
 * @property {string} id
 * @property {import('./enums.js').MediaType} type
 * @property {string} url
 * @property {string} caption      Descripción breve / texto alternativo.
 */

/**
 * @typedef {Object} ClinicalLogDraft
 * @property {string} patientId
 * @property {string | null} appointmentId   Sesión asociada (opcional).
 * @property {string} authorId               Psicóloga autora de la nota.
 * @property {string} sessionDate            Fecha ISO de la sesión.
 * @property {string} title
 * @property {string} content                Nota clínica en texto plano.
 * @property {MediaAttachment[]} media
 * @property {string[]} tags                 Etiquetas normalizadas (minúsculas, sin duplicados).
 */

/** @typedef {import('./entity.js').BaseEntity & ClinicalLogDraft} ClinicalLog */

/**
 * @param {{ type: import('./enums.js').MediaType, url: string, caption?: string }} input
 * @returns {MediaAttachment}
 */
export function createMediaAttachment({ type, url, caption = '' }) {
  return { id: generateId('med', 6), type, url: url.trim(), caption: caption.trim() };
}

/**
 * @param {Partial<ClinicalLogDraft>} input
 * @returns {ClinicalLogDraft}
 */
export function createClinicalLogDraft(input = {}) {
  return {
    patientId: input.patientId ?? '',
    appointmentId: input.appointmentId ?? null,
    authorId: input.authorId ?? '',
    sessionDate: input.sessionDate ?? new Date().toISOString(),
    title: (input.title ?? '').trim(),
    content: (input.content ?? '').trim(),
    media: input.media ?? [],
    tags: [...new Set((input.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))],
  };
}

/**
 * @param {Partial<MediaAttachment>} media
 * @returns {string | null} Mensaje de error o null si es válido.
 */
export function validateMediaAttachment(media) {
  const { MAX_CAPTION_LENGTH, MAX_INLINE_IMAGE_LENGTH } = CLINICAL_LOG_RULES;

  if (!isOneOf(media.type, MEDIA_TYPE)) return 'Tipo de archivo no soportado.';

  if (media.type === MEDIA_TYPE.IMAGE && isImageDataUrl(media.url)) {
    if (media.url.length > MAX_INLINE_IMAGE_LENGTH) return 'La imagen es demasiado pesada.';
  } else if (!isHttpUrl(media.url)) {
    return 'La URL del recurso no es válida (debe ser http/https).';
  }

  if ((media.caption ?? '').length > MAX_CAPTION_LENGTH) {
    return `La descripción no puede superar ${MAX_CAPTION_LENGTH} caracteres.`;
  }
  return null;
}

/**
 * @param {Partial<ClinicalLog>} log
 * @returns {import('./validation.js').ValidationResult}
 */
export function validateClinicalLog(log) {
  const errors = {};
  const { MAX_TITLE_LENGTH, MAX_CONTENT_LENGTH, MAX_MEDIA_ITEMS, MAX_TAGS } = CLINICAL_LOG_RULES;

  if (!isNonEmptyString(log.patientId)) errors.patientId = 'El paciente es obligatorio.';
  if (!isNonEmptyString(log.authorId)) errors.authorId = 'El autor es obligatorio.';
  if (!isValidISODate(log.sessionDate)) errors.sessionDate = 'La fecha de sesión no es válida.';

  if (!isNonEmptyString(log.title)) errors.title = 'El título es obligatorio.';
  else if (log.title.length > MAX_TITLE_LENGTH) errors.title = `Máximo ${MAX_TITLE_LENGTH} caracteres.`;

  const hasMedia = Array.isArray(log.media) && log.media.length > 0;
  if (!isNonEmptyString(log.content) && !hasMedia) {
    errors.content = 'La entrada debe tener texto o al menos un recurso multimedia.';
  } else if ((log.content ?? '').length > MAX_CONTENT_LENGTH) {
    errors.content = `Máximo ${MAX_CONTENT_LENGTH} caracteres.`;
  }

  if (!Array.isArray(log.media)) {
    errors.media = 'Formato de adjuntos inválido.';
  } else if (log.media.length > MAX_MEDIA_ITEMS) {
    errors.media = `Máximo ${MAX_MEDIA_ITEMS} adjuntos por entrada.`;
  } else {
    log.media.forEach((item, index) => {
      const error = validateMediaAttachment(item);
      if (error) errors[`media.${index}`] = error;
    });
  }

  if (!Array.isArray(log.tags) || log.tags.length > MAX_TAGS) {
    errors.tags = `Máximo ${MAX_TAGS} etiquetas.`;
  }

  return buildResult(errors);
}
