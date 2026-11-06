import { cx } from '../../utils/cx.js';
import { Spinner } from '../Spinner/Spinner.jsx';
import styles from './Button.module.css';

/**
 * @param {React.ButtonHTMLAttributes<HTMLButtonElement> & {
 *   variant?: 'primary' | 'secondary' | 'ghost' | 'danger',
 *   size?: 'sm' | 'md',
 *   isLoading?: boolean,
 *   fullWidth?: boolean,
 * }} props
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  type = 'button',
  className,
  disabled,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      className={cx(
        styles.button,
        styles[variant],
        size === 'sm' && styles.sm,
        fullWidth && styles.fullWidth,
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading && <Spinner size="sm" tone="inherit" />}
      {children}
    </button>
  );
}
