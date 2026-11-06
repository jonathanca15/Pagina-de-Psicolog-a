/**
 * Campos comunes gestionados EXCLUSIVAMENTE por la capa de persistencia.
 * Los drafts (datos de entrada) nunca deben incluirlos.
 *
 * @typedef {Object} BaseEntity
 * @property {string} id         Identificador único (UUID).
 * @property {string} createdAt  Fecha ISO 8601 de creación.
 * @property {string} updatedAt  Fecha ISO 8601 de última modificación.
 * @property {number} version    Versión para control de concurrencia optimista.
 */

/** Claves reservadas que el cliente no puede sobrescribir. */
export const RESERVED_ENTITY_KEYS = Object.freeze(['id', 'createdAt', 'updatedAt', 'version']);

export {};
