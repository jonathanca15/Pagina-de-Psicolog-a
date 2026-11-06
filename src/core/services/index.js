/**
 * Composition Root de servicios: ÚNICO lugar donde se eligen implementaciones
 * concretas (driver local o Supabase, validadores, simulación de red).
 * El resto de la aplicación importa `storageService` y depende solo de su interfaz.
 */
import {
  COLLECTIONS,
  validateAppointment,
  validateClinicalLog,
  validatePatient,
} from '../models/index.js';
import {
  createMemoryDriver,
  createWebStorageDriver,
  isWebStorageAvailable,
} from './storage/drivers.js';
import { createStorageService } from './storage/storageService.js';
import { seedData } from './storage/seed.js';
import { isSupabaseConfigured, supabase } from './supabase/supabaseClient.js';
import { createSupabaseDriver } from './supabase/supabaseDriver.js';

const env = import.meta.env ?? {};
const isTestEnv = env.MODE === 'test' || Boolean(env.VITEST);
const useSupabaseDriver =
  !isTestEnv && env.VITE_STORAGE_DRIVER === 'supabase' && isSupabaseConfigured();

function resolveDriver() {
  if (isTestEnv) {
    return createMemoryDriver();
  }
  if (useSupabaseDriver) {
    return createSupabaseDriver(supabase);
  }
  if (typeof window !== 'undefined' && isWebStorageAvailable()) {
    return createWebStorageDriver({ namespace: 'psicoapp' });
  }
  return createMemoryDriver();
}

export const storageService = createStorageService({
  driver: resolveDriver(),
  latency: useSupabaseDriver || isTestEnv ? { min: 0, max: 0 } : { min: 400, max: 1200 },
  failureRate: useSupabaseDriver || isTestEnv ? 0 : Number(env.VITE_MOCK_FAILURE_RATE ?? 0.1),
  validators: {
    [COLLECTIONS.PATIENTS]: validatePatient,
    [COLLECTIONS.APPOINTMENTS]: validateAppointment,
    [COLLECTIONS.CLINICAL_LOGS]: validateClinicalLog,
  },
});

/** Promise única de inicialización; pobla datos semilla si las colecciones están vacías. */
export const storageReady = isTestEnv
  ? Promise.resolve()
  : storageService.seed(seedData).catch(() => {});

export { StorageError, STORAGE_ERROR_CODES, isAbortError } from './storage/StorageError.js';
export { supabase, isSupabaseConfigured } from './supabase/supabaseClient.js';
export { createSupabaseDriver, getCollectionMapper } from './supabase/supabaseDriver.js';
export {
  storageBucketService,
  CLINICAL_MEDIA_BUCKET,
  validateImageFile,
} from './supabase/storageBucketService.js';
export { authService, normalizeAuthUser } from './supabase/authService.js';
