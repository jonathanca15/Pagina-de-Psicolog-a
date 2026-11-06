import { useEffect } from 'react';
import { cx } from '../../utils/cx.js';
import styles from './Toast.module.css';

/**
 * @typedef {Object} ToastMessage
 * @property {string | number} id       Cambia en cada notificación para reiniciar el temporizador.
 * @property {string} message
 * @property {'success' | 'error'} [variant]
 */

/**
 * Región de notificaciones flotantes.
 * La región `aria-live` permanece SIEMPRE montada: los lectores de pantalla solo
 * anuncian cambios en regiones vivas que ya existían en el DOM.
 *
 * @param {{ toast: ToastMessage | null, onDismiss: () => void, duration?: number }} props
 *        `onDismiss` debe ser estable (useCallback) para no reiniciar el temporizador.
 */
export function Toast({ toast, onDismiss, duration = 4500 }) {
  useEffect(() => {
    if (!toast || !duration) return undefined;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [toast, duration, onDismiss]);

  return (
    <div className={styles.region} aria-live="polite" aria-atomic="true">
      {toast && (
        <div key={toast.id} className={cx(styles.toast, styles[toast.variant ?? 'success'])} role="status">
          <span className={styles.icon} aria-hidden="true">
            {toast.variant === 'error' ? '!' : '✓'}
          </span>
          <p className={styles.message}>{toast.message}</p>
          <button type="button" className={styles.close} onClick={onDismiss} aria-label="Cerrar notificación">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
