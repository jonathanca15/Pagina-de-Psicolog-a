import { describe, it, expect } from 'vitest';
import {
  APPOINTMENT_MODALITY,
  APPOINTMENT_STATUS,
  APPOINTMENT_RULES,
  createAppointmentDraft,
  validateAppointment,
  canTransition,
  appointmentsOverlap,
  isActiveAppointment,
} from '../index.js';

describe('Modelo Appointment — Lógica crítica de negocio', () => {
  describe('createAppointmentDraft y cálculo de endsAt según duración', () => {
    it('calcula endsAt sumando la duración por defecto (50 min) a startsAt', () => {
      const draft = createAppointmentDraft({
        patientId: 'pat-001',
        psychologistId: 'psy-001',
        startsAt: '2026-10-25T10:00:00.000Z',
      });

      expect(draft.startsAt).toBe('2026-10-25T10:00:00.000Z');
      expect(draft.endsAt).toBe('2026-10-25T10:50:00.000Z');
      expect(draft.status).toBe(APPOINTMENT_STATUS.PENDING);
      expect(draft.modality).toBe(APPOINTMENT_MODALITY.IN_PERSON);
      expect(draft.meetingUrl).toBeNull();
    });

    it('calcula endsAt correctamente cuando se especifica una duración personalizada (ej. 90 min)', () => {
      const draft = createAppointmentDraft({
        patientId: 'pat-001',
        psychologistId: 'psy-001',
        startsAt: '2026-10-25T15:30:00.000Z',
        durationMinutes: 90,
        modality: APPOINTMENT_MODALITY.ONLINE,
        meetingUrl: 'https://meet.example.com/sala-1',
        reason: ' Evaluación inicial ',
      });

      expect(draft.startsAt).toBe('2026-10-25T15:30:00.000Z');
      expect(draft.endsAt).toBe('2026-10-25T17:00:00.000Z');
      expect(draft.reason).toBe('Evaluación inicial');
      expect(draft.meetingUrl).toBe('https://meet.example.com/sala-1');
    });

    it('valida que la duración esté dentro de los límites permitidos (30 a 120 min)', () => {
      const tooShort = createAppointmentDraft({
        patientId: 'pat-001',
        psychologistId: 'psy-001',
        startsAt: '2026-10-25T10:00:00.000Z',
        durationMinutes: 15,
      });
      const shortResult = validateAppointment(tooShort);
      expect(shortResult.valid).toBe(false);
      expect(shortResult.errors.endsAt).toContain(`${APPOINTMENT_RULES.MIN_DURATION_MIN}`);

      const tooLong = createAppointmentDraft({
        patientId: 'pat-001',
        psychologistId: 'psy-001',
        startsAt: '2026-10-25T10:00:00.000Z',
        durationMinutes: 180,
      });
      const longResult = validateAppointment(tooLong);
      expect(longResult.valid).toBe(false);
      expect(longResult.errors.endsAt).toContain(`${APPOINTMENT_RULES.MAX_DURATION_MIN}`);
    });
  });

  describe('Detección de solapamiento de citas (appointmentsOverlap)', () => {
    it('detecta solapamiento parcial cuando una cita inicia antes de que termine la anterior', () => {
      const first = {
        startsAt: '2026-10-25T10:00:00.000Z',
        endsAt: '2026-10-25T10:50:00.000Z',
      };
      const second = {
        startsAt: '2026-10-25T10:30:00.000Z',
        endsAt: '2026-10-25T11:20:00.000Z',
      };

      expect(appointmentsOverlap(first, second)).toBe(true);
      expect(appointmentsOverlap(second, first)).toBe(true);
    });

    it('detecta solapamiento total cuando una cita está contenida dentro de otra o tiene el mismo horario', () => {
      const outer = {
        startsAt: '2026-10-25T10:00:00.000Z',
        endsAt: '2026-10-25T12:00:00.000Z',
      };
      const inner = {
        startsAt: '2026-10-25T10:15:00.000Z',
        endsAt: '2026-10-25T11:05:00.000Z',
      };

      expect(appointmentsOverlap(outer, inner)).toBe(true);
      expect(appointmentsOverlap(inner, outer)).toBe(true);
    });

    it('NO reporta solapamiento en citas inmediatamente consecutivas (intervalos semiabiertos)', () => {
      const first = {
        startsAt: '2026-10-25T10:00:00.000Z',
        endsAt: '2026-10-25T10:50:00.000Z',
      };
      const consecutive = {
        startsAt: '2026-10-25T10:50:00.000Z',
        endsAt: '2026-10-25T11:40:00.000Z',
      };

      expect(appointmentsOverlap(first, consecutive)).toBe(false);
      expect(appointmentsOverlap(consecutive, first)).toBe(false);
    });
  });

  describe('Máquina de estados (canTransition y isActiveAppointment)', () => {
    it('permite transiciones desde PENDING únicamente hacia CONFIRMED o CANCELLED', () => {
      expect(canTransition(APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED)).toBe(true);
      expect(canTransition(APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CANCELLED)).toBe(true);
      expect(canTransition(APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.COMPLETED)).toBe(false);
      expect(canTransition(APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.NO_SHOW)).toBe(false);
    });

    it('permite transiciones desde CONFIRMED hacia COMPLETED, CANCELLED o NO_SHOW', () => {
      expect(canTransition(APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.COMPLETED)).toBe(true);
      expect(canTransition(APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CANCELLED)).toBe(true);
      expect(canTransition(APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.NO_SHOW)).toBe(true);
      expect(canTransition(APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.PENDING)).toBe(false);
    });

    it('impide cualquier transición desde estados terminales (COMPLETED, CANCELLED, NO_SHOW)', () => {
      const terminalStates = [
        APPOINTMENT_STATUS.COMPLETED,
        APPOINTMENT_STATUS.CANCELLED,
        APPOINTMENT_STATUS.NO_SHOW,
      ];
      const allStates = Object.values(APPOINTMENT_STATUS);

      for (const fromState of terminalStates) {
        for (const toState of allStates) {
          expect(canTransition(fromState, toState)).toBe(false);
        }
      }
    });

    it('identifica como citas activas solo aquellas en estado PENDING o CONFIRMED', () => {
      expect(isActiveAppointment({ status: APPOINTMENT_STATUS.PENDING })).toBe(true);
      expect(isActiveAppointment({ status: APPOINTMENT_STATUS.CONFIRMED })).toBe(true);
      expect(isActiveAppointment({ status: APPOINTMENT_STATUS.CANCELLED })).toBe(false);
      expect(isActiveAppointment({ status: APPOINTMENT_STATUS.COMPLETED })).toBe(false);
    });
  });
});
