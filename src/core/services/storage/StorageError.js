/**
 * Códigos de error normalizados. La UI decide el mensaje/acción según el código,
 * sin acoplarse a detalles del driver subyacente.
 */
export const STORAGE_ERROR_CODES = Object.freeze({
  NETWORK: 'NETWORK_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  ABORTED: 'ABORTED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  CORRUPTED_DATA: 'CORRUPTED_DATA',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  UNKNOWN: 'UNKNOWN',
});

/** Errores transitorios que tiene sentido reintentar. */
const RETRYABLE_CODES = new Set([STORAGE_ERROR_CODES.NETWORK]);

/**
 * @typedef {Object} StorageErrorOptions
 * @property {Record<string, unknown>} [details]  Info adicional (p. ej. errores de validación por campo).
 * @property {unknown} [cause]                    Error original.
 */

export class StorageError extends Error {
  /**
   * @param {string} code    Uno de STORAGE_ERROR_CODES.
   * @param {string} message Mensaje legible para el usuario final.
   * @param {StorageErrorOptions} [options]
   */
  constructor(code, message, { details = {}, cause } = {}) {
    super(message, { cause });
    this.name = 'StorageError';
    this.code = code;
    this.details = details;
    this.retryable = RETRYABLE_CODES.has(code);
  }

  /**
   * Normaliza cualquier error lanzado (driver, navegador, código propio) a StorageError.
   * @param {unknown} error
   * @param {Record<string, unknown>} [context]
   * @returns {StorageError}
   */
  static from(error, context = {}) {
    if (error instanceof StorageError) {
      error.details = { ...context, ...error.details };
      return error;
    }

    const name = /** @type {{ name?: string }} */ (error)?.name;

    if (name === 'AbortError') {
      return new StorageError(STORAGE_ERROR_CODES.ABORTED, 'La operación fue cancelada.', {
        cause: error,
        details: context,
      });
    }
    if (name === 'QuotaExceededError') {
      return new StorageError(
        STORAGE_ERROR_CODES.QUOTA_EXCEEDED,
        'No hay espacio de almacenamiento disponible en este dispositivo.',
        { cause: error, details: context },
      );
    }
    return new StorageError(STORAGE_ERROR_CODES.UNKNOWN, 'Ocurrió un error inesperado.', {
      cause: error,
      details: context,
    });
  }
}

/** Útil en hooks para ignorar cancelaciones (desmontaje de componentes) sin mostrar error. */
export const isAbortError = (error) =>
  error instanceof StorageError && error.code === STORAGE_ERROR_CODES.ABORTED;
