import { cx } from '../../utils/cx.js';
import styles from './Skeleton.module.css';

/**
 * Bloque placeholder con animación shimmer (CSS puro).
 * @param {{ width?: string | number, height?: string | number, radius?: string, className?: string }} props
 */
export function Skeleton({ width = '100%', height = '1em', radius, className }) {
  return (
    <span
      className={cx(styles.skeleton, className)}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}
