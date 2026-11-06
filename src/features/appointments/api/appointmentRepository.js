import { storageService, StorageError, STORAGE_ERROR_CODES } from '../../../core/services/index.js';
import { COLLECTIONS, APPOINTMENT_STATUS } from '../../../core/models/enums.js';
import {
  createAppointmentDraft,
  validateAppointment,
  canTransition,
  isActiveAppointment,
  appointmentsOverlap,
} from '../../../core/models/appointment.js';

const COLLECTION = COLLECTIONS.APPOINTMENTS;

export const appointmentRepository = {
  /**
   * Obtiene las citas filtradas por paciente, psicóloga, estado o rango de fechas,
   * ordenadas cronológicamente por fecha de inicio (`startsAt`).
   *
   * @param {{
   *   patientId?: string | null,
   *   psychologistId?: string | null,
   *   status?: string | null,
   *   startDate?: string | null,
   *   endDate?: string | null,
   *   signal?: AbortSignal
   * }} [options]
   * @returns {Promise<import('../../../core/models/appointment.js').Appointment[]>}
   */
  async getAll({ patientId, psychologistId, status, startDate, endDate, signal } = {}) {
    const startMs = startDate ? Date.parse(`${startDate}T00:00:00.000Z`) : null;
    const endMs = endDate ? Date.parse(`${endDate}T23:59:59.999Z`) : null;

    const result = await storageService.list(COLLECTION, { signal });
    const list = Array.isArray(result) ? result : (result?.items || []);

    const filtered = list.filter((appointment) => {
      if (patientId && appointment.patientId !== patientId) return false;
      if (psychologistId && appointment.psychologistId !== psychologistId) return false;
      if (status && appointment.status !== status) return false;

      if (startMs !== null && !Number.isNaN(startMs)) {
        const apptStart = Date.parse(appointment.startsAt);
        if (apptStart < startMs) return false;
      }

      if (endMs !== null && !Number.isNaN(endMs)) {
        const apptStart = Date.parse(appointment.startsAt);
        if (apptStart > endMs) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  },

  /**
   * Obtiene una cita por su ID.
   * @param {string} id
   * @param {{ signal?: AbortSignal }} [options]
   */
  async getById(id, { signal } = {}) {
    return await storageService.getById(COLLECTION, id, { signal });
  },

  /**
   * Agenda una nueva cita validando reglas de modelo y que no se solape con otra cita activa.
   * @param {Parameters<typeof createAppointmentDraft>[0]} data
   * @param {{ signal?: AbortSignal }} [options]
   */
  async create(data, { signal } = {}) {
    const draft = createAppointmentDraft(data);
    const validation = validateAppointment(draft);

    if (!validation.valid) {
      throw new StorageError(
        STORAGE_ERROR_CODES.VALIDATION,
        'Los datos de la cita no son válidos.',
        { details: validation.errors },
      );
    }

    // Verificar solapamiento con citas activas (PENDING o CONFIRMED)
    const result = await storageService.list(COLLECTION, { signal });
    const existing = Array.isArray(result) ? result : (result?.items || []);

    const conflicting = existing.find(
      (item) =>
        isActiveAppointment(item) &&
        (item.psychologistId === draft.psychologistId || item.patientId === draft.patientId) &&
        appointmentsOverlap(item, draft),
    );

    if (conflicting) {
      throw new StorageError(
        STORAGE_ERROR_CODES.CONFLICT,
        'El horario elegido se solapa con otra cita activa en la agenda.',
        {
          details: {
            startsAt: 'Ya existe una cita activa en ese rango de horario.',
            conflictingAppointmentId: conflicting.id,
          },
        },
      );
    }

    return await storageService.create(COLLECTION, draft, { signal });
  },

  /**
   * Cambia el estado de una cita verificando las transiciones permitidas en la máquina de estados.
   * @param {string} id
   * @param {import('../../../core/models/enums.js').AppointmentStatus} nextStatus
   * @param {{ cancellationReason?: string | null, meetingUrl?: string | null, signal?: AbortSignal }} [options]
   */
  async updateStatus(id, nextStatus, { cancellationReason = null, meetingUrl, signal } = {}) {
    const current = await storageService.getById(COLLECTION, id, { signal });

    if (!canTransition(current.status, nextStatus)) {
      throw new StorageError(
        STORAGE_ERROR_CODES.VALIDATION,
        `Transición de estado no permitida: de "${current.status}" a "${nextStatus}".`,
        {
          details: {
            status: `No se puede cambiar de ${current.status} a ${nextStatus}.`,
          },
        },
      );
    }

    const patch = {
      status: nextStatus,
      cancellationReason:
        nextStatus === APPOINTMENT_STATUS.CANCELLED
          ? (cancellationReason ?? current.cancellationReason ?? '').trim() || null
          : current.cancellationReason,
    };

    if (meetingUrl !== undefined) {
      patch.meetingUrl = meetingUrl;
    }

    const candidate = { ...current, ...patch };
    const validation = validateAppointment(candidate);

    if (!validation.valid) {
      throw new StorageError(
        STORAGE_ERROR_CODES.VALIDATION,
        Object.values(validation.errors)[0] || 'No se pudo actualizar la cita.',
        { details: validation.errors },
      );
    }

    return await storageService.update(COLLECTION, id, patch, {
      expectedVersion: current.version,
      signal,
    });
  },

  /**
   * Elimina una cita de la colección.
   * @param {string} id
   * @param {{ signal?: AbortSignal }} [options]
   */
  async remove(id, { signal } = {}) {
    return await storageService.remove(COLLECTION, id, { signal });
  },
};
