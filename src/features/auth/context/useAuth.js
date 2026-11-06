import { useContext } from 'react';
import { AuthContext } from './AuthContext.jsx';

/**
 * Custom hook para consumir el estado y acciones de autenticación.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un <AuthProvider>.');
  }
  return context;
}
