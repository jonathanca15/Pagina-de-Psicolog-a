/**
 * Enumeraciones de dominio.
 * Se congelan con Object.freeze para evitar mutaciones accidentales
 * y servir como única fuente de verdad en toda la aplicación.
 */

/** @typedef {'psychologist' | 'patient' | 'guest'} Role */
export const ROLES = Object.freeze({
  PSYCHOLOGIST: 'psychologist',
  PATIENT: 'patient',
  GUEST: 'guest',
});

/** @typedef {'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'} AppointmentStatus */
export const APPOINTMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
});

/** @typedef {'in_person' | 'online'} AppointmentModality */
export const APPOINTMENT_MODALITY = Object.freeze({
  IN_PERSON: 'in_person',
  ONLINE: 'online',
});

/** @typedef {'image' | 'video'} MediaType */
export const MEDIA_TYPE = Object.freeze({
  IMAGE: 'image',
  VIDEO: 'video',
});

/** Nombres de colecciones persistidas en el storage. */
export const COLLECTIONS = Object.freeze({
  PATIENTS: 'patients',
  APPOINTMENTS: 'appointments',
  CLINICAL_LOGS: 'clinical_logs',
});
