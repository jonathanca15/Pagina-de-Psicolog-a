const ALPHANUMERIC = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Prefijos legibles por colección de dominio.
 */
export const COLLECTION_PREFIXES = Object.freeze({
  patients: 'pat',
  appointments: 'apt',
  clinical_logs: 'log',
  resources: 'res',
});

/**
 * Genera una cadena alfanumérica aleatoria de longitud `length` (5 a 6 caracteres por defecto)
 * usando Web Crypto API cuando está disponible.
 * @param {number} [length=6]
 * @returns {string}
 */
function randomAlphanumeric(length = 6) {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => ALPHANUMERIC[b % ALPHANUMERIC.length]).join('');
  }
  return Array.from(
    { length },
    () => ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)],
  ).join('');
}

/**
 * Genera un identificador corto y legible con prefijo (ej: `pat-8k2m9x`).
 * Si se pasa un nombre de colección conocido ('patients', 'appointments', etc.),
 * utiliza su prefijo corto correspondiente ('pat', 'apt', 'log', 'res').
 *
 * @param {string} [prefixOrCollection='id'] Prefijo o nombre de colección.
 * @param {number} [length=6]                Longitud del código alfanumérico (5-6 caracteres).
 * @returns {string}
 */
export function generateId(prefixOrCollection = 'id', length = 6) {
  const normalized = String(prefixOrCollection || 'id').trim().toLowerCase();
  const prefix = COLLECTION_PREFIXES[normalized] || normalized;
  return `${prefix}-${randomAlphanumeric(length)}`;
}
