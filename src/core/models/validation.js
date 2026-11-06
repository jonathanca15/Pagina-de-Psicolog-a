/**
 * Utilidades de validación puras y reutilizables (sin dependencias externas).
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {Record<string, string>} errors  Mapa campo -> mensaje legible.
 */

/**
 * @param {Record<string, string>} errors
 * @returns {ValidationResult}
 */
export const buildResult = (errors) => ({
  valid: Object.keys(errors).length === 0,
  errors,
});

export const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

export const isValidISODate = (value) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

export const isEmail = (value) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Valida URLs absolutas http/https usando la API estándar `URL`. */
export const isHttpUrl = (value) => {
  if (typeof value !== 'string') return false;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Data URL de imagen raster en base64 (resultado de subir/comprimir una imagen local).
 * SVG se excluye deliberadamente porque puede contener scripts.
 */
export const isImageDataUrl = (value) =>
  typeof value === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value);

/**
 * @param {unknown} value
 * @param {Record<string, string>} enumObject
 */
export const isOneOf = (value, enumObject) =>
  Object.values(enumObject).includes(/** @type {string} */ (value));
