import React, { useState, useEffect } from 'react';
import { ROLES } from '../../../core/models/enums.js';
import { isSupabaseConfigured } from '../../../core/services/index.js';
import { Alert, Button, Field } from '../../../shared/components/index.js';
import { cx } from '../../../shared/utils/cx.js';
import { useAuth } from '../context/useAuth.js';
import styles from './AuthModal.module.css';

const TABS = Object.freeze({
  SIGN_IN: 'sign_in',
  SIGN_UP: 'sign_up',
});

/**
 * Modal de autenticación con pestañas de 'Iniciar Sesión', 'Crear Cuenta'
 * y sección de 'Acceso Rápido / Demo' (Psicóloga o Paciente sin contraseña).
 */
export function AuthModal({ isOpen, onClose, onAuthSuccess, reasonMessage }) {
  const { login, signUp, loginAsDemo } = useAuth();

  const [activeTab, setActiveTab] = useState(TABS.SIGN_IN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const switchTab = (tab) => {
    setActiveTab(tab);
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setSubmitting(true);

    try {
      if (activeTab === TABS.SIGN_IN) {
        const result = await login({ email, password });
        if (!result.success) {
          setErrorMessage(result.error);
          return;
        }
        onAuthSuccess?.(result.user);
        onClose?.();
      } else {
        const result = await signUp({
          email,
          password,
          metadata: {
            fullName: fullName.trim() || undefined,
            role: ROLES.PATIENT,
          },
        });

        if (!result.success) {
          setErrorMessage(result.error);
          return;
        }

        if (result.requiresEmailConfirmation) {
          setInfoMessage(
            'Cuenta creada. Revisa tu bandeja de correo para confirmar tu cuenta antes de iniciar sesión.',
          );
          setActiveTab(TABS.SIGN_IN);
          return;
        }

        onAuthSuccess?.(result.user);
        onClose?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = (demoRole) => {
    const result = loginAsDemo(demoRole);
    if (result.success) {
      onAuthSuccess?.(result.user);
      onClose?.();
    }
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose?.();
        }
      }}
    >
      <div className={styles.dialog}>
        <div className={styles.header}>
          <div>
            <span className={styles.badge}>
              {isSupabaseConfigured() ? 'Supabase Auth' : 'Acceso a la Plataforma'}
            </span>
            <h2 id="auth-modal-title" className={styles.title}>
              {activeTab === TABS.SIGN_IN ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>
            <p className={styles.subtitle}>
              Accede con tu cuenta personal o utiliza un perfil rápido de prueba.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Cerrar ventana de acceso"
            onClick={onClose}
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        {reasonMessage && (
          <Alert variant="warning" title="Autenticación requerida">
            {reasonMessage}
          </Alert>
        )}

        {/* Pestañas Iniciar Sesión / Crear Cuenta */}
        <div className={styles.tabs} role="tablist" aria-label="Opciones de acceso">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TABS.SIGN_IN}
            className={cx(styles.tabBtn, activeTab === TABS.SIGN_IN && styles.tabBtnActive)}
            onClick={() => switchTab(TABS.SIGN_IN)}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TABS.SIGN_UP}
            className={cx(styles.tabBtn, activeTab === TABS.SIGN_UP && styles.tabBtnActive)}
            onClick={() => switchTab(TABS.SIGN_UP)}
          >
            Crear Cuenta
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {activeTab === TABS.SIGN_UP && (
            <Field id="auth-fullname" label="Nombre completo" required>
              {(a11yProps) => (
                <input
                  {...a11yProps}
                  type="text"
                  placeholder="Ej. Mariana López Herrera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={submitting}
                  required
                />
              )}
            </Field>
          )}

          <Field id="auth-email" label="Correo electrónico" required>
            {(a11yProps) => (
              <input
                {...a11yProps}
                type="email"
                autoComplete="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
            )}
          </Field>

          <Field
            id="auth-password"
            label="Contraseña"
            required
            hint="Mínimo 6 caracteres."
          >
            {(a11yProps) => (
              <input
                {...a11yProps}
                type="password"
                autoComplete={activeTab === TABS.SIGN_IN ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
            )}
          </Field>

          {errorMessage && (
            <Alert variant="error" title="Error de autenticación">
              {errorMessage}
            </Alert>
          )}

          {infoMessage && (
            <Alert variant="info" title="Verificación pendiente">
              {infoMessage}
            </Alert>
          )}

          <Button type="submit" isLoading={submitting} fullWidth>
            {activeTab === TABS.SIGN_IN
              ? submitting
                ? 'Iniciando sesión…'
                : 'Iniciar Sesión'
              : submitting
                ? 'Creando cuenta…'
                : 'Crear Cuenta'}
          </Button>
        </form>

        <div className={styles.divider}>o explora sin contraseña</div>

        {/* Sección de Acceso Rápido / Demo */}
        <section className={styles.demoSection} aria-label="Acceso Rápido / Demo">
          <div className={styles.demoHeader}>
            <h3 className={styles.demoTitle}>Acceso Rápido / Demo</h3>
            <p className={styles.demoHint}>
              Entra directamente con un perfil preconfigurado para probar todas las funciones.
            </p>
          </div>

          <div className={styles.demoActions}>
            <button
              type="button"
              className={styles.demoRoleBtn}
              onClick={() => handleQuickDemo(ROLES.PSYCHOLOGIST)}
              disabled={submitting}
            >
              <span className={styles.demoRoleLabel}>Entrar como Psicóloga</span>
              <span className={styles.demoRoleMeta}>Dra. Elena Vega · Panel Clínico</span>
            </button>

            <button
              type="button"
              className={styles.demoRoleBtn}
              onClick={() => handleQuickDemo(ROLES.PATIENT)}
              disabled={submitting}
            >
              <span className={styles.demoRoleLabel}>Entrar como Paciente</span>
              <span className={styles.demoRoleMeta}>Mariana López · Portal Paciente</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
