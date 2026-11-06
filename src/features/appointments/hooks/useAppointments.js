import { useState, useEffect, useCallback } from 'react';
import { appointmentRepository } from '../api/appointmentRepository.js';
import { patientRepository } from '../../patients/api/patientRepository.js';
import { isAbortError } from '../../../core/services/index.js';
import { APPOINTMENT_STATUS } from '../../../core/models/enums.js';
import { DEMO_PSYCHOLOGIST_ID } from '../../../core/services/storage/seed.js';

/**
 * Custom hook para gestionar la agenda de citas:
 * - Filtrado por rango de fechas, paciente y estado.
 * - Creación de citas con validación de solapamientos.
 * - Transiciones de estado (PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW).
 *
 * @param {{
 *   initialPatientId?: string,
 *   initialStartDate?: string,
 *   initialEndDate?: string,
 *   initialStatus?: string,
 *   psychologistId?: string,
 * }} [options]
 */
export function useAppointments({
  initialPatientId = '',
  initialStartDate = '',
  initialEndDate = '',
  initialStatus = '',
  psychologistId = DEMO_PSYCHOLOGIST_ID,
} = {}) {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [filters, setFilters] = useState({
    patientId: initialPatientId,
    startDate: initialStartDate,
    endDate: initialEndDate,
    status: initialStatus,
  });

  const fetchAppointments = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const [appointmentsData, patientList] = await Promise.all([
          appointmentRepository.getAll({
            patientId: filters.patientId || undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
            status: filters.status || undefined,
            signal,
          }),
          patientRepository.getAll({ signal }),
        ]);

        setAppointments(appointmentsData);
        setPatients(patientList);
      } catch (err) {
        if (err?.name !== 'AbortError' && !isAbortError(err)) {
          setError(err?.message || 'Error al cargar la agenda de consultas.');
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [filters.patientId, filters.startDate, filters.endDate, filters.status],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchAppointments(controller.signal);
    return () => controller.abort();
  }, [fetchAppointments]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      patientId: '',
      startDate: '',
      endDate: '',
      status: '',
    });
  }, []);

  /**
   * Agenda una nueva cita y mantiene la lista ordenada por horario de inicio.
   * @param {Parameters<typeof appointmentRepository.create>[0]} draftInput
   */
  const scheduleAppointment = useCallback(
    async (draftInput) => {
      setSaving(true);
      try {
        const created = await appointmentRepository.create({
          psychologistId,
          ...draftInput,
        });
        setAppointments((prev) =>
          [...prev, created].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)),
        );
        return { success: true, data: created };
      } catch (err) {
        return {
          success: false,
          error: {
            message: err?.message || 'No se pudo agendar la cita.',
            details: err?.details?.errors || err?.details || null,
            code: err?.code,
          },
        };
      } finally {
        setSaving(false);
      }
    },
    [psychologistId],
  );

  /**
   * Cambia el estado de una cita (PENDING -> CONFIRMED / CANCELLED, CONFIRMED -> COMPLETED / CANCELLED / NO_SHOW).
   * @param {string} id
   * @param {import('../../../core/models/enums.js').AppointmentStatus} nextStatus
   * @param {{ cancellationReason?: string | null, meetingUrl?: string | null }} [options]
   */
  const changeStatus = useCallback(async (id, nextStatus, options = {}) => {
    setUpdatingId(id);
    try {
      const updated = await appointmentRepository.updateStatus(id, nextStatus, options);
      setAppointments((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return { success: true, data: updated };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err?.message || 'No se pudo actualizar el estado de la cita.',
          details: err?.details?.errors || err?.details || null,
          code: err?.code,
        },
      };
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const confirmAppointment = useCallback(
    (id) => changeStatus(id, APPOINTMENT_STATUS.CONFIRMED),
    [changeStatus],
  );

  const completeAppointment = useCallback(
    (id) => changeStatus(id, APPOINTMENT_STATUS.COMPLETED),
    [changeStatus],
  );

  const cancelAppointment = useCallback(
    (id, cancellationReason = 'Cancelada desde la agenda') =>
      changeStatus(id, APPOINTMENT_STATUS.CANCELLED, { cancellationReason }),
    [changeStatus],
  );

  const removeAppointment = useCallback(async (id) => {
    setUpdatingId(id);
    try {
      await appointmentRepository.remove(id);
      setAppointments((prev) => prev.filter((item) => item.id !== id));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err?.message || 'No se pudo eliminar la cita.',
        },
      };
    } finally {
      setUpdatingId(null);
    }
  }, []);

  return {
    appointments,
    patients,
    loading,
    error,
    saving,
    updatingId,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    reload: () => fetchAppointments(),
    scheduleAppointment,
    changeStatus,
    confirmAppointment,
    completeAppointment,
    cancelAppointment,
    removeAppointment,
  };
}
