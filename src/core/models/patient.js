import { generateId } from '../utils/id.js';
import { buildResult, isEmail, isNonEmptyString, isValidISODate } from './validation.js';

/**
 * @typedef {Object} EmergencyContact
 * @property {string} name
 * @property {string} phone
 * @property {string} relationship
 */

/**
 * Datos de entrada para crear/editar un paciente.
 * @typedef {Object} PatientDraft
 * @property {string} [id]                      ID corto legible con prefijo `pat-` (ej: pat-9k2m4x).
 * @property {string} fullName
 * @property {string} email
 * @property {string | null} phone
 * @property {string | null} birthDate          Fecha ISO (YYYY-MM-DD).
 * @property {EmergencyContact | null} emergencyContact
 * @property {boolean} consentAccepted          Consentimiento informado aceptado.
 */

/** @typedef {import('./entity.js').BaseEntity & PatientDraft} Patient */

/**
 * Factory: normaliza la entrada cruda (p. ej. de un formulario) a un PatientDraft.
 * Si el paciente no trae `id`, genera un ID corto legible con prefijo `pat-`.
 * @param {Partial<PatientDraft>} input
 * @returns {PatientDraft}
 */
export function createPatientDraft(input = {}) {
  const providedId = typeof input.id === 'string' ? input.id.trim() : '';
  return {
    id: providedId || generateId('pat', 6),
    fullName: (input.fullName ?? '').trim(),
    email: (input.email ?? '').trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    birthDate: input.birthDate || null,
    emergencyContact: input.emergencyContact ?? null,
    consentAccepted: Boolean(input.consentAccepted),
  };
}

/**
 * @param {Partial<Patient>} patient
 * @returns {import('./validation.js').ValidationResult}
 */
export function validatePatient(patient) {
  const errors = {};

  if (!isNonEmptyString(patient.fullName)) errors.fullName = 'El nombre completo es obligatorio.';
  if (!isEmail(patient.email)) errors.email = 'El correo electrónico no es válido.';
  if (patient.birthDate && !isValidISODate(patient.birthDate)) {
    errors.birthDate = 'La fecha de nacimiento no es válida.';
  } else if (patient.birthDate && new Date(patient.birthDate) > new Date()) {
    errors.birthDate = 'La fecha de nacimiento no puede ser futura.';
  }
  if (patient.emergencyContact) {
    const { name, phone } = patient.emergencyContact;
    if (!isNonEmptyString(name) || !isNonEmptyString(phone)) {
      errors.emergencyContact = 'El contacto de emergencia requiere nombre y teléfono.';
    }
  }
  if (patient.consentAccepted !== true) {
    errors.consentAccepted = 'Se requiere aceptar el consentimiento informado.';
  }

  return buildResult(errors);
}
