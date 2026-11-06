import { StorageError, STORAGE_ERROR_CODES } from './StorageError.js';

/**
 * Contrato que cualquier driver debe cumplir (Dependency Inversion):
 * el storageService depende de esta abstracción, no de localStorage/memoria.
 * Mañana puede sustituirse por IndexedDB o un cliente HTTP real sin tocar el servicio.
 *
 * @typedef {Object} StorageDriver
 * @property {(collection: string) => Promise<object[]> | object[]} read
 * @property {(collection: string, items: object[]) => Promise<void> | void} write
 * @property {() => Promise<void> | void} clear
 */

/**
 * Driver en memoria: ideal para tests y como fallback.
 * @param {Record<string, object[]>} [initialData]
 * @returns {StorageDriver}
 */
export function createMemoryDriver(initialData = {}) {
  const store = new Map(Object.entries(structuredClone(initialData)));
  return {
    read: (collection) => store.get(collection) ?? [],
    write: (collection, items) => {
      store.set(collection, items);
    },
    clear: () => store.clear(),
  };
}

/**
 * Driver sobre Web Storage (localStorage/sessionStorage). Persiste entre recargas.
 * @param {{ namespace?: string, storage?: Storage }} [options]
 * @returns {StorageDriver}
 */
export function createWebStorageDriver({ namespace = 'app', storage = globalThis.localStorage } = {}) {
  if (!storage) {
    throw new StorageError(STORAGE_ERROR_CODES.UNKNOWN, 'Web Storage no está disponible.');
  }
  const prefix = `${namespace}:`;
  const keyOf = (collection) => `${prefix}${collection}`;

  return {
    read(collection) {
      const raw = storage.getItem(keyOf(collection));
      if (raw === null) return [];
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new TypeError('La colección no es un arreglo.');
        return parsed;
      } catch (cause) {
        throw new StorageError(
          STORAGE_ERROR_CODES.CORRUPTED_DATA,
          'Los datos guardados están dañados y no pueden leerse.',
          { cause, details: { collection } },
        );
      }
    },
    write(collection, items) {
      // QuotaExceededError se normaliza en StorageError.from()
      storage.setItem(keyOf(collection), JSON.stringify(items));
    },
    clear() {
      const keys = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key?.startsWith(prefix)) keys.push(key);
      }
      keys.forEach((key) => storage.removeItem(key));
    },
  };
}

/** Detecta si Web Storage es usable (modo privado de Safari, cookies bloqueadas, etc.). */
export function isWebStorageAvailable(storage = globalThis.localStorage) {
  try {
    const probe = '__storage_probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
