import styles from './Field.module.css';

/** Clase base para inputs/selects/textarea, reutilizable fuera de Field. */
export const controlClassName = styles.control;

/**
 * @typedef {Object} ControlA11yProps
 * @property {string} id
 * @property {boolean} aria-invalid
 * @property {string | undefined} aria-describedby
 * @property {string} className
 */

/**
 * Envoltorio accesible de campo de formulario: etiqueta, ayuda y error asociados al control.
 * Usa render prop para inyectar los atributos ARIA correctos en cualquier tipo de control.
 *
 * @param {{
 *   id: string,
 *   label: string,
 *   error?: string,
 *   hint?: React.ReactNode,
 *   required?: boolean,
 *   aside?: React.ReactNode,
 *   children: (a11yProps: ControlA11yProps) => React.ReactNode,
 * }} props
 */
export function Field({ id, label, error, hint, required = false, aside, children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          )}
        </label>
        {aside && <span className={styles.aside}>{aside}</span>}
      </div>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
        className: styles.control,
      })}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
