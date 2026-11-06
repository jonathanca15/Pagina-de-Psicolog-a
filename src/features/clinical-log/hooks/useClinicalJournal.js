import { useState, useEffect, useCallback } from 'react';
import { clinicalLogRepository } from '../api/clinicalLogRepository.js';
import { isAbortError } from '../../../core/services/index.js';

export function useClinicalJournal(initialPatientId = '') {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patientIdFilter, setPatientIdFilter] = useState(initialPatientId);
  const [dateFilter, setDateFilter] = useState('');

  const fetchLogs = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const data = await clinicalLogRepository.getAll({
          patientId: patientIdFilter || undefined,
          sessionDate: dateFilter || undefined,
          signal,
        });
        setLogs(data);
      } catch (err) {
        if (err?.name !== 'AbortError' && !isAbortError(err)) {
          setError(err?.message || 'Error al cargar la bitácora');
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [patientIdFilter, dateFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchLogs(controller.signal);
    return () => controller.abort();
  }, [fetchLogs]);

  const addEntry = useCallback(async (entryData) => {
    try {
      const created = await clinicalLogRepository.create(entryData);
      setLogs((prev) =>
        [created, ...prev].sort(
          (a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime(),
        ),
      );
      return { success: true, data: created };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err?.message || 'No se pudo guardar la entrada clínica.',
          details: err?.details?.errors || err?.details || null,
          code: err?.code,
        },
      };
    }
  }, []);

  const removeEntry = useCallback(async (id) => {
    try {
      await clinicalLogRepository.remove(id);
      setLogs((prev) => prev.filter((item) => item.id !== id));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err?.message || 'No se pudo eliminar la entrada.',
      };
    }
  }, []);

  return {
    logs,
    loading,
    error,
    patientIdFilter,
    setPatientIdFilter,
    dateFilter,
    setDateFilter,
    reload: () => fetchLogs(),
    addEntry,
    removeEntry,
  };
}
