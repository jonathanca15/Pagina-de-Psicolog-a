import { ROLES } from '../../models/enums.js';
import { StorageError, STORAGE_ERROR_CODES } from '../storage/StorageError.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const LOCAL_AUTH_SESSION_KEY = 'psicoapp:auth_session';
const LOCAL_AUTH_USERS_KEY = 'psicoapp:auth_users';

/**
 * Normaliza un usuario de Supabase o del fallback local a un modelo uniforme.
 * @param {object|null} rawUser
 * @returns {{ id: string, email: string, fullName: string, role: string, isDemo?: boolean } | null}
 */
export function normalizeAuthUser(rawUser) {
  if (!rawUser) return null;

  const meta = rawUser.user_metadata ?? rawUser.metadata ?? {};
  const roleCandidate = meta.role ?? rawUser.role;
  const resolvedRole =
    roleCandidate === ROLES.PSYCHOLOGIST || roleCandidate === ROLES.PATIENT
      ? roleCandidate
      : ROLES.PATIENT;

  const email = String(rawUser.email ?? '').trim();
  const fullName =
    String(meta.fullName ?? meta.full_name ?? rawUser.fullName ?? '').trim() ||
    (email ? email.split('@')[0] : 'Usuario');

  return {
    id: String(rawUser.id ?? `usr-${Date.now()}`),
    email,
    fullName,
    role: resolvedRole,
    isDemo: Boolean(rawUser.isDemo ?? meta.isDemo),
  };
}

/**
 * Fallback controlado en memoria / localStorage cuando Supabase no está configurado.
 */
const localAuthFallback = {
  listeners: new Set(),

  readUsers() {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem(LOCAL_AUTH_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  writeUsers(users) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users));
    } catch {
      // Ignorar errores de cuota en fallback
    }
  },

  readSession() {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem(LOCAL_AUTH_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  writeSession(session) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      if (session) {
        window.localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify(session));
      } else {
        window.localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
      }
    } catch {
      // Ignorar errores de cuota
    }
  },

  notify(event, session) {
    for (const listener of this.listeners) {
      try {
        listener(event, session);
      } catch {
        // Ignorar errores en listeners individuales
      }
    }
  },
};

function validateCredentials({ email, password }) {
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPassword = typeof password === 'string' ? password : '';

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new StorageError({
      code: STORAGE_ERROR_CODES.VALIDATION_FAILED,
      message: 'Ingresa un correo electrónico válido.',
    });
  }

  if (!cleanPassword || cleanPassword.length < 6) {
    throw new StorageError({
      code: STORAGE_ERROR_CODES.VALIDATION_FAILED,
      message: 'La contraseña debe tener al menos 6 caracteres.',
    });
  }

  return { cleanEmail, cleanPassword };
}

/**
 * Servicio desacoplado de autenticación con Supabase Auth y fallback controlado.
 */
export const authService = Object.freeze({
  /**
   * Inicia sesión con correo y contraseña.
   * @param {{ email: string, password: string }} credentials
   */
  async signIn({ email, password } = {}) {
    const { cleanEmail, cleanPassword } = validateCredentials({ email, password });

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        throw new StorageError({
          code: STORAGE_ERROR_CODES.VALIDATION_FAILED,
          message:
            error.message === 'Invalid login credentials'
              ? 'Credenciales inválidas. Verifica tu correo y contraseña.'
              : error.message || 'No fue posible iniciar sesión.',
          cause: error,
        });
      }

      const user = normalizeAuthUser(data?.user ?? data?.session?.user);
      return {
        session: data?.session ?? null,
        user,
      };
    }

    // Fallback controlado local
    const users = localAuthFallback.readUsers();
    const matched = users.find(
      (u) => u.email === cleanEmail && u.password === cleanPassword,
    );

    if (!matched) {
      throw new StorageError({
        code: STORAGE_ERROR_CODES.VALIDATION_FAILED,
        message:
          'No se encontró una cuenta con esas credenciales en el entorno local. Puedes crear una cuenta o usar el Acceso Rápido Demo.',
      });
    }

    const user = normalizeAuthUser(matched);
    const session = {
      access_token: `local-token-${user.id}`,
      user,
    };
    localAuthFallback.writeSession(session);
    localAuthFallback.notify('SIGNED_IN', session);

    return { session, user };
  },

  /**
   * Registra un nuevo usuario en Supabase Auth o en el almacenamiento local de respaldo.
   * @param {{ email: string, password: string, metadata?: { fullName?: string, role?: string } }} payload
   */
  async signUp({ email, password, metadata = {} } = {}) {
    const { cleanEmail, cleanPassword } = validateCredentials({ email, password });
    const role =
      metadata.role === ROLES.PSYCHOLOGIST ? ROLES.PSYCHOLOGIST : ROLES.PATIENT;
    const fullName = String(metadata.fullName ?? '').trim() || cleanEmail.split('@')[0];

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            fullName,
            full_name: fullName,
            role,
          },
        },
      });

      if (error) {
        throw new StorageError({
          code: STORAGE_ERROR_CODES.VALIDATION_FAILED,
          message: error.message || 'No fue posible registrar la cuenta.',
          cause: error,
        });
      }

      const user = normalizeAuthUser(
        data?.user ?? {
          email: cleanEmail,
          user_metadata: { fullName, role },
        },
      );

      return {
        session: data?.session ?? null,
        user,
        requiresEmailConfirmation: Boolean(data?.user && !data?.session),
      };
    }

    // Fallback controlado local
    const users = localAuthFallback.readUsers();
    if (users.some((u) => u.email === cleanEmail)) {
      throw new StorageError({
        code: STORAGE_ERROR_CODES.CONFLICT,
        message: 'Ya existe una cuenta registrada con este correo electrónico.',
      });
    }

    const newRecord = {
      id: `usr-${Date.now().toString(36)}`,
      email: cleanEmail,
      password: cleanPassword,
      fullName,
      role,
    };

    localAuthFallback.writeUsers([...users, newRecord]);
    const user = normalizeAuthUser(newRecord);
    const session = {
      access_token: `local-token-${user.id}`,
      user,
    };
    localAuthFallback.writeSession(session);
    localAuthFallback.notify('SIGNED_IN', session);

    return {
      session,
      user,
      requiresEmailConfirmation: false,
    };
  },

  /**
   * Cierra la sesión activa tanto en Supabase como en el fallback local.
   */
  async signOut() {
    localAuthFallback.writeSession(null);
    localAuthFallback.notify('SIGNED_OUT', null);

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new StorageError({
          code: STORAGE_ERROR_CODES.UNKNOWN,
          message: error.message || 'Error al cerrar la sesión.',
          cause: error,
        });
      }
    }
  },

  /**
   * Obtiene la sesión actual desde Supabase Auth o desde el fallback local.
   * @returns {Promise<{ session: object|null, user: object|null }>}
   */
  async getCurrentSession() {
    const localSession = localAuthFallback.readSession();
    if (localSession?.user?.isDemo) {
      return {
        session: localSession,
        user: normalizeAuthUser(localSession.user),
      };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!error && data?.session) {
          return {
            session: data.session,
            user: normalizeAuthUser(data.session.user),
          };
        }
      } catch {
        // Fallback silencioso a sesión local si falla la red
      }
    }

    if (localSession?.user) {
      return {
        session: localSession,
        user: normalizeAuthUser(localSession.user),
      };
    }

    return { session: null, user: null };
  },

  /**
   * Inicia una sesión instantánea de demostración sin requerir credenciales en servidor.
   * @param {'psychologist' | 'patient'} role
   */
  loginDemoSession(role = ROLES.PSYCHOLOGIST) {
    const resolvedRole =
      role === ROLES.PATIENT ? ROLES.PATIENT : ROLES.PSYCHOLOGIST;

    const demoUser =
      resolvedRole === ROLES.PSYCHOLOGIST
        ? {
            id: 'psy-dra-elena',
            email: 'elena.vega@psicoapp.demo',
            fullName: 'Dra. Elena Vega (Demo)',
            role: ROLES.PSYCHOLOGIST,
            isDemo: true,
          }
        : {
            id: 'pat-001',
            email: 'mariana.lopez@example.com',
            fullName: 'Mariana López Herrera (Demo)',
            role: ROLES.PATIENT,
            isDemo: true,
          };

    const session = {
      access_token: `demo-token-${resolvedRole}`,
      user: demoUser,
    };

    localAuthFallback.writeSession(session);
    localAuthFallback.notify('SIGNED_IN', session);

    return { session, user: demoUser };
  },

  /**
   * Suscribe un callback a los cambios de estado de autenticación.
   * Retorna una función `unsubscribe()`.
   * @param {(event: string, session: object|null, user: object|null) => void} callback
   * @returns {() => void}
   */
  onAuthStateChange(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const localHandler = (event, session) => {
      callback(event, session, normalizeAuthUser(session?.user ?? null));
    };
    localAuthFallback.listeners.add(localHandler);

    let supabaseSubscription = null;
    if (isSupabaseConfigured() && supabase) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        // Si hay una sesión demo activa localmente y Supabase emite INITIAL_SESSION vacía, preservar demo
        const localSession = localAuthFallback.readSession();
        if (!session && localSession?.user?.isDemo) {
          return;
        }
        callback(event, session, normalizeAuthUser(session?.user ?? null));
      });
      supabaseSubscription = data?.subscription ?? null;
    }

    return () => {
      localAuthFallback.listeners.delete(localHandler);
      if (supabaseSubscription && typeof supabaseSubscription.unsubscribe === 'function') {
        supabaseSubscription.unsubscribe();
      }
    };
  },
});
