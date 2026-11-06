import React, { useState } from 'react';
import { Alert, Button, Field } from '../../../shared/components/index.js';
import styles from './Patients.module.css';

const INITIAL_FORM = Object.freeze({
  fullName: '',
  email: '',
  phone: '',
  birthDate: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelationship: '',
  consentAccepted: false,
});

/**
 * Componente presentacional: Modal de registro de un nuevo paciente.
 *
 * @param {{
 *   isOpen: boolean,
 *   saving?: boolean,
 *   onClose: () => void,
 *   onSubmit: (patientData: object) => Promise<{ success: boolean, error?: { message?: string, details?: Record<string, string> | null } }>,
 * }} props
 */
export function PatientFormModal({ isOpen, saving = false, onClose, onSubmit }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const hasEmergencyInput = Boolean(
      form.emergencyName.trim() ||
        form.emergencyPhone.trim() ||
        form.emergencyRelationship.trim(),
    );

    const payload = {
      fullName: form.fullName,
      email: form.email,
      phone: form.phone || null,
      birthDate: form.birthDate || null,
      emergencyContact: hasEmergencyInput
        ? {
            name: form.emergencyName.trim(),
            phone: form.emergencyPhone.trim(),
            relationship: form.emergencyRelationship.trim() || 'Contacto familiar',
          }
        : null,
      consentAccepted: Boolean(form.consentAccepted),
    };

    const res = await onSubmit(payload);
    if (!res.success) {
      if (res.error?.details && typeof res.error.details === 'object') {
        setFieldErrors(res.error.details);
      }
      setGeneralError(res.error?.message || 'Revisa los campos marcados en el formulario.');
      return;
    }

    setForm(INITIAL_FORM);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !saving) {
      onClose();
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-new-patient-title"
      onClick={handleBackdropClick}
    >
      <div className={styles.modalDialog}>
        <header className={styles.modalHeader}>
          <h2 id="modal-new-patient-title" className={styles.modalTitle}>
            Registrar Nuevo Paciente
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cerrar
          </Button>
        </header>

        <form className={styles.formGrid} onSubmit={handleSubmit} noValidate>
          <Field
            id="patient-full-name"
            label="Nombre completo"
            required
            error={fieldErrors.fullName}
          >
            {(a11yProps) => (
              <input
                {...a11yProps}
                type="text"
                placeholder="Ej. Elena Gómez Ríos"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                disabled={saving}
              />
            )}
          </Field>

          <Field
            id="patient-email"
            label="Correo electrónico"
            required
            error={fieldErrors.email}
          >
            {(a11yProps) => (
              <input
                {...a11yProps}
                type="email"
                placeholder="elena.gomez@example.com"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={saving}
              />
            )}
          </Field>

          <div className={styles.rowTwoCols}>
            <Field id="patient-phone" label="Teléfono" error={fieldErrors.phone}>
              {(a11yProps) => (
                <input
                  {...a11yProps}
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={saving}
                />
              )}
            </Field>

            <Field
              id="patient-birth-date"
              label="Fecha de nacimiento"
              error={fieldErrors.birthDate}
            >
              {(a11yProps) => (
                <input
                  {...a11yProps}
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  disabled={saving}
                />
              )}
            </Field>
          </div>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Contacto de Emergencia (Opcional)</legend>

            <div className={styles.rowTwoCols}>
              <Field id="emergency-name" label="Nombre del contacto">
                {(a11yProps) => (
                  <input
                    {...a11yProps}
                    type="text"
                    placeholder="Nombre y apellido"
                    value={form.emergencyName}
                    onChange={(e) => handleChange('emergencyName', e.target.value)}
                    disabled={saving}
                  />
                )}
              </Field>

              <Field id="emergency-phone" label="Teléfono de emergencia">
                {(a11yProps) => (
                  <input
                    {...a11yProps}
                    type="tel"
                    placeholder="+52 55 9876 5432"
                    value={form.emergencyPhone}
                    onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                    disabled={saving}
                  />
                )}
              </Field>
            </div>

            <Field id="emergency-relationship" label="Parentesco o relación">
              {(a11yProps) => (
                <input
                  {...a11yProps}
                  type="text"
                  placeholder="Ej. Madre, Hermano, Pareja"
                  value={form.emergencyRelationship}
                  onChange={(e) => handleChange('emergencyRelationship', e.target.value)}
                  disabled={saving}
                />
              )}
            </Field>

            {fieldErrors.emergencyContact && (
              <span className={styles.errorText}>{fieldErrors.emergencyContact}</span>
            )}
          </fieldset>

          <div>
            <label className={styles.consentRow} htmlFor="patient-consent">
              <input
                id="patient-consent"
                type="checkbox"
                checked={form.consentAccepted}
                onChange={(e) => handleChange('consentAccepted', e.target.checked)}
                disabled={saving}
              />
              <span>
                El paciente ha leído y firmado el <strong>consentimiento informado</strong> para el
                tratamiento psicológico y resguardo confidencial de su expediente clínico. *
              </span>
            </label>
            {fieldErrors.consentAccepted && (
              <span className={styles.errorText}>{fieldErrors.consentAccepted}</span>
            )}
          </div>

          {generalError && (
            <Alert variant="error" title="No se pudo registrar">
              {generalError}
            </Alert>
          )}

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              {saving ? 'Guardando paciente…' : 'Guardar Paciente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
