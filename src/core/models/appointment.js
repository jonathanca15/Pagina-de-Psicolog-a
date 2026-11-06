import { APPOINTMENT_MODALITY, APPOINTMENT_STATUS } from './enums.js';
import { buildResult, isHttpUrl, isNonEmptyString, isOneOf, isValidISODate } from './validation.js';

export const APPOINTMENT_RULES = Object.freeze({
  DEFAULT_DURATION_MIN: 50,
  MIN_DURATION_MIN: 30,
  MAX_DURATION_MIN: 120,
  MAX_REASON_LENGTH: 500,
});

/**
 * Transiciones de estado permitidas (máquina de estados simple).
 * @type {Readonly<Record<import('./enums.js').AppointmentStatus, ReadonlyArray<import('./enums.js').AppointmentStatus>>>}
 */
export const APPOINTMENT_TRANSITIONS = Object.freeze({
  [APPOINTMENT_STATUS.PENDING]: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CANCELLED],
  [APPOINTMENT_STATUS.CONFIRMED]: [
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW,
  ],
  [APPOINTMENT_STATUS.CANCELLED]: [],
  [APPOINTMENT_STATUS.COMPLETED]: [],
  [APPOINTMENT_STATUS.NO_SHOW]: [],
});

/**
 * @typedef {Object} AppointmentDraft
 * @property {string} patientId
 * @property {string} psychologistId
 * @property {string} startsAt                 Fecha-hora ISO 8601 (UTC).
 * @property {string} endsAt                   Fecha-hora ISO 8601 (UTC).
 * @property {import('./enums.js').AppointmentStatus} status
 * @property {import('./enums.js').AppointmentModality} modality
 * @property {string | null} meetingUrl        Solo para modalidad online.
 * @property {string} reason                   Motivo de consulta indicado por el paciente.
 * @property {string | null} cancellationReason
 */

/** @typedef {import('./entity.js').BaseEntity & AppointmentDraft} Appointment */

/**
 * Factory: crea un draft de cita calculando `endsAt` a partir de la duración.
 * @param {{ patientId: string, psychologistId: string, startsAt: string | Date,
 *           durationMinutes?: number, modality?: import('./enums.js').AppointmentModality,
 *           reason?: string, meetingUrl?: string | null }} input
 * @returns {AppointmentDraft}
 */
export function createAppointmentDraft({
  patientId,
  psychologistId,
  startsAt,
  durationMinutes = APPOINTMENT_RULES.DEFAULT_DURATION_MIN,
  modality = APPOINTMENT_MODALITY.IN_PERSON,
  reason = '',
  meetingUrl = null,
}) {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const isValid = !Number.isNaN(start.getTime());

  return {
    patientId,
    psychologistId,
    startsAt: isValid ? start.toISOString() : '',
    endsAt: isValid ? end.toISOString() : '',
    status: APPOINTMENT_STATUS.PENDING,
    modality,
    meetingUrl: modality === APPOINTMENT_MODALITY.ONLINE ? meetingUrl : null,
    reason: reason.trim(),
    cancellationReason: null,
  };
}

/**
 * @param {Partial<Appointment>} appointment
 * @returns {import('./validation.js').ValidationResult}
 */
export function validateAppointment(appointment) {
  const errors = {};
  const { MIN_DURATION_MIN, MAX_DURATION_MIN, MAX_REASON_LENGTH } = APPOINTMENT_RULES;

  if (!isNonEmptyString(appointment.patientId)) errors.patientId = 'El paciente es obligatorio.';
  if (!isNonEmptyString(appointment.psychologistId)) errors.psychologistId = 'La psicóloga es obligatoria.';

  if (!isValidISODate(appointment.startsAt) || !isValidISODate(appointment.endsAt)) {
    errors.startsAt = 'La fecha y hora de la cita no son válidas.';
  } else {
    const minutes = (Date.parse(appointment.endsAt) - Date.parse(appointment.startsAt)) / 60_000;
    if (minutes < MIN_DURATION_MIN || minutes > MAX_DURATION_MIN) {
      errors.endsAt = `La duración debe estar entre ${MIN_DURATION_MIN} y ${MAX_DURATION_MIN} minutos.`;
    }
  }

  if (!isOneOf(appointment.status, APPOINTMENT_STATUS)) errors.status = 'Estado de cita inválido.';
  if (!isOneOf(appointment.modality, APPOINTMENT_MODALITY)) errors.modality = 'Modalidad inválida.';

  if (appointment.meetingUrl != null && !isHttpUrl(appointment.meetingUrl)) {
    errors.meetingUrl = 'El enlace de la videollamada no es válido.';
  }
  if ((appointment.reason ?? '').length > MAX_REASON_LENGTH) {
    errors.reason = `El motivo no puede superar ${MAX_REASON_LENGTH} caracteres.`;
  }
  if (
    appointment.status === APPOINTMENT_STATUS.CANCELLED &&
    !isNonEmptyString(appointment.cancellationReason)
  ) {
    errors.cancellationReason = 'Indica el motivo de la cancelación.';
  }

  return buildResult(errors);
}

/* ---------- Reglas de dominio puras (reutilizables por hooks/repositorios) ---------- */

/** @param {AppointmentStatus} from @param {AppointmentStatus} to */
export const canTransition = (from, to) => APPOINTMENT_TRANSITIONS[from]?.includes(to) ?? false;

/** Una cita "ocupa" agenda si está pendiente o confirmada. */
export const isActiveAppointment = (appointment) =>
  appointment.status === APPOINTMENT_STATUS.PENDING ||
  appointment.status === APPOINTMENT_STATUS.CONFIRMED;

/** Intervalos semiabiertos [start, end): citas consecutivas no se solapan. */
export const appointmentsOverlap = (a, b) =>
  Date.parse(a.startsAt) < Date.parse(b.endsAt) && Date.parse(b.startsAt) < Date.parse(a.endsAt);

/** @typedef {import('./enums.js').AppointmentStatus} AppointmentStatus */
