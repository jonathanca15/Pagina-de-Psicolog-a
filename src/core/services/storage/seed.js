import { COLLECTIONS } from '../../models/enums.js';

/**
 * Datos semilla de demostración. También sirven como ejemplos JSON
 * concretos de cada modelo.
 */
export const DEMO_PSYCHOLOGIST_ID = 'psy-001';

export const seedData = Object.freeze({
  [COLLECTIONS.PATIENTS]: [
    {
      id: 'pat-001',
      fullName: 'Mariana López Herrera',
      email: 'mariana.lopez@example.com',
      phone: '+52 55 1234 5678',
      birthDate: '1994-03-21',
      emergencyContact: { name: 'Jorge López', phone: '+52 55 8765 4321', relationship: 'Hermano' },
      consentAccepted: true,
      createdAt: '2026-09-01T15:00:00.000Z',
      updatedAt: '2026-09-01T15:00:00.000Z',
      version: 1,
    },
    {
      id: 'pat-002',
      fullName: 'Carlos Ramírez Soto',
      email: 'carlos.ramirez@example.com',
      phone: '+52 33 2222 1111',
      birthDate: '1988-11-02',
      emergencyContact: null,
      consentAccepted: true,
      createdAt: '2026-09-05T16:00:00.000Z',
      updatedAt: '2026-09-05T16:00:00.000Z',
      version: 1,
    },
    {
      id: 'pat-003',
      fullName: 'Ana Sofía Méndez',
      email: 'ana.mendez@example.com',
      phone: null,
      birthDate: '2001-06-15',
      emergencyContact: { name: 'Laura Méndez', phone: '+52 81 3333 4444', relationship: 'Madre' },
      consentAccepted: true,
      createdAt: '2026-09-12T17:30:00.000Z',
      updatedAt: '2026-09-12T17:30:00.000Z',
      version: 1,
    },
  ],
  [COLLECTIONS.APPOINTMENTS]: [
    {
      id: 'apt-001',
      patientId: 'pat-001',
      psychologistId: DEMO_PSYCHOLOGIST_ID,
      startsAt: '2026-10-20T16:00:00.000Z',
      endsAt: '2026-10-20T16:50:00.000Z',
      status: 'confirmed',
      modality: 'online',
      meetingUrl: 'https://meet.example.com/abc-defg-hij',
      reason: 'Seguimiento de manejo de ansiedad.',
      cancellationReason: null,
      createdAt: '2026-10-10T18:30:00.000Z',
      updatedAt: '2026-10-11T09:00:00.000Z',
      version: 2,
    },
  ],
  [COLLECTIONS.CLINICAL_LOGS]: [
    {
      id: 'log-001',
      patientId: 'pat-001',
      appointmentId: null,
      authorId: DEMO_PSYCHOLOGIST_ID,
      sessionDate: '2026-10-06T16:00:00.000Z',
      title: 'Sesión 3 — Técnicas de respiración',
      content: 'La paciente reporta disminución en episodios de ansiedad nocturna...',
      media: [
        {
          id: 'med-001',
          type: 'image',
          url: 'https://images.example.com/ejercicio-respiracion.png',
          caption: 'Diagrama de respiración 4-7-8 compartido en sesión',
        },
        {
          id: 'med-002',
          type: 'video',
          url: 'https://www.youtube.com/watch?v=inpok4MKVLM',
          caption: 'Video de mindfulness recomendado',
        },
      ],
      tags: ['ansiedad', 'respiración'],
      createdAt: '2026-10-06T17:05:00.000Z',
      updatedAt: '2026-10-06T17:05:00.000Z',
      version: 1,
    },
  ],
});
