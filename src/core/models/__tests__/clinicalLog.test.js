import { describe, it, expect } from 'vitest';
import {
  MEDIA_TYPE,
  CLINICAL_LOG_RULES,
  createClinicalLogDraft,
  createMediaAttachment,
  validateClinicalLog,
  validateMediaAttachment,
} from '../index.js';

describe('Modelo ClinicalLog — Validación de bitácora clínica', () => {
  const validBaseLog = () =>
    createClinicalLogDraft({
      patientId: 'pat-001',
      authorId: 'psy-001',
      sessionDate: '2026-10-20T16:00:00.000Z',
      title: 'Sesión de evaluación cognitiva',
      content: 'El paciente muestra avances en la identificación de pensamientos automáticos.',
      media: [],
      tags: ['CBT', 'Ansiedad', 'cbt'],
    });

  describe('Campos obligatorios y normalización', () => {
    it('acepta una entrada válida y normaliza etiquetas (minúsculas y sin duplicados)', () => {
      const draft = validBaseLog();
      const result = validateClinicalLog(draft);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
      expect(draft.tags).toEqual(['cbt', 'ansiedad']);
    });

    it('falla cuando faltan patientId, authorId, title o sessionDate', () => {
      const invalidDraft = {
        patientId: '   ',
        authorId: '',
        sessionDate: 'fecha-invalida',
        title: '',
        content: 'Contenido válido',
        media: [],
        tags: [],
      };

      const result = validateClinicalLog(invalidDraft);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('patientId');
      expect(result.errors).toHaveProperty('authorId');
      expect(result.errors).toHaveProperty('sessionDate');
      expect(result.errors).toHaveProperty('title');
    });

    it('exige que exista texto en content o al menos un adjunto multimedia', () => {
      const emptyContentAndMedia = {
        ...validBaseLog(),
        content: '   ',
        media: [],
      };
      expect(validateClinicalLog(emptyContentAndMedia).valid).toBe(false);
      expect(validateClinicalLog(emptyContentAndMedia).errors).toHaveProperty('content');

      const onlyMediaLog = {
        ...validBaseLog(),
        content: '',
        media: [
          createMediaAttachment({
            type: MEDIA_TYPE.IMAGE,
            url: 'https://images.example.com/esquema.png',
            caption: 'Esquema trabajado en sesión',
          }),
        ],
      };
      expect(validateClinicalLog(onlyMediaLog).valid).toBe(true);
    });
  });

  describe('Límites de caracteres y colecciones', () => {
    it('rechaza títulos que superan MAX_TITLE_LENGTH (120 caracteres)', () => {
      const draft = {
        ...validBaseLog(),
        title: 'A'.repeat(CLINICAL_LOG_RULES.MAX_TITLE_LENGTH + 1),
      };

      const result = validateClinicalLog(draft);
      expect(result.valid).toBe(false);
      expect(result.errors.title).toContain(`${CLINICAL_LOG_RULES.MAX_TITLE_LENGTH}`);
    });

    it('rechaza notas clínicas que superan MAX_CONTENT_LENGTH (20,000 caracteres)', () => {
      const draft = {
        ...validBaseLog(),
        content: 'B'.repeat(CLINICAL_LOG_RULES.MAX_CONTENT_LENGTH + 1),
      };

      const result = validateClinicalLog(draft);
      expect(result.valid).toBe(false);
      expect(result.errors.content).toContain(`${CLINICAL_LOG_RULES.MAX_CONTENT_LENGTH}`);
    });

    it('rechaza más de MAX_MEDIA_ITEMS (10) adjuntos o más de MAX_TAGS (15) etiquetas', () => {
      const tooManyMedia = {
        ...validBaseLog(),
        media: Array.from({ length: CLINICAL_LOG_RULES.MAX_MEDIA_ITEMS + 1 }, (_, i) =>
          createMediaAttachment({
            type: MEDIA_TYPE.IMAGE,
            url: `https://images.example.com/img-${i}.png`,
          }),
        ),
        tags: Array.from({ length: CLINICAL_LOG_RULES.MAX_TAGS + 1 }, (_, i) => `tag-${i}`),
      };

      const result = validateClinicalLog(tooManyMedia);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('media');
      expect(result.errors).toHaveProperty('tags');
    });
  });

  describe('Validación de adjuntos multimedia (validateMediaAttachment)', () => {
    it('acepta imágenes por URL http/https y por Data URL base64 raster (png, jpeg, webp, gif)', () => {
      const httpImage = createMediaAttachment({
        type: MEDIA_TYPE.IMAGE,
        url: 'https://images.example.com/foto.jpg',
        caption: 'Registro fotográfico',
      });
      expect(validateMediaAttachment(httpImage)).toBeNull();

      const base64Image = createMediaAttachment({
        type: MEDIA_TYPE.IMAGE,
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        caption: 'Imagen local subida',
      });
      expect(validateMediaAttachment(base64Image)).toBeNull();
    });

    it('acepta videos con URL http/https pero rechaza Data URLs en videos o protocolos inválidos', () => {
      const validVideo = createMediaAttachment({
        type: MEDIA_TYPE.VIDEO,
        url: 'https://www.youtube.com/watch?v=inpok4MKVLM',
        caption: 'Video de respiración',
      });
      expect(validateMediaAttachment(validVideo)).toBeNull();

      const invalidVideoProtocol = createMediaAttachment({
        type: MEDIA_TYPE.VIDEO,
        url: 'ftp://files.example.com/video.mp4',
      });
      expect(validateMediaAttachment(invalidVideoProtocol)).not.toBeNull();
    });

    it('marca error indexado (media.0) en validateClinicalLog cuando un adjunto es inválido', () => {
      const draftWithInvalidMedia = {
        ...validBaseLog(),
        media: [
          {
            id: 'med-bad',
            type: MEDIA_TYPE.IMAGE,
            url: 'no-es-una-url',
            caption: 'Adjunto roto',
          },
        ],
      };

      const result = validateClinicalLog(draftWithInvalidMedia);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('media.0');
    });
  });
});
