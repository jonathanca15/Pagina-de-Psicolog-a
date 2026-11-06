import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { ROLES } from '../../../core/models/enums.js';
import { authService } from '../../../core/services/index.js';

export const AuthContext = createContext(null);

/**
 * Proveedor de contexto de autenticación.
 * Mantiene el estado inicial accesible como invitado/demo (`role: 'guest'`)
 * para permitir explorar toda la plataforma sin bloqueo inicial.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let mounted = true;

    authService
      .getCurrentSession()
      .then(({ user: sessionUser }) => {
        if (mounted && sessionUser) {
          setUser(sessionUser);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    const unsubscribe = authService.onAuthStateChange((_event, _session, nextUser) => {
      if (mounted) {
        setUser(nextUser ?? null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  /**
   * Inicia sesión con correo y contraseña mediante `authService.signIn`.
   */
  const login = useCallback(async ({ email, password }) => {
    setAuthError(null);
    try {
      const { user: signedInUser } = await authService.signIn({ email, password });
      setUser(signedInUser);
      return { success: true, user: signedInUser };
    } catch (err) {
      const message = err?.message || 'No fue posible iniciar sesión.';
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  /**
   * Crea una nueva cuenta mediante `authService.signUp`.
   */
  const signUp = useCallback(async ({ email, password, metadata }) => {
    setAuthError(null);
    try {
      const result = await authService.signUp({ email, password, metadata });
      if (result.user && !result.requiresEmailConfirmation) {
        setUser(result.user);
      }
      return {
        success: true,
        user: result.user,
        requiresEmailConfirmation: Boolean(result.requiresEmailConfirmation),
      };
    } catch (err) {
      const message = err?.message || 'No fue posible crear la cuenta.';
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  /**
   * Inicia sesión inmediata en modo demostración con el rol elegido ('psychologist' | 'patient').
   */
  const loginAsDemo = useCallback((targetRole = ROLES.PSYCHOLOGIST) => {
    setAuthError(null);
    const { user: demoUser } = authService.loginDemoSession(targetRole);
    setUser(demoUser);
    return { success: true, user: demoUser };
  }, []);

  /**
   * Cierra la sesión actual y regresa al estado invitado/demo ('guest').
   */
  const logout = useCallback(async () => {
    setAuthError(null);
    try {
      await authService.signOut();
    } finally {
      setUser(null);
    }
  }, []);

  const role = user?.role ?? ROLES.GUEST;
  const isAuthenticated = Boolean(user);

  const value = useMemo(
    () => ({
      user,
      role,
      isAuthenticated,
      loading,
      authError,
      login,
      signUp,
      logout,
      loginAsDemo,
    }),
    [user, role, isAuthenticated, loading, authError, login, signUp, logout, loginAsDemo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
