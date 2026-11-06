import { supabase } from './supabaseClient.js';
import { StorageError, STORAGE_ERROR_CODES } from '../storage/StorageError.js';

/**
 * Mapeadores camelCase (Modelos JS) <-> snake_case (Columnas PostgreSQL)
 * para mantener intactos los contratos de los repositorios, hooks y componentes.
 */
const MAPPERS = Object.freeze({
  patients: {
    toDb: (item) => ({
      id: item.id,
      full_name: item.fullName,
      email: item.email,
      phone: item.phone ?? null,
      birth_date: item.birthDate ?? null,
      emergency_contact: item.emergencyContact ?? null,
      consent_accepted: Boolean(item.consentAccepted),
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      version: item.version ?? 1,
    }),
    fromDb: (row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      birthDate: row.birth_date,
      emergencyContact: row.emergency_contact,
      consentAccepted: row.consent_accepted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
    }),
  },

  appointments: {
    toDb: (item) => ({
      id: item.id,
      patient_id: item.patientId,
      psychologist_id: item.psychologistId,
      starts_at: item.startsAt,
      ends_at: item.endsAt,
      status: item.status,
      modality: item.modality,
      meeting_url: item.meetingUrl ?? null,
      reason: item.reason ?? '',
      cancellation_reason: item.cancellationReason ?? null,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      version: item.version ?? 1,
    }),
    fromDb: (row) => ({
      id: row.id,
      patientId: row.patient_id,
      psychologistId: row.psychologist_id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
      modality: row.modality,
      meetingUrl: row.meeting_url,
      reason: row.reason,
      cancellationReason: row.cancellation_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
    }),
  },

  clinical_logs: {
    toDb: (item) => ({
      id: item.id,
      patient_id: item.patientId,
      appointment_id: item.appointmentId ?? null,
      author_id: item.authorId,
      session_date: item.sessionDate,
      title: item.title,
      content: item.content ?? '',
      media: item.media ?? [],
      tags: item.tags ?? [],
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      version: item.version ?? 1,
    }),
    fromDb: (row) => ({
      id: row.id,
      patientId: row.patient_id,
      appointmentId: row.appointment_id,
      authorId: row.author_id,
      sessionDate: row.session_date,
      title: row.title,
      content: row.content,
      media: row.media ?? [],
      tags: row.tags ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
    }),
  },

  resources: {
    toDb: (item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      reading_time_minutes: item.readingTimeMinutes ?? 5,
      reading_time: item.readingTime ?? `${item.readingTimeMinutes ?? 5} min de lectura`,
      summary: item.summary,
      content: item.content,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      version: item.version ?? 1,
    }),
    fromDb: (row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      readingTimeMinutes: row.reading_time_minutes,
      readingTime: row.reading_time,
      summary: row.summary,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
    }),
  },
});

const identityMapper = {
  toDb: (x) => x,
  fromDb: (x) => x,
};

export const getCollectionMapper = (collection) => MAPPERS[collection] ?? identityMapper;

/**
 * Driver compatible con `StorageDriver` (src/core/services/storage/drivers.js)
 * que delega la lectura y escritura en las tablas de Supabase PostgreSQL.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient | null} [client]
 * @returns {import('../storage/drivers.js').StorageDriver}
 */
export function createSupabaseDriver(client = supabase) {
  if (!client) {
    throw new StorageError(
      STORAGE_ERROR_CODES.INVALID_ARGUMENT,
      'El cliente de Supabase no está configurado. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    );
  }

  return {
    async read(collection) {
      const mapper = getCollectionMapper(collection);
      const { data, error } = await client.from(collection).select('*');
      if (error) {
        throw new StorageError(STORAGE_ERROR_CODES.NETWORK, error.message, {
          cause: error,
          details: { collection, pgCode: error.code },
        });
      }
      return (data ?? []).map(mapper.fromDb);
    },

    async write(collection, items) {
      const mapper = getCollectionMapper(collection);
      const { data: currentRows } = await client.from(collection).select('id');
      const nextIds = new Set(items.map((item) => item.id));
      const removedIds = (currentRows ?? [])
        .map((row) => row.id)
        .filter((id) => !nextIds.has(id));

      if (removedIds.length > 0) {
        const { error: deleteError } = await client
          .from(collection)
          .delete()
          .in('id', removedIds);
        if (deleteError) {
          throw new StorageError(STORAGE_ERROR_CODES.NETWORK, deleteError.message, {
            cause: deleteError,
            details: { collection, pgCode: deleteError.code },
          });
        }
      }

      const rows = items.map(mapper.toDb);
      if (rows.length > 0) {
        const { error } = await client.from(collection).upsert(rows, { onConflict: 'id' });
        if (error) {
          throw new StorageError(STORAGE_ERROR_CODES.NETWORK, error.message, {
            cause: error,
            details: { collection, pgCode: error.code },
          });
        }
      }
    },

    async clear() {
      // Por seguridad, en un entorno remoto no se truncan las tablas automáticamente.
    },
  };
}
