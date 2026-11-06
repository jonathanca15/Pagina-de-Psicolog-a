import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppointments } from '../hooks/useAppointments.js';
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
} from '../../../shared/components/index.js';
import { cx } from '../../../shared/utils/cx.js';
import styles from './AppointmentCalendar.module.css';

const STATUS_LABELS = Object.freeze({
  [APPOINTMENT_STATUS.PENDING]: 'Pendiente',
  [APPOINTMENT_STATUS.CONFIRMED]: 'Confirmada',
  [APPOINTMENT_STATUS.COMPLETED]: 'Completada',
  [APPOINTMENT_STATUS.CANCELLED]: 'Cancelada',
  [APPOINTMENT_STATUS.NO_SHOW]: 'No asistió',
});

const MODALITY_LABELS = Object.freeze({
  [APPOINTMENT_MODALITY.IN_PERSON]: 'Presencial',
  [APPOINTMENT_MODALITY.ONLINE]: 'En línea',
});

function formatTimeRange(startsAt, endsAt) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Horario inválido';
  const fmt = new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function formatDayHeading(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Fecha sin definir';
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getDefaultDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Componente presentacional: Formulario para agendar una nueva cita.
 */
function AppointmentBookingForm({ patients, saving, onSubmit }) {
  const [form, setForm] = useState({
    patientId: '',
    date: getDefaultDate(),
    time: '10:00',
    durationMinutes: APPOINTMENT_RULES.DEFAULT_DURATION_MIN,
    modality: APPOINTMENT_MODALITY.IN_PERSON,
    meetingUrl: '',
    reason: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  useEffect(() => {
    if (patients.length > 0 && !form.patientId) {
      setForm((prev) => ({
        ...prev,
        patientId: prev.patientId || patients[0].id,
      }));
    }
  }, [patients, form.patientId]);

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const localDateTime = new Date(`${form.date}T${form.time}:00`);
    const startsAt = Number.isNaN(localDateTime.getTime())
      ? ''
      : localDateTime.toISOString();

    const result = await onSubmit({
      patientId: form.patientId.trim(),
      startsAt,
      durationMinutes: Number(form.durationMinutes),
      modality: form.modality,
      meetingUrl:
        form.modality === APPOINTMENT_MODALITY.ONLINE && form.meetingUrl.trim()
          ? form.meetingUrl.trim()
          : null,
      reason: form.reason,
    });

    if (!result.success) {
      if (result.error?.details && typeof result.error.details === 'object') {
        setFieldErrors(result.error.details);
      }
      setGeneralError(result.error?.message || 'Revisa los datos de la cita.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      reason: '',
      meetingUrl: '',
    }));
  };

  return (
    <aside className={styles.cardPanel} aria-label="Agendar nueva cita">
      <h2 className={styles.panelTitle}>Agendar Nueva Consulta</h2>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Field
          id="booking-patient"
          label="Paciente"
          required
          error={fieldErrors.patientId}
          hint="Selecciona al paciente del directorio clínico."
        >
          {(a11yProps) => (
            <select
              {...a11yProps}
              required
              value={form.patientId}
              onChange={(e) => handleChange('patientId', e.target.value)}
              disabled={saving || patients.length === 0}
            >
              <option value="" disabled>
                {patients.length === 0
                  ? 'No hay pacientes registrados'
                  : '— Selecciona un paciente —'}
              </option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.fullName} — {patient.email}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className={styles.rowTwoCols}>
          <Field id="booking-date" label="Fecha" required error={fieldErrors.startsAt}>
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

          <Field id="booking-time" label="Hora de inicio" required>
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
          <Field id="booking-duration" label="Duración" error={fieldErrors.endsAt}>
            {(a11yProps) => (
              <select
                {...a11yProps}
                value={form.durationMinutes}
                onChange={(e) => handleChange('durationMinutes', Number(e.target.value))}
                disabled={saving}
              >
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={50}>50 minutos (estándar)</option>
                <option value={60}>60 minutos</option>
                <option value={90}>90 minutos</option>
              </select>
            )}
          </Field>

          <Field id="booking-modality" label="Modalidad" error={fieldErrors.modality}>
            {(a11yProps) => (
              <select
                {...a11yProps}
                value={form.modality}
                onChange={(e) => handleChange('modality', e.target.value)}
                disabled={saving}
              >
                <option value={APPOINTMENT_MODALITY.IN_PERSON}>Presencial</option>
                <option value={APPOINTMENT_MODALITY.ONLINE}>En línea (Videollamada)</option>
              </select>
            )}
          </Field>
        </div>

        {form.modality === APPOINTMENT_MODALITY.ONLINE && (
          <Field
            id="booking-meeting-url"
            label="Enlace de videollamada"
            error={fieldErrors.meetingUrl}
            hint="URL completa con https://"
          >
            {(a11yProps) => (
              <input
                {...a11yProps}
                type="url"
                placeholder="https://meet.example.com/sesion"
                value={form.meetingUrl}
                onChange={(e) => handleChange('meetingUrl', e.target.value)}
                disabled={saving}
              />
            )}
          </Field>
        )}

        <Field
          id="booking-reason"
          label="Motivo de consulta"
          error={fieldErrors.reason}
          aside={`${form.reason.length}/${APPOINTMENT_RULES.MAX_REASON_LENGTH}`}
        >
          {(a11yProps) => (
            <textarea
              {...a11yProps}
              rows={3}
              maxLength={APPOINTMENT_RULES.MAX_REASON_LENGTH}
              placeholder="Describe brevemente el objetivo o motivo de la sesión..."
              value={form.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              disabled={saving}
            />
          )}
        </Field>

        {generalError && <Alert variant="error" title="No se pudo agendar">{generalError}</Alert>}

        <Button type="submit" isLoading={saving} fullWidth>
          {saving ? 'Agendando cita…' : 'Agendar Cita'}
        </Button>
      </form>
    </aside>
  );
}

/**
 * Componente presentacional: Barra de filtros por paciente, estado y rango de fechas.
 */
function AppointmentFiltersBar({ filters, patients, onFilterChange, onClear }) {
  const hasActiveFilters = Boolean(
    filters.patientId || filters.startDate || filters.endDate || filters.status,
  );

  return (
    <section className={styles.filtersCard} aria-label="Filtros de agenda">
      <div className={styles.filtersGrid}>
        <Field id="filter-patient" label="Paciente">
          {(a11yProps) => (
            <select
              {...a11yProps}
              value={filters.patientId}
              onChange={(e) => onFilterChange('patientId', e.target.value)}
            >
              <option value="">Todos los pacientes</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.fullName} — {patient.email}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field id="filter-status" label="Estado">
          {(a11yProps) => (
            <select
              {...a11yProps}
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field id="filter-start-date" label="Desde fecha">
          {(a11yProps) => (
            <input
              {...a11yProps}
              type="date"
              value={filters.startDate}
              onChange={(e) => onFilterChange('startDate', e.target.value)}
            />
          )}
        </Field>

        <Field id="filter-end-date" label="Hasta fecha">
          {(a11yProps) => (
            <input
              {...a11yProps}
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange('endDate', e.target.value)}
            />
          )}
        </Field>
      </div>

      {hasActiveFilters && (
        <div className={styles.filtersActions}>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Limpiar filtros
          </Button>
        </div>
      )}
    </section>
  );
}

/**
 * Componente presentacional: Tarjeta individual de cita con acciones de transición de estado.
 */
function AppointmentCard({
  appointment,
  patientName,
  isUpdating,
  onChangeStatus,
  onDelete,
}) {
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState(null);

  const canConfirm = canTransition(appointment.status, APPOINTMENT_STATUS.CONFIRMED);
  const canComplete = canTransition(appointment.status, APPOINTMENT_STATUS.COMPLETED);
  const canCancel = canTransition(appointment.status, APPOINTMENT_STATUS.CANCELLED);

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      setCancelError('Indica el motivo de la cancelación.');
      return;
    }
    setCancelError(null);
    const res = await onChangeStatus(appointment.id, APPOINTMENT_STATUS.CANCELLED, {
      cancellationReason: cancelReason.trim(),
    });
    if (res.success) {
      setShowCancelPrompt(false);
      setCancelReason('');
    } else {
      setCancelError(res.error?.message || 'Error al cancelar.');
    }
  };

  return (
    <article
      className={cx(styles.appointmentCard, styles[`border_${appointment.status}`])}
      aria-label={`Cita con ${patientName}`}
    >
      <div className={styles.cardTop}>
        <div className={styles.timeAndPatient}>
          <span className={styles.timeRange}>
            {formatTimeRange(appointment.startsAt, appointment.endsAt)}
          </span>
          <span className={styles.patientName}>
            {patientName} <small>({appointment.patientId})</small>
          </span>
        </div>

        <div className={styles.badgesRow}>
          <span className={styles.modalityBadge}>
            {MODALITY_LABELS[appointment.modality] || appointment.modality}
          </span>
          <span className={cx(styles.statusBadge, styles[`status_${appointment.status}`])}>
            {STATUS_LABELS[appointment.status] || appointment.status}
          </span>
        </div>
      </div>

      {appointment.reason && <p className={styles.reasonText}>{appointment.reason}</p>}

      {appointment.modality === APPOINTMENT_MODALITY.ONLINE && appointment.meetingUrl && (
        <a
          href={appointment.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.meetingLink}
        >
          Unirse a videollamada: {appointment.meetingUrl}
        </a>
      )}

      {appointment.status === APPOINTMENT_STATUS.CANCELLED && appointment.cancellationReason && (
        <div className={styles.cancellationNote}>
          <strong>Motivo de cancelación:</strong> {appointment.cancellationReason}
        </div>
      )}

      {showCancelPrompt && (
        <div className={styles.cancelBox}>
          <Field
            id={`cancel-reason-${appointment.id}`}
            label="Motivo de la cancelación"
            required
            error={cancelError}
          >
            {(a11yProps) => (
              <input
                {...a11yProps}
                type="text"
                placeholder="Ej. Reprogramación solicitada por el paciente"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                disabled={isUpdating}
              />
            )}
          </Field>
          <div className={styles.cancelBoxActions}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowCancelPrompt(false);
                setCancelError(null);
              }}
              disabled={isUpdating}
            >
              Volver
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isUpdating}
              onClick={handleConfirmCancel}
            >
              Confirmar cancelación
            </Button>
          </div>
        </div>
      )}

      <div className={styles.cardActions}>
        <div className={styles.statusButtons}>
          {canConfirm && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isUpdating}
              onClick={() => onChangeStatus(appointment.id, APPOINTMENT_STATUS.CONFIRMED)}
            >
              Confirmar
            </Button>
          )}

          {canComplete && (
            <Button
              variant="secondary"
              size="sm"
              isLoading={isUpdating}
              onClick={() => onChangeStatus(appointment.id, APPOINTMENT_STATUS.COMPLETED)}
            >
              Marcar Completada
            </Button>
          )}

          {canCancel && !showCancelPrompt && (
            <Button
              variant="danger"
              size="sm"
              disabled={isUpdating}
              onClick={() => setShowCancelPrompt(true)}
            >
              Cancelar cita
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          disabled={isUpdating}
          onClick={() => onDelete(appointment.id)}
        >
          Eliminar
        </Button>
      </div>
    </article>
  );
}

/**
 * Contenedor principal: Agenda de Consultas (Calendario / Lista agrupada por día + Formulario).
 */
export function AppointmentCalendar() {
  const {
    appointments,
    patients,
    loading,
    error,
    saving,
    updatingId,
    filters,
    updateFilter,
    clearFilters,
    reload,
    scheduleAppointment,
    changeStatus,
    removeAppointment,
  } = useAppointments();

  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const patientMap = useMemo(() => {
    const map = new Map();
    patients.forEach((p) => map.set(p.id, p.fullName));
    return map;
  }, [patients]);

  const groupedByDay = useMemo(() => {
    const groups = new Map();
    appointments.forEach((appt) => {
      const dayKey = String(appt.startsAt || '').slice(0, 10) || 'sin-fecha';
      if (!groups.has(dayKey)) {
        groups.set(dayKey, []);
      }
      groups.get(dayKey).push(appt);
    });
    return Array.from(groups.entries());
  }, [appointments]);

  const stats = useMemo(() => {
    return appointments.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === APPOINTMENT_STATUS.PENDING) acc.pending += 1;
        if (item.status === APPOINTMENT_STATUS.CONFIRMED) acc.confirmed += 1;
        if (item.status === APPOINTMENT_STATUS.COMPLETED) acc.completed += 1;
        return acc;
      },
      { total: 0, pending: 0, confirmed: 0, completed: 0 },
    );
  }, [appointments]);

  const handleCreateAppointment = async (draftInput) => {
    const res = await scheduleAppointment(draftInput);
    if (res.success) {
      setToast({
        id: Date.now(),
        message: 'Cita agendada correctamente.',
        variant: 'success',
      });
    }
    return res;
  };

  const handleChangeStatus = async (id, nextStatus, options) => {
    const res = await changeStatus(id, nextStatus, options);
    if (res.success) {
      setToast({
        id: Date.now(),
        message: `Estado actualizado a "${STATUS_LABELS[nextStatus] || nextStatus}".`,
        variant: 'success',
      });
    } else {
      setToast({
        id: Date.now(),
        message: res.error?.message || 'No se pudo cambiar el estado.',
        variant: 'error',
      });
    }
    return res;
  };

  const handleDelete = async (id) => {
    const res = await removeAppointment(id);
    if (res.success) {
      setToast({
        id: Date.now(),
        message: 'Cita eliminada de la agenda.',
        variant: 'success',
      });
    } else {
      setToast({
        id: Date.now(),
        message: res.error?.message || 'No se pudo eliminar la cita.',
        variant: 'error',
      });
    }
  };

  return (
    <section className={styles.container} aria-label="Agenda de Consultas">
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Agenda de Consultas</h1>
          <p className={styles.subtitle}>
            Programa sesiones, valida disponibilidad sin traslapes y gestiona confirmaciones.
          </p>
        </div>

        <div className={styles.summaryBadges}>
          <span className={styles.statChip}>
            Total <strong className={styles.statValue}>{stats.total}</strong>
          </span>
          <span className={styles.statChip}>
            Pendientes <strong className={styles.statValue}>{stats.pending}</strong>
          </span>
          <span className={styles.statChip}>
            Confirmadas <strong className={styles.statValue}>{stats.confirmed}</strong>
          </span>
          <span className={styles.statChip}>
            Completadas <strong className={styles.statValue}>{stats.completed}</strong>
          </span>
        </div>
      </header>

      <div className={styles.layoutGrid}>
        <AppointmentBookingForm
          patients={patients}
          saving={saving}
          onSubmit={handleCreateAppointment}
        />

        <div>
          <AppointmentFiltersBar
            filters={filters}
            patients={patients}
            onFilterChange={updateFilter}
            onClear={clearFilters}
          />

          {loading && <LoadingState label="Cargando agenda de citas…" />}

          {!loading && error && (
            <ErrorState
              title="No se pudo cargar la agenda"
              message={error}
              onRetry={reload}
            />
          )}

          {!loading && !error && appointments.length === 0 && (
            <EmptyState
              title="No hay citas programadas"
              description="No se encontraron citas con los filtros seleccionados o aún no se han agendado consultas."
              action={
                (filters.patientId || filters.startDate || filters.endDate || filters.status) && (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Mostrar todas las citas
                  </Button>
                )
              }
            />
          )}

          {!loading && !error && groupedByDay.length > 0 && (
            <div className={styles.dayGroups}>
              {groupedByDay.map(([dayKey, dayAppointments]) => (
                <section key={dayKey} className={styles.daySection}>
                  <div className={styles.dayHeader}>
                    <h3 className={styles.dayTitle}>
                      {formatDayHeading(dayAppointments[0].startsAt)}
                    </h3>
                    <span className={styles.dayCount}>
                      {dayAppointments.length}{' '}
                      {dayAppointments.length === 1 ? 'consulta' : 'consultas'}
                    </span>
                  </div>

                  <div className={styles.appointmentList}>
                    {dayAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        patientName={
                          patientMap.get(appointment.patientId) || 'Paciente externo'
                        }
                        isUpdating={updatingId === appointment.id}
                        onChangeStatus={handleChangeStatus}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />
    </section>
  );
}
