import { storageService, StorageError, STORAGE_ERROR_CODES } from '../../../core/services/index.js';
import { COLLECTIONS } from '../../../core/models/enums.js';
import { createPatientDraft, validatePatient } from '../../../core/models/patient.js';

const COLLECTION = COLLECTIONS.PATIENTS;

export const patientRepository = {
  /**
   * Lista los pacientes registrados, con búsqueda opcional por nombre, correo, teléfono o ID,
   * ordenados alfabéticamente por nombre completo.
   *
   * @param {{ query?: string, signal?: AbortSignal }} [options]
   * @returns {Promise<import('../../../core/models/patient.js').Patient[]>}
   */
  async getAll({ query = '', signal } = {}) {
    const result = await storageService.list(COLLECTION, { signal });
    const list = Array.isArray(result) ? result : (result?.items || []);

    const normalizedQuery = query.trim().toLowerCase();

    const filtered = normalizedQuery
      ? list.filter((patient) => {
          const haystack = [
            patient.id,
            patient.fullName,
            patient.email,
            patient.phone || '',
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : list;

    return [...filtered].sort((a, b) =>
      String(a.fullName || '').localeCompare(String(b.fullName || ''), 'es', {
        sensitivity: 'base',
      }),
    );
  },

  /**
   * Obtiene un paciente por su ID.
   * @param {string} id
   * @param {{ signal?: AbortSignal }} [options]
   */
  async getById(id, { signal } = {}) {
    return await storageService.getById(COLLECTION, id, { signal });
  },

  /**
   * Registra un nuevo paciente validando el modelo y verificando unicidad de correo.
   * @param {Partial<import('../../../core/models/patient.js').PatientDraft>} patientData
   * @param {{ signal?: AbortSignal }} [options]
   */
  async create(patientData, { signal } = {}) {
    const draft = createPatientDraft(patientData);
    const validation = validatePatient(draft);

    if (!validation.valid) {
      throw new StorageError(
        STORAGE_ERROR_CODES.VALIDATION,
        'Los datos del paciente no son válidos. Revisa el formulario.',
        { details: validation.errors },
      );
    }

    const result = await storageService.list(COLLECTION, { signal });
    const existing = Array.isArray(result) ? result : (result?.items || []);
    const duplicate = existing.find(
      (item) => item.email.toLowerCase() === draft.email.toLowerCase(),
    );

    if (duplicate) {
      throw new StorageError(
        STORAGE_ERROR_CODES.CONFLICT,
        'Ya existe un paciente registrado con ese correo electrónico.',
        { details: { email: 'Este correo electrónico ya está registrado.' } },
      );
    }

    return await storageService.create(COLLECTION, draft, { signal });
  },

  /**
   * Actualiza los datos de un paciente existente aplicando validaciones del modelo.
   * @param {string} id
   * @param {Partial<import('../../../core/models/patient.js').PatientDraft>} patch
   * @param {{ signal?: AbortSignal }} [options]
   */
  async update(id, patch, { signal } = {}) {
    const current = await storageService.getById(COLLECTION, id, { signal });
    const mergedDraft = createPatientDraft({ ...current, ...patch });
    const validation = validatePatient(mergedDraft);

    if (!validation.valid) {
      throw new StorageError(
        STORAGE_ERROR_CODES.VALIDATION,
        'Los cambios del paciente no son válidos.',
        { details: validation.errors },
      );
    }

    return await storageService.update(COLLECTION, id, mergedDraft, {
      expectedVersion: current.version,
      signal,
    });
  },
};
