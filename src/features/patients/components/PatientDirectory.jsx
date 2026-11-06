import React, { useState, useEffect, useCallback } from 'react';
import { usePatients } from '../hooks/usePatients.js';
import { PatientFormModal } from './PatientFormModal.jsx';
import { PatientRecord } from './PatientRecord.jsx';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Toast,
  controlClassName,
} from '../../../shared/components/index.js';
import { cx } from '../../../shared/utils/cx.js';
import styles from './Patients.module.css';

/**
 * Contenedor principal del Directorio y Expediente Clínico de Pacientes.
 */
export function PatientDirectory() {
  const {
    patients,
    loading,
    error,
    saving,
    query,
    setQuery,
    selectedPatientId,
    selectedPatient,
    selectPatient,
    reload,
    createPatient,
  } = usePatients();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  // Seleccionar automáticamente el primer paciente al cargar si no hay ninguno activo
  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      selectPatient(patients[0].id);
    }
  }, [patients, selectedPatientId, selectPatient]);

  const handleCreatePatient = async (patientData) => {
    const res = await createPatient(patientData);
    if (res.success) {
      setToast({
        id: Date.now(),
        message: `Paciente "${res.data.fullName}" registrado correctamente.`,
        variant: 'success',
      });
    }
    return res;
  };

  return (
    <section className={styles.container} aria-label="Directorio y Expediente de Pacientes">
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Directorio de Pacientes</h1>
          <p className={styles.subtitle}>
            Consulta fichas personales, contactos de emergencia, citas y bitácora clínica por
            paciente.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)}>+ Nuevo Paciente</Button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <input
            type="search"
            className={controlClassName}
            placeholder="Buscar paciente por nombre, correo, teléfono o ID…"
            aria-label="Buscar paciente"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {query && (
          <Button variant="ghost" size="sm" onClick={() => setQuery('')}>
            Limpiar búsqueda
          </Button>
        )}
      </div>

      {loading && <LoadingState label="Cargando directorio de pacientes…" />}

      {!loading && error && (
        <ErrorState
          title="No se pudo cargar el directorio"
          message={error}
          onRetry={reload}
        />
      )}

      {!loading && !error && patients.length === 0 && (
        <EmptyState
          title="No se encontraron pacientes"
          description={
            query
              ? 'Ningún paciente coincide con tu búsqueda actual.'
              : 'Aún no hay pacientes registrados en la plataforma.'
          }
          action={
            query ? (
              <Button variant="secondary" size="sm" onClick={() => setQuery('')}>
                Mostrar todos
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                Registrar primer paciente
              </Button>
            )
          }
        />
      )}

      {!loading && !error && patients.length > 0 && (
        <div className={styles.workspaceGrid}>
          <div className={styles.patientList} role="list" aria-label="Lista de pacientes">
            {patients.map((patient) => {
              const isSelected = patient.id === selectedPatientId;
              return (
                <button
                  key={patient.id}
                  type="button"
                  role="listitem"
                  className={cx(
                    styles.patientCard,
                    isSelected && styles.patientCardSelected,
                  )}
                  onClick={() => selectPatient(patient.id)}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  <div className={styles.patientCardHeader}>
                    <span className={styles.patientName}>{patient.fullName}</span>
                    <span className={styles.patientIdBadge}>{patient.id}</span>
                  </div>
                  <div className={styles.patientMeta}>
                    <span>{patient.email}</span>
                    {patient.phone && <span>Tel: {patient.phone}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <PatientRecord patient={selectedPatient} />
        </div>
      )}

      <PatientFormModal
        isOpen={isModalOpen}
        saving={saving}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePatient}
      />

      <Toast toast={toast} onDismiss={dismissToast} />
    </section>
  );
}
