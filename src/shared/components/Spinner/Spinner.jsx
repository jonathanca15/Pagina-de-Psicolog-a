import { cx } from '../../utils/cx.js';
import styles from './Spinner.module.css';

/**
 * Indicador giratorio puramente visual. El texto accesible lo aporta el contenedor
 * (LoadingState, Button…) para no duplicar anuncios en lectores de pantalla.
 * @param {{ size?: 'sm' | 'md' | 'lg', tone?: 'primary' | 'inherit', className?: string }} props
 */
export function Spinner({ size = 'md', tone = 'primary', className }) {
  return <span className={cx(styles.spinner, styles[size], styles[tone], className)} aria-hidden="true" />;
}
