import { describe, it, expect } from 'vitest';
import { createPatientDraft, validatePatient } from '../patient.js';
import { generateId } from '../../utils/id.js';

describe('Modelo Patient y Generador de IDs legibles', () => {
  it('genera un ID corto legible con prefijo pat- de 5 a 6 caracteres alfanuméricos cuando no se envía ID', () => {
    const draft = createPatientDraft({
      fullName: 'Lucía Fernández',
      email: 'Lucia.Fernandez@Example.com',
      phone: '+52 55 1122 3344',
      consentAccepted: true,
    });

    expect(draft.id).toMatch(/^pat-[a-z0-9]{5,6}$/);
    expect(draft.email).toBe('lucia.fernandez@example.com');
    expect(validatePatient(draft).valid).toBe(true);
  });

  it('conserva el ID proporcionado cuando el paciente ya incluye uno', () => {
    const draft = createPatientDraft({
      id: 'pat-001',
      fullName: 'Mariana López Herrera',
      email: 'mariana.lopez@example.com',
      consentAccepted: true,
    });

    expect(draft.id).toBe('pat-001');
  });

  it('generateId mapea colecciones conocidas a sus prefijos cortos (pat-, apt-, log-, res-)', () => {
    expect(generateId('patients', 6)).toMatch(/^pat-[a-z0-9]{6}$/);
    expect(generateId('appointments', 6)).toMatch(/^apt-[a-z0-9]{6}$/);
    expect(generateId('clinical_logs', 6)).toMatch(/^log-[a-z0-9]{6}$/);
    expect(generateId('resources', 5)).toMatch(/^res-[a-z0-9]{5}$/);
  });
});
