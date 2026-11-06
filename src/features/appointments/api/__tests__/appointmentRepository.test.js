import { describe, it, expect, beforeEach } from 'vitest';
import { appointmentRepository } from '../appointmentRepository.js';
import { storageService, STORAGE_ERROR_CODES } from '../../../../core/services/index.js';
import { APPOINTMENT_MODALITY, APPOINTMENT_STATUS } from '../../../../core/models/index.js';

describe('appointmentRepository — Reglas de negocio y conflictos de agenda', () => {
  beforeEach(async () => {
    storageService.configureNetwork({
      latency: { min: 0, max: 0 },
      failureRate: 0,
    });
    await storageService.reset();
  });

  it('agenda correctamente una cita cuando el horario está disponible', async () => {
    const created = await appointmentRepository.create({
      patientId: 'pat-001',
      psychologistId: 'psy-001',
      startsAt: '2026-11-10T10:00:00.000Z',
      durationMinutes: 50,
      modality: APPOINTMENT_MODALITY.ONLINE,
      meetingUrl: 'https://meet.example.com/sesion-1',
      reason: 'Primera sesión de seguimiento',
    });

    expect(created).toHaveProperty('id');
    expect(created.status).toBe(APPOINTMENT_STATUS.PENDING);
    expect(created.startsAt).toBe('2026-11-10T10:00:00.000Z');
    expect(created.endsAt).toBe('2026-11-10T10:50:00.000Z');
  });

  it('lanza error de conflicto (CONFLICT) al intentar agendar en un horario ya ocupado', async () => {
    await appointmentRepository.create({
      patientId: 'pat-001',
      psychologistId: 'psy-001',
      startsAt: '2026-11-10T10:00:00.000Z',
      durationMinutes: 50,
      modality: APPOINTMENT_MODALITY.IN_PERSON,
      reason: 'Sesión inicial',
    });

    // Intento de agendar otra cita que empieza a las 10:30 (se solapa con 10:00 - 10:50)
    await expect(
      appointmentRepository.create({
        patientId: 'pat-002',
        psychologistId: 'psy-001',
        startsAt: '2026-11-10T10:30:00.000Z',
        durationMinutes: 50,
        modality: APPOINTMENT_MODALITY.IN_PERSON,
        reason: 'Intento en horario ocupado',
      }),
    ).rejects.toMatchObject({
      code: STORAGE_ERROR_CODES.CONFLICT,
    });
  });

  it('permite agendar en un horario previamente ocupado si la cita anterior fue cancelada', async () => {
    const first = await appointmentRepository.create({
      patientId: 'pat-001',
      psychologistId: 'psy-001',
      startsAt: '2026-11-10T12:00:00.000Z',
      durationMinutes: 50,
    });

    await appointmentRepository.updateStatus(first.id, APPOINTMENT_STATUS.CANCELLED, {
      cancellationReason: 'Paciente solicitó cambio de día',
    });

    const replacement = await appointmentRepository.create({
      patientId: 'pat-002',
      psychologistId: 'psy-001',
      startsAt: '2026-11-10T12:00:00.000Z',
      durationMinutes: 50,
    });

    expect(replacement.id).toBeDefined();
    expect(replacement.status).toBe(APPOINTMENT_STATUS.PENDING);
  });

  it('permite agendar una cita inmediatamente consecutiva (10:50 tras 10:00–10:50)', async () => {
    await appointmentRepository.create({
      patientId: 'pat-001',
      psychologistId: 'psy-001',
      startsAt: '2026-11-10T10:00:00.000Z',
      durationMinutes: 50,
    });

    const consecutive = await appointmentRepository.create({
      patientId: 'pat-002',
      psychologistId: 'psy-001',
      startsAt: '2026-11-10T10:50:00.000Z',
      durationMinutes: 50,
    });

    expect(consecutive.startsAt).toBe('2026-11-10T10:50:00.000Z');
  });
});
