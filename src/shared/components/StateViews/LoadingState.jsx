import { cx } from '../../utils/cx.js';
import { Spinner } from '../Spinner/Spinner.jsx';
import styles from './StateView.module.css';

/**
 * Estado de carga genérico, anunciado a lectores de pantalla.
 * @param {{ label?: string, compact?: boolean }} props
 */
export function LoadingState({ label = 'Cargando…', compact = false }) {
  return (
    <div className={cx(styles.wrapper, compact && styles.compact)} role="status" aria-live="polite">
      <Spinner size="lg" />
      <p className={styles.message}>{label}</p>
    </div>
  );
}
