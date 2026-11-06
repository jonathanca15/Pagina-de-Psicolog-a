import React, { useState, useEffect, useCallback } from 'react';
import { appointmentRepository } from '../../appointments/api/appointmentRepository.js';
import { clinicalLogRepository } from '../../clinical-log/api/clinicalLogRepository.js';
import { isAbortError } from '../../../core/services/index.js';
import { APPOINTMENT_STATUS, APPOINTMENT_MODALITY } from '../../../core/models/index.js';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/index.js';
import { cx } from '../../../shared/utils/cx.js';
import styles from './Patients.module.css';

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

function formatDateTime(isoString) {
  if (!isoString) return 'No especificado';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDateOnly(isoString) {
  if (!isoString) return 'No registrado';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Expediente Clínico de un Paciente:
 * Muestra sus datos generales y dos secciones en pestañas:
 * 1) Citas asociadas (appointmentRepository.getAll({ patientId }))
 * 2) Bitácora clínica asociada (clinicalLogRepository.getAll({ patientId }))
 *
 * @param {{ patient: import('../../../core/models/patient.js').Patient | null }} props
 */
export function PatientRecord({ patient }) {
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [clinicalLogs, setClinicalLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const patientId = patient?.id;

  const loadRecordData = useCallback(
    async (signal) => {
      if (!patientId) return;
      setLoading(true);
      setError(null);

      try {
        const [apptsData, logsData] = await Promise.all([
          appointmentRepository.getAll({ patientId, signal }),
          clinicalLogRepository.getAll({ patientId, signal }),
        ]);

        setAppointments(apptsData);
        setClinicalLogs(logsData);
      } catch (err) {
        if (err?.name !== 'AbortError' && !isAbortError(err)) {
          setError(err?.message || 'No se pudo cargar el expediente clínico del paciente.');
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [patientId],
  );

  useEffect(() => {
    if (!patientId) return undefined;
    const controller = new AbortController();
    loadRecordData(controller.signal);
    return () => controller.abort();
  }, [patientId, loadRecordData]);

  if (!patient) {
    return (
      <EmptyState
        title="Selecciona un paciente del directorio"
        description="Haz clic en cualquier paciente de la lista izquierda para consultar su ficha personal, historial de citas y bitácora clínica."
      />
    );
  }

  return (
    <section className={styles.recordPanel} aria-label={`Expediente clínico de ${patient.fullName}`}>
      <header className={styles.recordHeader}>
        <div>
          <h2 className={styles.recordTitle}>{patient.fullName}</h2>
          <span className={styles.patientIdBadge}>ID: {patient.id}</span>
        </div>

        {patient.consentAccepted && (
          <span className={styles.consentTag}>✓ Consentimiento informado activo</span>
        )}
      </header>

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Correo electrónico</span>
          <span className={styles.infoValue}>{patient.email}</span>
        </div>

        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Teléfono</span>
          <span className={styles.infoValue}>{patient.phone || 'No registrado'}</span>
        </div>

        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Fecha de nacimiento</span>
          <span className={styles.infoValue}>
            {patient.birthDate ? formatDateOnly(patient.birthDate) : 'No registrada'}
          </span>
        </div>

        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Contacto de emergencia</span>
          <span className={styles.infoValue}>
            {patient.emergencyContact
              ? `${patient.emergencyContact.name} (${patient.emergencyContact.relationship || 'Contacto'}) — ${patient.emergencyContact.phone}`
              : 'Sin contacto registrado'}
          </span>
        </div>
      </div>

      {/* Pestañas del expediente */}
      <div className={styles.tabsBar} role="tablist" aria-label="Secciones del expediente">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'appointments'}
          className={cx(
            styles.tabButton,
            activeTab === 'appointments' && styles.tabButtonActive,
          )}
          onClick={() => setActiveTab('appointments')}
        >
          Citas Asociadas
          <span className={styles.tabCount}>{appointments.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'clinical-logs'}
          className={cx(
            styles.tabButton,
            activeTab === 'clinical-logs' && styles.tabButtonActive,
          )}
          onClick={() => setActiveTab('clinical-logs')}
        >
          Bitácora Clínica
          <span className={styles.tabCount}>{clinicalLogs.length}</span>
        </button>
      </div>

      {loading && <LoadingState label="Cargando historial del expediente…" compact />}

      {!loading && error && (
        <ErrorState
          title="Error al consultar el expediente"
          message={error}
          onRetry={() => loadRecordData()}
          compact
        />
      )}

      {/* Pestaña 1: Citas asociadas */}
      {!loading && !error && activeTab === 'appointments' && (
        <div>
          {appointments.length === 0 ? (
            <EmptyState
              title="Sin citas registradas"
              description="Este paciente aún no tiene citas agendadas en el sistema."
              compact
            />
          ) : (
            <div className={styles.itemsStack}>
              {appointments.map((appt) => (
                <article key={appt.id} className={styles.historyCard}>
                  <div className={styles.historyTop}>
                    <span className={styles.historyTitle}>
                      {formatDateTime(appt.startsAt)} ({MODALITY_LABELS[appt.modality] || appt.modality})
                    </span>
                    <span className={styles.badgeStatus}>
                      {STATUS_LABELS[appt.status] || appt.status}
                    </span>
                  </div>
                  {appt.reason && <p className={styles.historyBody}>{appt.reason}</p>}
                  {appt.cancellationReason && (
                    <p className={styles.errorText}>
                      Cancelación: {appt.cancellationReason}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pestaña 2: Bitácora clínica asociada */}
      {!loading && !error && activeTab === 'clinical-logs' && (
        <div>
          {clinicalLogs.length === 0 ? (
            <EmptyState
              title="Sin entradas en la bitácora"
              description="Aún no se han registrado notas clínicas para este paciente."
              compact
            />
          ) : (
            <div className={styles.itemsStack}>
              {clinicalLogs.map((log) => (
                <article key={log.id} className={styles.historyCard}>
                  <div className={styles.historyTop}>
                    <span className={styles.historyTitle}>{log.title}</span>
                    <span className={styles.historyDate}>
                      {formatDateOnly(log.sessionDate)}
                    </span>
                  </div>
                  {log.content && <p className={styles.historyBody}>{log.content}</p>}
                  {log.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {log.tags.map((tag) => (
                        <span key={tag} className={styles.patientIdBadge}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
