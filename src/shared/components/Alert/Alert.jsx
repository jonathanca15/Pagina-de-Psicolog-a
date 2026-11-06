import { cx } from '../../utils/cx.js';
import styles from './Alert.module.css';

/**
 * Mensaje en línea (banner) para retroalimentación contextual dentro de un formulario.
 * @param {{ variant?: 'error' | 'success' | 'info', title?: string, children?: React.ReactNode }} props
 */
export function Alert({ variant = 'info', title, children }) {
  return (
    <div className={cx(styles.alert, styles[variant])} role={variant === 'error' ? 'alert' : 'status'}>
      {title && <p className={styles.title}>{title}</p>}
      {children && <div className={styles.body}>{children}</div>}
    </div>
  );
}
