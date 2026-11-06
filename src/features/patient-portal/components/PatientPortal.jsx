import React, { useState, useEffect, useCallback } from 'react';
import { appointmentRepository } from '../../appointments/api/appointmentRepository.js';
import { useAuth } from '../../auth/context/useAuth.js';
import { patientRepository } from '../../patients/api/patientRepository.js';
import { resourceRepository } from '../../resources/api/resourceRepository.js';
import { ResourceArticleContent } from '../../resources/components/ResourceArticleContent.jsx';
import { isAbortError } from '../../../core/services/index.js';
import { DEMO_PSYCHOLOGIST_ID } from '../../../core/services/storage/seed.js';
import {
  APPOINTMENT_STATUS,
  APPOINTMENT_MODALITY,
  APPOINTMENT_RULES,
  canTransition,
} from '../../../core/models/index.js';
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Toast,
  controlClassName,
} from '../../../shared/components/index.js';
import { cx } from '../../../shared/utils/cx.js';
import styles from './PatientPortal.module.css';

export const AUTH_BOOKING_MESSAGE =
  'Debes iniciar sesión o registrarte para agendar una consulta';

const STATUS_LABELS = Object.freeze({
  [APPOINTMENT_STATUS.PENDING]: 'Solicitud pendiente',
  [APPOINTMENT_STATUS.CONFIRMED]: 'Confirmada',
  [APPOINTMENT_STATUS.COMPLETED]: 'Completada',
  [APPOINTMENT_STATUS.CANCELLED]: 'Cancelada',
  [APPOINTMENT_STATUS.NO_SHOW]: 'No asistió',
});

const MODALITY_LABELS = Object.freeze({
  [APPOINTMENT_MODALITY.IN_PERSON]: 'Presencial',
  [APPOINTMENT_MODALITY.ONLINE]: 'En línea (Videollamada)',
});

function formatAppointmentDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Fecha inválida';
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatAppointmentTime(startsAt, endsAt) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const fmt = new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${fmt.format(start)} – ${fmt.format(end)} hrs`;
}

function getTomorrowDateString() {
  const tomorrow = new Date(Date.now() + 86_400_000);
  return tomorrow.toISOString().slice(0, 10);
}

/**
 * Componente presentacional: Formulario para que el paciente solicite una nueva cita.
 * Si el visitante no está autenticado, intercepta la interacción o envío y dispara `onRequireAuth`.
 */
function PatientAppointmentForm({
  patientId,
  isAuthenticated,
  saving,
  onSubmit,
  onRequireAuth,
}) {
  const [form, setForm] = useState({
    date: getTomorrowDateString(),
    time: '11:00',
    durationMinutes: APPOINTMENT_RULES.DEFAULT_DURATION_MIN,
    modality: APPOINTMENT_MODALITY.ONLINE,
    reason: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  const triggerAuthGuard = (event) => {
    if (!isAuthenticated) {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      setGeneralError(AUTH_BOOKING_MESSAGE);
      onRequireAuth?.(AUTH_BOOKING_MESSAGE);
      return true;
    }
    return false;
  };

  const handleChange = (field, value) => {
    if (triggerAuthGuard()) return;
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
    if (triggerAuthGuard(e)) {
      return;
    }

    setFieldErrors({});
    setGeneralError(null);

    const parsedStart = new Date(`${form.date}T${form.time}:00`);
    const startsAt = Number.isNaN(parsedStart.getTime()) ? '' : parsedStart.toISOString();

    const result = await onSubmit({
      patientId,
      psychologistId: DEMO_PSYCHOLOGIST_ID,
      startsAt,
      durationMinutes: Number(form.durationMinutes),
      modality: form.modality,
      meetingUrl:
        form.modality === APPOINTMENT_MODALITY.ONLINE
          ? 'https://meet.example.com/consulta-psicologia'
          : null,
      reason: form.reason,
    });

    if (!result.success) {
      if (result.error?.details && typeof result.error.details === 'object') {
        setFieldErrors(result.error.details);
      }
      setGeneralError(result.error?.message || 'No se pudo registrar tu solicitud de cita.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      reason: '',
    }));
  };

  return (
    <aside className={styles.cardPanel} aria-label="Solicitar nueva cita">
      <h3 className={styles.panelTitle}>Solicitar Nueva Cita</h3>
      <form
        className={styles.form}
        onSubmit={handleSubmit}
        onFocusCapture={(e) => {
          if (!isAuthenticated) {
            e.target.blur?.();
            triggerAuthGuard(e);
          }
        }}
        noValidate
      >
        <div className={styles.rowTwoCols}>
          <Field id="patient-appt-date" label="Fecha deseada" required error={fieldErrors.startsAt}>
            {(a11yProps) => (
              <input
                {...a11yProps}
                type="date"
                value={form.date}
                onChange={(e) => handleChange('date', e.target.value)}
                disabled={saving}
              />
            )}
          </Field>

          <Field id="patient-appt-time" label="Hora" required>
            {(a11yProps) => (
              <input
                {...a11yProps}
                type="time"
                value={form.time}
                onChange={(e) => handleChange('time', e.target.value)}
                disabled={saving}
              />
            )}
          </Field>
        </div>

        <div className={styles.rowTwoCols}>
          <Field id="patient-appt-modality" label="Modalidad" required error={fieldErrors.modality}>
            {(a11yProps) => (
              <select
                {...a11yProps}
                value={form.modality}
                onChange={(e) => handleChange('modality', e.target.value)}
                disabled={saving}
              >
                <option value={APPOINTMENT_MODALITY.ONLINE}>En línea (Videollamada)</option>
                <option value={APPOINTMENT_MODALITY.IN_PERSON}>Presencial en consultorio</option>
              </select>
            )}
          </Field>

          <Field id="patient-appt-duration" label="Duración" error={fieldErrors.endsAt}>
            {(a11yProps) => (
              <select
                {...a11yProps}
                value={form.durationMinutes}
                onChange={(e) => handleChange('durationMinutes', Number(e.target.value))}
                disabled={saving}
              >
                <option value={50}>50 minutos (estándar)</option>
                <option value={60}>60 minutos</option>
              </select>
            )}
          </Field>
        </div>

        <Field
          id="patient-appt-reason"
          label="Motivo de consulta"
          error={fieldErrors.reason}
          aside={`${form.reason.length}/${APPOINTMENT_RULES.MAX_REASON_LENGTH}`}
          hint="Cuéntanos brevemente cómo podemos apoyarte en esta sesión."
        >
          {(a11yProps) => (
            <textarea
              {...a11yProps}
              rows={3}
              maxLength={APPOINTMENT_RULES.MAX_REASON_LENGTH}
              placeholder="Ej. Seguimiento de técnicas para manejo de estrés laboral..."
              value={form.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              disabled={saving}
            />
          )}
        </Field>

        {generalError && (
          <Alert
            variant={isAuthenticated ? 'error' : 'warning'}
            title={isAuthenticated ? 'Horario no disponible' : 'Inicio de sesión requerido'}
          >
            {generalError}
          </Alert>
        )}

        <Button type="submit" isLoading={saving} fullWidth>
          {saving ? 'Enviando solicitud…' : 'Solicitar Cita'}
        </Button>
      </form>
    </aside>
  );
}

/**
 * Componente presentacional: Tarjeta de cita en la vista del paciente.
 */
function PatientAppointmentItem({ appointment, isCancelling, onCancel }) {
  const canCancel = canTransition(appointment.status, APPOINTMENT_STATUS.CANCELLED);

  return (
    <article
      className={cx(styles.appointmentCard, styles[`border_${appointment.status}`])}
      aria-label={`Cita del ${formatAppointmentDate(appointment.startsAt)}`}
    >
      <div className={styles.appointmentHeader}>
        <div>
          <div className={styles.dateLabel}>{formatAppointmentDate(appointment.startsAt)}</div>
          <div className={styles.timeLabel}>
            {formatAppointmentTime(appointment.startsAt, appointment.endsAt)}
          </div>
        </div>

        <div className={styles.badges}>
          <span className={styles.modalityTag}>
            {MODALITY_LABELS[appointment.modality] || appointment.modality}
          </span>
          <span className={cx(styles.badge, styles[`status_${appointment.status}`])}>
            {STATUS_LABELS[appointment.status] || appointment.status}
          </span>
        </div>
      </div>

      {appointment.reason && <p className={styles.reason}>{appointment.reason}</p>}

      {appointment.modality === APPOINTMENT_MODALITY.ONLINE &&
        appointment.meetingUrl &&
        appointment.status !== APPOINTMENT_STATUS.CANCELLED && (
          <a
            href={appointment.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.meetingLink}
          >
            Acceder a la sala de videollamada ({appointment.meetingUrl})
          </a>
        )}

      {canCancel && (
        <div className={styles.cardFooter}>
          <Button
            variant="danger"
            size="sm"
            isLoading={isCancelling}
            onClick={() => onCancel(appointment.id)}
          >
            Cancelar solicitud
          </Button>
        </div>
      )}
    </article>
  );
}

/**
 * Componente presentacional: Sección privada 'Mi Perfil' del paciente autenticado.
 */
function PatientProfileSection({ user, patientRecord, onSaveProfile }) {
  const [phone, setPhone] = useState(patientRecord?.phone || '');
  const [emergencyName, setEmergencyName] = useState(
    patientRecord?.emergencyContact?.name || '',
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    patientRecord?.emergencyContact?.phone || '',
  );
  const [emergencyRelation, setEmergencyRelation] = useState(
    patientRecord?.emergencyContact?.relationship || '',
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPhone(patientRecord?.phone || '');
    setEmergencyName(patientRecord?.emergencyContact?.name || '');
    setEmergencyPhone(patientRecord?.emergencyContact?.phone || '');
    setEmergencyRelation(patientRecord?.emergencyContact?.relationship || '');
  }, [patientRecord]);

  const initials = String(user?.fullName || 'P')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveProfile({
        phone: phone.trim(),
        emergencyContact:
          emergencyName.trim() && emergencyPhone.trim()
            ? {
                name: emergencyName.trim(),
                phone: emergencyPhone.trim(),
                relationship: emergencyRelation.trim() || 'Contacto de emergencia',
              }
            : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.sectionBlock} aria-labelledby="section-profile-title">
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="section-profile-title" className={styles.sectionTitle}>
            Mi Perfil
          </h2>
          <p className={styles.sectionSubtitle}>
            Consulta los datos de tu cuenta y mantén actualizada tu información de contacto.
          </p>
        </div>
      </div>

      <div className={styles.profileGrid}>
        <div className={styles.profileSummaryCard}>
          <div className={styles.profileAvatar} aria-hidden="true">
            {initials || 'P'}
          </div>
          <h3 className={styles.profileName}>{user?.fullName || 'Paciente'}</h3>
          <ul className={styles.profileMetaList}>
            <li className={styles.profileMetaItem}>
              <strong>Correo:</strong> {user?.email || 'Sin correo'}
            </li>
            <li className={styles.profileMetaItem}>
              <strong>Expediente ID:</strong> {user?.id}
            </li>
            <li className={styles.profileMetaItem}>
              <strong>Consentimiento informado:</strong>{' '}
              {patientRecord?.consentSigned ? 'Firmado digitalmente' : 'Activo en plataforma'}
            </li>
          </ul>
        </div>

        <div className={styles.cardPanel}>
          <h3 className={styles.panelTitle}>Datos de Contacto y Emergencia</h3>
          <form className={styles.form} onSubmit={handleSubmit}>
            <Field id="profile-phone" label="Teléfono de contacto">
              {(a11yProps) => (
                <input
                  {...a11yProps}
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                />
              )}
            </Field>

            <div className={styles.rowTwoCols}>
              <Field id="profile-emergency-name" label="Contacto de emergencia (Nombre)">
                {(a11yProps) => (
                  <input
                    {...a11yProps}
                    type="text"
                    placeholder="Nombre completo"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    disabled={saving}
                  />
                )}
              </Field>

              <Field id="profile-emergency-relation" label="Parentesco">
                {(a11yProps) => (
                  <input
                    {...a11yProps}
                    type="text"
                    placeholder="Ej. Madre, Pareja, Hermano"
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    disabled={saving}
                  />
                )}
              </Field>
            </div>

            <Field id="profile-emergency-phone" label="Teléfono de emergencia">
              {(a11yProps) => (
                <input
                  {...a11yProps}
                  type="tel"
                  placeholder="+52 55 8765 4321"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  disabled={saving}
                />
              )}
            </Field>

            <Button type="submit" isLoading={saving}>
              {saving ? 'Guardando cambios…' : 'Actualizar datos de contacto'}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

/**
 * Componente presentacional: Tarjeta interactiva de recurso educativo.
 */
function ResourceCard({ resource, isSelected, onSelect }) {
  return (
    <article className={styles.resourceCard}>
      <div>
        <div className={styles.resourceMeta}>
          <span className={styles.categoryTag}>{resource.category}</span>
          <span className={styles.readingTime}>
            ⏱ {resource.readingTime || `${resource.readingTimeMinutes} min de lectura`}
          </span>
        </div>
        <h3 className={styles.resourceTitle}>{resource.title}</h3>
        <p className={styles.resourceSummary}>{resource.summary}</p>
      </div>

      <Button
        variant={isSelected ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onSelect(isSelected ? null : resource)}
      >
        {isSelected ? 'Cerrar lectura' : 'Leer guía completa →'}
      </Button>
    </article>
  );
}

/**
 * Contenedor principal: Portal del Paciente y Vista Pública de Recursos Educativos.
 * - Sin sesión iniciada: Muestra Recursos Educativos y protege el agendamiento de citas.
 * - Con sesión de Paciente: Toma `user.id` del usuario autenticado y habilita las pestañas
 *   privadas ('Mis Citas / Agendar', 'Mi Perfil', 'Recursos Educativos').
 */
export function PatientPortal({ activeTab = 'appointments', onTabChange, onRequireAuth }) {
  const { user, isAuthenticated } = useAuth();
  const activePatientId = isAuthenticated && user?.id ? user.id : '';

  const [internalTab, setInternalTab] = useState(activeTab);
  const currentTab = onTabChange ? activeTab : internalTab;
  const handleSelectTab = (tab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // Perfil extendido del paciente autenticado
  const [patientRecord, setPatientRecord] = useState(null);

  // Estado de Citas del Paciente
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(null);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  // Estado de Recursos de Salud Mental
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeResource, setActiveResource] = useState(null);

  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const categories = resourceRepository.getCategories();

  // Carga del expediente del paciente autenticado (si existe en el directorio)
  useEffect(() => {
    if (!isAuthenticated || !activePatientId) {
      setPatientRecord(null);
      return undefined;
    }

    const controller = new AbortController();
    patientRepository
      .getById(activePatientId, { signal: controller.signal })
      .then((record) => {
        setPatientRecord(record);
      })
      .catch(() => {
        setPatientRecord(null);
      });

    return () => controller.abort();
  }, [isAuthenticated, activePatientId]);

  // Carga de citas del paciente autenticado
  const loadPatientAppointments = useCallback(
    async (signal) => {
      if (!isAuthenticated || !activePatientId) {
        setAppointments([]);
        setAppointmentsLoading(false);
        return;
      }
      setAppointmentsLoading(true);
      setAppointmentsError(null);
      try {
        const data = await appointmentRepository.getAll({
          patientId: activePatientId,
          signal,
        });
        setAppointments(data);
      } catch (err) {
        if (err?.name !== 'AbortError' && !isAbortError(err)) {
          setAppointmentsError(err?.message || 'No se pudieron cargar tus citas.');
        }
      } finally {
        if (!signal?.aborted) {
          setAppointmentsLoading(false);
        }
      }
    },
    [isAuthenticated, activePatientId],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadPatientAppointments(controller.signal);
    return () => controller.abort();
  }, [loadPatientAppointments]);

  // Carga de recursos psicoeducativos
  const loadResources = useCallback(
    async (signal) => {
      setResourcesLoading(true);
      setResourcesError(null);
      try {
        const list = await resourceRepository.getAll({
          category: selectedCategory || undefined,
          query: searchQuery || undefined,
          signal,
        });
        setResources(list);
      } catch (err) {
        if (err?.name !== 'AbortError' && !isAbortError(err)) {
          setResourcesError(err?.message || 'No se pudieron cargar los recursos educativos.');
        }
      } finally {
        if (!signal?.aborted) {
          setResourcesLoading(false);
        }
      }
    },
    [selectedCategory, searchQuery],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadResources(controller.signal);
    return () => controller.abort();
  }, [loadResources]);

  const handleRequestAppointment = async (draftInput) => {
    if (!isAuthenticated || !activePatientId) {
      onRequireAuth?.(AUTH_BOOKING_MESSAGE);
      return {
        success: false,
        error: { message: AUTH_BOOKING_MESSAGE },
      };
    }

    setBookingSaving(true);
    try {
      const created = await appointmentRepository.create({
        ...draftInput,
        patientId: activePatientId,
      });
      setAppointments((prev) =>
        [...prev, created].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)),
      );
      setToast({
        id: Date.now(),
        message: 'Solicitud de cita registrada con éxito.',
        variant: 'success',
      });
      return { success: true, data: created };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err?.message || 'No fue posible agendar la cita.',
          details: err?.details?.errors || err?.details || null,
        },
      };
    } finally {
      setBookingSaving(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    setCancellingId(appointmentId);
    try {
      const updated = await appointmentRepository.updateStatus(
        appointmentId,
        APPOINTMENT_STATUS.CANCELLED,
        { cancellationReason: 'Cancelada por el paciente desde el portal.' },
      );
      setAppointments((prev) => prev.map((item) => (item.id === appointmentId ? updated : item)));
      setToast({
        id: Date.now(),
        message: 'Tu cita ha sido cancelada.',
        variant: 'success',
      });
    } catch (err) {
      setToast({
        id: Date.now(),
        message: err?.message || 'No se pudo cancelar la cita.',
        variant: 'error',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleSaveProfile = async (patch) => {
    if (!activePatientId) return;
    try {
      if (patientRecord) {
        const updated = await patientRepository.update(activePatientId, patch);
        setPatientRecord(updated);
      }
      setToast({
        id: Date.now(),
        message: 'Tus datos de perfil se han actualizado correctamente.',
        variant: 'success',
      });
    } catch (err) {
      setToast({
        id: Date.now(),
        message: err?.message || 'No se pudieron actualizar los datos de perfil.',
        variant: 'error',
      });
    }
  };

  const renderResourcesSection = () => (
    <section className={styles.sectionBlock} aria-labelledby="section-resources-title">
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="section-resources-title" className={styles.sectionTitle}>
            Recursos Educativos de Salud Mental
          </h2>
          <p className={styles.sectionSubtitle}>
            Artículos y guías psicoeducativas elaboradas para acompañarte en tu bienestar diario.
          </p>
        </div>
      </div>

      <div className={styles.resourcesToolbar}>
        <div className={styles.categoryPills} role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            className={cx(
              styles.categoryPill,
              selectedCategory === '' && styles.categoryPillActive,
            )}
            onClick={() => setSelectedCategory('')}
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={cx(
                styles.categoryPill,
                selectedCategory === category && styles.categoryPillActive,
              )}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className={styles.searchBox}>
          <input
            type="search"
            className={controlClassName}
            placeholder="Buscar guía o tema…"
            aria-label="Buscar guía o tema"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {activeResource && (
        <article className={styles.readerPanel} aria-label={`Lectura: ${activeResource.title}`}>
          <div className={styles.readerHeader}>
            <div>
              <div className={styles.resourceMeta}>
                <span className={styles.categoryTag}>{activeResource.category}</span>
                <span className={styles.readingTime}>
                  ⏱{' '}
                  {activeResource.readingTime ||
                    `${activeResource.readingTimeMinutes || 5} min de lectura`}
                </span>
              </div>
              <h3 className={styles.readerTitle}>{activeResource.title}</h3>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setActiveResource(null)}>
              Cerrar artículo
            </Button>
          </div>

          <ResourceArticleContent
            summary={activeResource.summary}
            content={activeResource.content}
          />
        </article>
      )}

      {resourcesLoading && <LoadingState label="Cargando biblioteca de recursos…" />}

      {!resourcesLoading && resourcesError && (
        <ErrorState
          title="Error al cargar los recursos"
          message={resourcesError}
          onRetry={() => loadResources()}
        />
      )}

      {!resourcesLoading && !resourcesError && resources.length === 0 && (
        <EmptyState
          title="No se encontraron recursos"
          description="No hay guías que coincidan con tu búsqueda actual."
          action={
            (selectedCategory || searchQuery) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedCategory('');
                  setSearchQuery('');
                }}
              >
                Ver todos los recursos
              </Button>
            )
          }
        />
      )}

      {!resourcesLoading && !resourcesError && resources.length > 0 && (
        <div className={styles.resourcesGrid}>
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              isSelected={activeResource?.id === resource.id}
              onSelect={setActiveResource}
            />
          ))}
        </div>
      )}
    </section>
  );

  const renderAppointmentsSection = () => (
    <section className={styles.sectionBlock} aria-labelledby="section-appointments-title">
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="section-appointments-title" className={styles.sectionTitle}>
            Mis Citas y Agendar
          </h2>
          <p className={styles.sectionSubtitle}>
            Elige fecha, hora y modalidad (presencial o en línea) para tu próxima consulta.
          </p>
        </div>
      </div>

      <div className={styles.appointmentsGrid}>
        <PatientAppointmentForm
          patientId={activePatientId}
          isAuthenticated={isAuthenticated}
          saving={bookingSaving}
          onSubmit={handleRequestAppointment}
          onRequireAuth={onRequireAuth}
        />

        <div>
          {!isAuthenticated ? (
            <div className={styles.authGateCard} aria-label="Inicia sesión para ver tus citas">
              <span className={styles.authGateBadge}>Historial Privado</span>
              <h3 className={styles.authGateTitle}>
                Inicia sesión para consultar tu historial de citas
              </h3>
              <p className={styles.authGateText}>
                Accede a tu cuenta de paciente para revisar tus próximas sesiones confirmadas,
                enlaces de videollamada y gestionar o solicitar nuevas consultas.
              </p>
              <Button
                type="button"
                onClick={() => onRequireAuth?.(AUTH_BOOKING_MESSAGE)}
              >
                Iniciar Sesión o Registrarse
              </Button>
            </div>
          ) : (
            <>
              {appointmentsLoading && <LoadingState label="Consultando tus citas programadas…" />}

              {!appointmentsLoading && appointmentsError && (
                <ErrorState
                  title="No pudimos cargar tus citas"
                  message={appointmentsError}
                  onRetry={() => loadPatientAppointments()}
                />
              )}

              {!appointmentsLoading && !appointmentsError && appointments.length === 0 && (
                <EmptyState
                  title="Aún no tienes citas registradas"
                  description="Utiliza el formulario para solicitar tu primera sesión presencial o en línea."
                />
              )}

              {!appointmentsLoading && !appointmentsError && appointments.length > 0 && (
                <div className={styles.appointmentsList}>
                  {appointments.map((appointment) => (
                    <PatientAppointmentItem
                      key={appointment.id}
                      appointment={appointment}
                      isCancelling={cancellingId === appointment.id}
                      onCancel={handleCancelAppointment}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );

  return (
    <div className={styles.container}>
      {/* Cabecera principal según sesión activa o vista pública */}
      <section className={styles.heroBanner} aria-label="Bienvenida a la plataforma">
        <div className={styles.heroInfo}>
          <span className={styles.heroBadge}>
            {isAuthenticated ? 'Portal del Paciente' : 'Bienestar y Salud Mental'}
          </span>
          <h1 className={styles.heroTitle}>
            {isAuthenticated
              ? `Hola, ${user?.fullName || 'Paciente'}`
              : 'Espacio Psicológico y Recursos de Salud Mental'}
          </h1>
          <p className={styles.heroSubtitle}>
            {isAuthenticated
              ? 'Desde aquí puedes gestionar tus próximas sesiones, actualizar tu perfil y explorar guías prácticas para tu bienestar emocional.'
              : 'Explora nuestras guías psicoeducativas gratuitas. Inicia sesión o regístrate cuando desees agendar una consulta personalizada.'}
          </p>
        </div>

        {!isAuthenticated && (
          <div className={styles.heroActions}>
            <Button
              type="button"
              onClick={() => onRequireAuth?.(AUTH_BOOKING_MESSAGE)}
            >
              Agendar una Consulta
            </Button>
          </div>
        )}
      </section>

      {/* Si el paciente está autenticado, muestra la vista correspondiente a la pestaña activa */}
      {isAuthenticated ? (
        <>
          <div className={styles.portalTabs} role="tablist" aria-label="Secciones del portal">
            <button
              type="button"
              role="tab"
              aria-selected={currentTab === 'appointments'}
              className={cx(
                styles.portalTabBtn,
                currentTab === 'appointments' && styles.portalTabBtnActive,
              )}
              onClick={() => handleSelectTab('appointments')}
            >
              Mis Citas / Agendar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={currentTab === 'profile'}
              className={cx(
                styles.portalTabBtn,
                currentTab === 'profile' && styles.portalTabBtnActive,
              )}
              onClick={() => handleSelectTab('profile')}
            >
              Mi Perfil
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={currentTab === 'resources'}
              className={cx(
                styles.portalTabBtn,
                currentTab === 'resources' && styles.portalTabBtnActive,
              )}
              onClick={() => handleSelectTab('resources')}
            >
              Recursos Educativos
            </button>
          </div>

          {currentTab === 'profile' && (
            <PatientProfileSection
              user={user}
              patientRecord={patientRecord}
              onSaveProfile={handleSaveProfile}
            />
          )}
          {currentTab === 'resources' && renderResourcesSection()}
          {currentTab === 'appointments' && renderAppointmentsSection()}
        </>
      ) : (
        <>
          {/* Vista pública sin sesión: Recursos Educativos + Sección protegida de agendamiento */}
          {renderResourcesSection()}
          {renderAppointmentsSection()}
        </>
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
