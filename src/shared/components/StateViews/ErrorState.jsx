import { cx } from '../../utils/cx.js';
import { Button } from '../Button/Button.jsx';
import styles from './StateView.module.css';

/**
 * Estado de error genérico con acción de reintento opcional.
 * @param {{
 *   title?: string,
 *   message?: string,
 *   onRetry?: () => void,
 *   retryLabel?: string,
 *   isRetrying?: boolean,
 *   compact?: boolean,
 * }} props
 */
export function ErrorState({
  title = 'Algo salió mal',
  message = 'No pudimos completar la operación.',
  onRetry,
  retryLabel = 'Reintentar',
  isRetrying = false,
  compact = false,
}) {
  return (
    <div className={cx(styles.wrapper, styles.bordered, compact && styles.compact)} role="alert">
      <div className={cx(styles.icon, styles.iconError)} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5M12 16.5h.01" />
        </svg>
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onRetry} isLoading={isRetrying}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
