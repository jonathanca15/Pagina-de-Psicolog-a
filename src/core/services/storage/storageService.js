import { RESERVED_ENTITY_KEYS } from '../../models/entity.js';
import { delay } from '../../utils/delay.js';
import { generateId } from '../../utils/id.js';
import { createMemoryDriver } from './drivers.js';
import { StorageError, STORAGE_ERROR_CODES } from './StorageError.js';

/**
 * @typedef {import('./drivers.js').StorageDriver} StorageDriver
 * @typedef {import('../../models/validation.js').ValidationResult} ValidationResult
 * @typedef {(entity: object) => ValidationResult} EntityValidator
 */

/**
 * @typedef {Object} LatencyConfig
 * @property {number} min  Retardo mínimo simulado (ms).
 * @property {number} max  Retardo máximo simulado (ms).
 */

/**
 * @typedef {Object} StorageServiceOptions
 * @property {StorageDriver} [driver]                          Backend de persistencia.
 * @property {LatencyConfig} [latency]                         Simulación de red.
 * @property {number} [failureRate]                            Probabilidad 0..1 de fallo de red simulado.
 * @property {Record<string, EntityValidator>} [validators]    Validador por colección (Open/Closed).
 * @property {() => Date} [now]                                Reloj inyectable (tests deterministas).
 * @property {() => string} [idGenerator]                      Generador de IDs inyectable.
 */

/**
 * @typedef {Object} RequestOptions
 * @property {AbortSignal} [signal]  Permite cancelar (p. ej. al desmontar un componente).
 */

/**
 * @typedef {RequestOptions & {
 *   where?: Record<string, unknown>,
 *   predicate?: (item: object) => boolean,
 *   sortBy?: string,
 *   sortDir?: 'asc' | 'desc',
 *   offset?: number,
 *   limit?: number,
 * }} ListOptions
 *  - `where`: igualdad por campo; si el valor es un arreglo actúa como "IN".
 *  - `predicate`: filtro arbitrario para casos complejos (rangos de fechas, búsquedas).
 */

/**
 * @template T
 * @typedef {Object} ListResult
 * @property {T[]} items   Página solicitada.
 * @property {number} total Total de coincidencias antes de paginar (útil para "empty state").
 */

const DEFAULT_OPTIONS = Object.freeze({
  latency: Object.freeze({ min: 300, max: 1200 }),
  failureRate: 0,
  validators: Object.freeze({}),
  now: () => new Date(),
  idGenerator: generateId,
});

/* ------------------------------------------------------------------ */
/* Helpers puros                                                       */
/* ------------------------------------------------------------------ */

const randomBetween = (min, max) => Math.floor(min + Math.random() * Math.max(0, max - min));

/** Copia profunda nativa: evita que la UI mute el "servidor" por referencia. */
const clone = (value) => (value === undefined ? value : structuredClone(value));

/**
 * Mutex basado en cadena de Promises: serializa read-modify-write por colección
 * para evitar condiciones de carrera entre operaciones concurrentes.
 */
function createMutex() {
  let tail = Promise.resolve();
  return (task) => {
    const run = tail.then(task, task);
    tail = run.catch(() => {});
    return run;
  };
}

const matchesWhere = (item, where) =>
  Object.entries(where).every(([key, expected]) =>
    Array.isArray(expected) ? expected.includes(item[key]) : item[key] === expected,
  );

const compareBy = (field, direction) => {
  const factor = direction === 'desc' ? -1 : 1;
  return (a, b) => {
    const x = a[field];
    const y = b[field];
    if (x == null && y == null) return 0;
    if (x == null) return 1; // nulos siempre al final
    if (y == null) return -1;
    if (typeof x === 'string' && typeof y === 'string') {
      return x.localeCompare(y, 'es', { sensitivity: 'base' }) * factor;
    }
    return (x < y ? -1 : x > y ? 1 : 0) * factor;
  };
};

/** Elimina campos gestionados por el sistema para que el cliente no los falsifique. */
const stripReserved = (data = {}) =>
  Object.fromEntries(Object.entries(data).filter(([key]) => !RESERVED_ENTITY_KEYS.includes(key)));

function assertCollection(collection) {
  if (typeof collection !== 'string' || collection.trim() === '') {
    throw new StorageError(STORAGE_ERROR_CODES.INVALID_ARGUMENT, 'Colección inválida.');
  }
}

function assertId(id) {
  if (typeof id !== 'string' || id.trim() === '') {
    throw new StorageError(STORAGE_ERROR_CODES.INVALID_ARGUMENT, 'Identificador inválido.');
  }
}

const notFound = (collection, id) =>
  new StorageError(STORAGE_ERROR_CODES.NOT_FOUND, 'El registro solicitado no existe.', {
    details: { collection, id },
  });

/* ------------------------------------------------------------------ */
/* Factory del servicio                                                */
/* ------------------------------------------------------------------ */

/**
 * Crea un servicio de almacenamiento asíncrono genérico (CRUD por colección)
 * que simula un backend remoto: latencia, fallos de red, cancelación,
 * validación y control de concurrencia optimista.
 *
 * Es agnóstico al dominio: las reglas de cada entidad se inyectan vía `validators`.
 *
 * @param {StorageServiceOptions} [options]
 */
export function createStorageService(options = {}) {
  const driver = options.driver ?? createMemoryDriver();
  const validators = options.validators ?? DEFAULT_OPTIONS.validators;
  const now = options.now ?? DEFAULT_OPTIONS.now;
  const idGenerator = options.idGenerator ?? DEFAULT_OPTIONS.idGenerator;

  /** Configuración mutable en runtime (útil para un panel de desarrollo / QA de estados). */
  const network = {
    latency: { ...DEFAULT_OPTIONS.latency, ...options.latency },
    failureRate: options.failureRate ?? DEFAULT_OPTIONS.failureRate,
  };

  const locks = new Map();
  const withLock = (collection, task) => {
    if (!locks.has(collection)) locks.set(collection, createMutex());
    return locks.get(collection)(task);
  };

  /** Simula el viaje de red: retardo aleatorio + posible fallo transitorio. */
  async function simulateNetwork(operation, signal) {
    await delay(randomBetween(network.latency.min, network.latency.max), signal);
    if (Math.random() < network.failureRate) {
      throw new StorageError(
        STORAGE_ERROR_CODES.NETWORK,
        'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
        { details: { operation } },
      );
    }
  }

  /**
   * Pipeline común (Template Method): red simulada → tarea → copia defensiva → errores normalizados.
   * @template T
   * @param {string} operation
   * @param {string} collection
   * @param {() => Promise<T> | T} task
   * @param {AbortSignal} [signal]
   * @returns {Promise<T>}
   */
  async function execute(operation, collection, task, signal) {
    try {
      assertCollection(collection);
      await simulateNetwork(operation, signal);
      return clone(await task());
    } catch (error) {
      throw StorageError.from(error, { operation, collection });
    }
  }

  function assertValid(collection, entity) {
    const validate = validators[collection];
    if (!validate) return;
    const { valid, errors } = validate(entity);
    if (!valid) {
      throw new StorageError(
        STORAGE_ERROR_CODES.VALIDATION,
        'Algunos datos no son válidos. Revisa el formulario.',
        { details: { errors } },
      );
    }
  }

  const readAll = async (collection) => (await driver.read(collection)) ?? [];

  /* ------------------------------ API ------------------------------ */

  /**
   * @param {string} collection
   * @param {ListOptions} [listOptions]
   * @returns {Promise<ListResult<object>>}
   */
  function list(collection, listOptions = {}) {
    const { where, predicate, sortBy, sortDir = 'asc', offset = 0, limit, signal } = listOptions;

    return execute('list', collection, async () => {
      let items = await readAll(collection);
      if (where) items = items.filter((item) => matchesWhere(item, where));
      if (predicate) items = items.filter(predicate);
      if (sortBy) items = [...items].sort(compareBy(sortBy, sortDir));

      const total = items.length;
      const end = limit === undefined ? undefined : offset + limit;
      return { items: items.slice(offset, end), total };
    }, signal);
  }

  /**
   * @param {string} collection
   * @param {string} id
   * @param {RequestOptions} [requestOptions]
   */
  function getById(collection, id, { signal } = {}) {
    return execute('getById', collection, async () => {
      assertId(id);
      const item = (await readAll(collection)).find((entry) => entry.id === id);
      if (!item) throw notFound(collection, id);
      return item;
    }, signal);
  }

  /**
   * @param {string} collection
   * @param {object} data  Draft sin campos reservados.
   * @param {RequestOptions} [requestOptions]
   */
  function create(collection, data, { signal } = {}) {
    return execute('create', collection, () => {
      const timestamp = now().toISOString();
      const candidateId =
        typeof data?.id === 'string' && /^(pat|apt|log|res)-[a-z0-9]{3,10}$/i.test(data.id.trim())
          ? data.id.trim()
          : idGenerator(collection);
      const entity = {
        ...stripReserved(data),
        id: candidateId,
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 1,
      };
      assertValid(collection, entity);

      return withLock(collection, async () => {
        const items = await readAll(collection);
        await driver.write(collection, [...items, entity]);
        return entity;
      });
    }, signal);
  }

  /**
   * Actualización parcial con concurrencia optimista opcional.
   * Si `expectedVersion` no coincide, lanza CONFLICT (otro cliente modificó el registro).
   *
   * @param {string} collection
   * @param {string} id
   * @param {object} patch
   * @param {RequestOptions & { expectedVersion?: number }} [requestOptions]
   */
  function update(collection, id, patch, { expectedVersion, signal } = {}) {
    return execute('update', collection, () => {
      assertId(id);
      return withLock(collection, async () => {
        const items = await readAll(collection);
        const index = items.findIndex((entry) => entry.id === id);
        if (index === -1) throw notFound(collection, id);

        const current = items[index];
        if (expectedVersion !== undefined && current.version !== expectedVersion) {
          throw new StorageError(
            STORAGE_ERROR_CODES.CONFLICT,
            'Este registro fue modificado por otra sesión. Recarga los datos antes de guardar.',
            { details: { id, expectedVersion, currentVersion: current.version } },
          );
        }

        const next = {
          ...current,
          ...stripReserved(patch),
          updatedAt: now().toISOString(),
          version: current.version + 1,
        };
        assertValid(collection, next);

        const updated = items.slice();
        updated[index] = next;
        await driver.write(collection, updated);
        return next;
      });
    }, signal);
  }

  /**
   * @param {string} collection
   * @param {string} id
   * @param {RequestOptions} [requestOptions]
   * @returns {Promise<{ id: string }>}
   */
  function remove(collection, id, { signal } = {}) {
    return execute('remove', collection, () => {
      assertId(id);
      return withLock(collection, async () => {
        const items = await readAll(collection);
        if (!items.some((entry) => entry.id === id)) throw notFound(collection, id);
        await driver.write(collection, items.filter((entry) => entry.id !== id));
        return { id };
      });
    }, signal);
  }

  /**
   * Carga datos iniciales SOLO en colecciones vacías (idempotente, sin latencia).
   * @param {Record<string, object[]>} dataByCollection
   */
  async function seed(dataByCollection) {
    try {
      for (const [collection, records] of Object.entries(dataByCollection)) {
        await withLock(collection, async () => {
          if ((await readAll(collection)).length === 0) {
            await driver.write(collection, clone(records));
          }
        });
      }
    } catch (error) {
      throw StorageError.from(error, { operation: 'seed' });
    }
  }

  /** Borra todos los datos del driver (útil en tests / "cerrar sesión" en demo). */
  async function reset() {
    try {
      await driver.clear();
    } catch (error) {
      throw StorageError.from(error, { operation: 'reset' });
    }
  }

  /**
   * Ajusta la simulación de red en caliente (p. ej. forzar errores para probar la UI).
   * @param {{ latency?: Partial<LatencyConfig>, failureRate?: number }} config
   */
  function configureNetwork({ latency, failureRate } = {}) {
    if (latency) network.latency = { ...network.latency, ...latency };
    if (typeof failureRate === 'number') {
      network.failureRate = Math.min(1, Math.max(0, failureRate));
    }
  }

  /** @returns {{ latency: LatencyConfig, failureRate: number }} Copia de la configuración vigente. */
  function getNetworkConfig() {
    return { latency: { ...network.latency }, failureRate: network.failureRate };
  }

  return Object.freeze({
    list,
    getById,
    create,
    update,
    remove,
    seed,
    reset,
    configureNetwork,
    getNetworkConfig,
  });
}

/** @typedef {ReturnType<typeof createStorageService>} StorageService */
