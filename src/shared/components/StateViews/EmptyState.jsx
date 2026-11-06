import { cx } from '../../utils/cx.js';
import styles from './StateView.module.css';

/**
 * Estado vacío genérico. `action` permite inyectar cualquier CTA (Open/Closed).
 * @param {{ title: string, description?: string, action?: React.ReactNode, compact?: boolean }} props
 */
export function EmptyState({ title, description, action, compact = false }) {
  return (
    <div className={cx(styles.wrapper, styles.bordered, compact && styles.compact)}>
      <div className={cx(styles.icon, styles.iconEmpty)} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h16v14H4z" />
          <path d="M4 14h4l1.5 2h5L16 14h4" />
        </svg>
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.message}>{description}</p>}
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  );
}
