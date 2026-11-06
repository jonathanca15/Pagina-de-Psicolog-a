import { useState, useEffect, useCallback, useMemo } from 'react';
import { patientRepository } from '../api/patientRepository.js';
import { isAbortError } from '../../../core/services/index.js';

/**
 * Custom hook para gestionar el directorio de pacientes:
 * - Listado y búsqueda reactiva.
 * - Registro y edición de pacientes.
 * - Selección de paciente activo para consultar su expediente clínico.
 *
 * @param {{ initialQuery?: string, initialSelectedId?: string | null }} [options]
 */
export function usePatients({ initialQuery = '', initialSelectedId = null } = {}) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [selectedPatientId, setSelectedPatientId] = useState(initialSelectedId);

  const fetchPatients = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const data = await patientRepository.getAll({ query, signal });
        setPatients(data);
      } catch (err) {
        if (err?.name !== 'AbortError' && !isAbortError(err)) {
          setError(err?.message || 'Error al cargar el directorio de pacientes.');
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [query],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchPatients(controller.signal);
    return () => controller.abort();
  }, [fetchPatients]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) || null,
    [patients, selectedPatientId],
  );

  const createPatient = useCallback(async (patientData) => {
    setSaving(true);
    try {
      const created = await patientRepository.create(patientData);
      setPatients((prev) =>
        [...prev, created].sort((a, b) =>
          String(a.fullName || '').localeCompare(String(b.fullName || ''), 'es', {
            sensitivity: 'base',
          }),
        ),
      );
      setSelectedPatientId(created.id);
      return { success: true, data: created };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err?.message || 'No se pudo registrar el paciente.',
          details: err?.details?.errors || err?.details || null,
          code: err?.code,
        },
      };
    } finally {
      setSaving(false);
    }
  }, []);

  const updatePatient = useCallback(async (id, patch) => {
    setSaving(true);
    try {
      const updated = await patientRepository.update(id, patch);
      setPatients((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return { success: true, data: updated };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err?.message || 'No se pudo actualizar el paciente.',
          details: err?.details?.errors || err?.details || null,
          code: err?.code,
        },
      };
    } finally {
      setSaving(false);
    }
  }, []);

  const selectPatient = useCallback((id) => {
    setSelectedPatientId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPatientId(null);
  }, []);

  return {
    patients,
    loading,
    error,
    saving,
    query,
    setQuery,
    selectedPatientId,
    selectedPatient,
    selectPatient,
    clearSelection,
    reload: () => fetchPatients(),
    createPatient,
    updatePatient,
  };
}
