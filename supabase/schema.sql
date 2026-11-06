-- =============================================================================
-- PsicoApp — Esquema Relacional PostgreSQL / Supabase
-- Archivo: supabase/schema.sql
--
-- Equivalencia exacta con las reglas de dominio de src/core/models/:
--   1. patients       (src/core/models/patient.js)
--   2. appointments   (src/core/models/appointment.js)
--   3. clinical_logs  (src/core/models/clinicalLog.js)
--   4. resources      (src/features/resources/api/resourceRepository.js)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Función y trigger reutilizable para mantener updated_at y version (OCC)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_entity_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  IF TG_OP = 'UPDATE' THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 1. TABLA: patients
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  full_name         TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  phone             TEXT NULL,
  birth_date        DATE NULL,
  emergency_contact JSONB NULL,
  consent_accepted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  version           INTEGER NOT NULL DEFAULT 1,

  -- Restricciones CHECK equivalentes a validatePatient (src/core/models/patient.js)
  CONSTRAINT chk_patients_full_name_non_empty
    CHECK (char_length(btrim(full_name)) > 0),

  CONSTRAINT chk_patients_email_format
    CHECK (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),

  CONSTRAINT chk_patients_birth_date_not_future
    CHECK (birth_date IS NULL OR birth_date <= CURRENT_DATE),

  CONSTRAINT chk_patients_emergency_contact_shape
    CHECK (
      emergency_contact IS NULL OR (
        jsonb_typeof(emergency_contact) = 'object'
        AND char_length(btrim(COALESCE(emergency_contact->>'name', ''))) > 0
        AND char_length(btrim(COALESCE(emergency_contact->>'phone', ''))) > 0
      )
    ),

  CONSTRAINT chk_patients_consent_accepted
    CHECK (consent_accepted = TRUE)
);

CREATE TRIGGER trg_patients_audit
BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.handle_entity_audit();

-- =============================================================================
-- 2. TABLA: appointments
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id          TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  psychologist_id     TEXT NOT NULL,
  starts_at           TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at             TIMESTAMP WITH TIME ZONE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  modality            TEXT NOT NULL DEFAULT 'in_person',
  meeting_url         TEXT NULL,
  reason              TEXT NOT NULL DEFAULT '',
  cancellation_reason TEXT NULL,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  version             INTEGER NOT NULL DEFAULT 1,

  -- Restricciones CHECK equivalentes a validateAppointment (src/core/models/appointment.js)
  CONSTRAINT chk_appointments_psychologist_non_empty
    CHECK (char_length(btrim(psychologist_id)) > 0),

  CONSTRAINT chk_appointments_status_enum
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),

  CONSTRAINT chk_appointments_modality_enum
    CHECK (modality IN ('in_person', 'online')),

  CONSTRAINT chk_appointments_duration_bounds
    CHECK (
      ends_at > starts_at
      AND EXTRACT(EPOCH FROM (ends_at - starts_at)) / 60 BETWEEN 30 AND 120
    ),

  CONSTRAINT chk_appointments_meeting_url_protocol
    CHECK (meeting_url IS NULL OR meeting_url ~* '^https?://.+'),

  CONSTRAINT chk_appointments_reason_max_length
    CHECK (char_length(reason) <= 500),

  CONSTRAINT chk_appointments_cancellation_reason_required
    CHECK (
      status <> 'cancelled'
      OR (cancellation_reason IS NOT NULL AND char_length(btrim(cancellation_reason)) > 0)
    )
);

CREATE TRIGGER trg_appointments_audit
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.handle_entity_audit();

-- =============================================================================
-- 3. TABLA: clinical_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.clinical_logs (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id     TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id TEXT NULL REFERENCES public.appointments(id) ON DELETE SET NULL,
  author_id      TEXT NOT NULL,
  session_date   TIMESTAMP WITH TIME ZONE NOT NULL,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL DEFAULT '',
  media          JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  version        INTEGER NOT NULL DEFAULT 1,

  -- Restricciones CHECK equivalentes a validateClinicalLog (src/core/models/clinicalLog.js)
  CONSTRAINT chk_clinical_logs_author_non_empty
    CHECK (char_length(btrim(author_id)) > 0),

  CONSTRAINT chk_clinical_logs_title_bounds
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),

  CONSTRAINT chk_clinical_logs_content_max_length
    CHECK (char_length(content) <= 20000),

  CONSTRAINT chk_clinical_logs_media_array_bounds
    CHECK (
      jsonb_typeof(media) = 'array'
      AND jsonb_array_length(media) <= 10
    ),

  CONSTRAINT chk_clinical_logs_content_or_media_required
    CHECK (
      char_length(btrim(content)) > 0
      OR jsonb_array_length(media) > 0
    ),

  CONSTRAINT chk_clinical_logs_tags_max_count
    CHECK (cardinality(tags) <= 15)
);

CREATE TRIGGER trg_clinical_logs_audit
BEFORE UPDATE ON public.clinical_logs
FOR EACH ROW EXECUTE FUNCTION public.handle_entity_audit();

-- =============================================================================
-- 4. TABLA: resources (Artículos y guías psicoeducativas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.resources (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title                TEXT NOT NULL,
  category             TEXT NOT NULL,
  reading_time_minutes INTEGER NOT NULL DEFAULT 5,
  reading_time         TEXT NOT NULL DEFAULT '5 min de lectura',
  summary              TEXT NOT NULL,
  content              TEXT NOT NULL,
  created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  version              INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT chk_resources_title_non_empty
    CHECK (char_length(btrim(title)) > 0),

  CONSTRAINT chk_resources_category_non_empty
    CHECK (char_length(btrim(category)) > 0),

  CONSTRAINT chk_resources_reading_time_positive
    CHECK (reading_time_minutes > 0),

  CONSTRAINT chk_resources_content_non_empty
    CHECK (char_length(btrim(content)) > 0)
);

CREATE TRIGGER trg_resources_audit
BEFORE UPDATE ON public.resources
FOR EACH ROW EXECUTE FUNCTION public.handle_entity_audit();

-- =============================================================================
-- 5. ÍNDICES RECOMENDADOS PARA BÚSQUEDAS FRECUENTES
-- =============================================================================

-- Búsqueda de citas por fecha y rango horario (Agenda y validación de solapamientos)
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at
  ON public.appointments (starts_at ASC);

-- Búsqueda de citas por paciente ordenadas cronológicamente (Portal del Paciente y Expediente)
CREATE INDEX IF NOT EXISTS idx_appointments_patient_starts_at
  ON public.appointments (patient_id, starts_at ASC);

-- Índice parcial para verificar rápidamente citas activas por psicóloga (evitar traslapes)
CREATE INDEX IF NOT EXISTS idx_appointments_active_psychologist
  ON public.appointments (psychologist_id, starts_at, ends_at)
  WHERE status IN ('pending', 'confirmed');

-- Historial clínico por paciente ordenado descendentemente por fecha de sesión
CREATE INDEX IF NOT EXISTS idx_clinical_logs_patient_session_date
  ON public.clinical_logs (patient_id, session_date DESC);

-- Búsqueda de entradas clínicas por fecha de sesión
CREATE INDEX IF NOT EXISTS idx_clinical_logs_session_date
  ON public.clinical_logs (session_date DESC);

-- Búsqueda en directorio de pacientes por nombre y correo
CREATE INDEX IF NOT EXISTS idx_patients_full_name
  ON public.patients (full_name);

-- Filtrado de recursos educativos por categoría
CREATE INDEX IF NOT EXISTS idx_resources_category
  ON public.resources (category);

-- =============================================================================
-- 6. SUPABASE STORAGE: Bucket 'clinical-media' para adjuntos de bitácora
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinical-media',
  'clinical-media',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

