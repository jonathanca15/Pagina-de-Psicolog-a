import { storageService, StorageError, STORAGE_ERROR_CODES } from '../../../core/services/index.js';
import { COLLECTIONS } from '../../../core/models/enums.js';
import { createClinicalLogDraft, validateClinicalLog } from '../../../core/models/clinicalLog.js';

const COLLECTION = COLLECTIONS.CLINICAL_LOGS;

export const clinicalLogRepository = {
  /**
   * Lista las entradas de la bitácora clínica con filtro opcional por paciente o fecha,
   * ordenadas descendentemente por fecha de sesión.
   * @param {{ patientId?: string | null, sessionDate?: string | null, signal?: AbortSignal }} [options]
   */
  async getAll({ patientId, sessionDate, signal } = {}) {
    const predicate = (log) => {
      if (patientId && log.patientId !== patientId) return false;
      if (sessionDate && !String(log.sessionDate || '').startsWith(sessionDate)) return false;
      return true;
    };

    const result = await storageService.list(COLLECTION, { predicate, signal });
    const list = Array.isArray(result) ? result : (result?.items || []);

    return [...list].sort(
      (a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime(),
    );
  },

  /**
   * Obtiene una entrada de bitácora por su identificador.
   * @param {string} id
   * @param {{ signal?: AbortSignal }} [options]
   */
  async getById(id, { signal } = {}) {
    return await storageService.getById(COLLECTION, id, { signal });
  },

  /**
   * Crea y valida una nueva entrada clínica.
   * @param {Partial<import('../../../core/models/clinicalLog.js').ClinicalLogDraft>} data
   * @param {{ signal?: AbortSignal }} [options]
   */
  async create(data, { signal } = {}) {
    const draft = createClinicalLogDraft(data);
    const validation = validateClinicalLog(draft);

    const hasErrors =
      validation?.valid === false ||
      validation?.isValid === false ||
      (validation?.errors && Object.keys(validation.errors).length > 0);

    if (hasErrors) {
      throw new StorageError(
        STORAGE_ERROR_CODES.VALIDATION,
        'Datos de consulta inválidos. Revisa los campos marcados.',
        { details: validation.errors },
      );
    }

    return await storageService.create(COLLECTION, draft, { signal });
  },

  /**
   * Elimina una entrada de la bitácora.
   * @param {string} id
   * @param {{ signal?: AbortSignal }} [options]
   */
  async remove(id, { signal } = {}) {
    return await storageService.remove(COLLECTION, id, { signal });
  },
};
