import { createClient } from '@supabase/supabase-js';

const env = import.meta.env ?? {};

const supabaseUrl = env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? '';

/**
 * Indica si las variables de entorno de Supabase están definidas.
 * Permite hacer fallback seguro al driver local durante desarrollo o tests.
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  return Boolean(
    typeof supabaseUrl === 'string' &&
      supabaseUrl.trim().length > 0 &&
      typeof supabaseAnonKey === 'string' &&
      supabaseAnonKey.trim().length > 0,
  );
}

/**
 * Instancia singleton del cliente de Supabase.
 * Si las credenciales aún no están configuradas en el entorno local, exporta `null`
 * para no romper el arranque en modo mock (`VITE_STORAGE_DRIVER=local`).
 */
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
