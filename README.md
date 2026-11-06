# PsicoApp — Plataforma Web de Psicología

React + JavaScript (JSX) + CSS Modules + Vitest + Supabase / PostgreSQL.

## Estructura de carpetas

```
├── supabase/
│   └── schema.sql                # Script DDL relacional (tablas, FKs, CHECKs, triggers e índices)
├── .env.example                  # Variables de entorno para Supabase y selector de driver
└── src/
    ├── core/                     # Núcleo agnóstico de React (JS puro, testeable sin DOM)
    │   ├── models/               # Tipos JSDoc, factories, validadores y tests unitarios
    │   │   ├── __tests__/        # appointment.test.js, clinicalLog.test.js
    │   │   ├── enums.js
    │   │   ├── entity.js
    │   │   ├── validation.js
    │   │   ├── patient.js
    │   │   ├── appointment.js
    │   │   ├── clinicalLog.js
    │   │   └── index.js
    │   ├── services/             # Capa de persistencia e inversión de dependencias (DIP)
    │   │   ├── storage/          # StorageError.js, drivers.js, storageService.js, seed.js
    │   │   ├── supabase/         # supabaseClient.js, supabaseDriver.js
    │   │   └── index.js          # Composition Root (Switch local <-> Supabase)
    │   └── utils/                # id.js, delay.js
    │
    ├── features/                 # Módulos verticales por dominio
    │   ├── appointments/         # api/ (+ __tests__), hooks/useAppointments.js, components/AppointmentCalendar.jsx
    │   ├── clinical-log/         # api/clinicalLogRepository.js, hooks/useClinicalJournal.js, components/ClinicalJournal.jsx
    │   ├── patients/             # api/patientRepository.js, hooks/usePatients.js, components/PatientDirectory.jsx, PatientRecord.jsx
    │   ├── patient-portal/       # components/PatientPortal.jsx
    │   └── resources/            # api/resourceRepository.js
    │
    └── shared/                   # Componentes y hooks transversales
        ├── components/           # LoadingState, ErrorState, EmptyState, Button, Field, Alert, Toast, ImageLightbox
        ├── hooks/                # useAsync.js
        ├── styles/               # tokens.css, global.css
        └── utils/                # cx.js
```

---

## Estrategia de Migración a Supabase (Driver / Repository Switch)

Gracias al principio de **Inversión de Dependencias (DIP)**, ni los custom hooks (`useAppointments`, `useClinicalJournal`, `usePatients`) ni los componentes visuales (`.jsx`) conocen cómo se almacenan los datos. Toda la comunicación pasa por los repositorios (`src/features/*/api/*Repository.js`) y el `Composition Root` (`src/core/services/index.js`).

Existen **dos niveles** para conmutar del almacenamiento simulado (`local`) a **Supabase PostgreSQL** sin tocar un solo componente ni hook:

### Opción A — Conmutación inmediata por variable de entorno (Driver Switch)
En `src/core/services/index.js`, el servicio selecciona automáticamente el driver según las variables de entorno definidas en `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_STORAGE_DRIVER=supabase
```

Cuando `VITE_STORAGE_DRIVER=supabase`, `storageService` inyecta `createSupabaseDriver(supabase)` (definido en `src/core/services/supabase/supabaseDriver.js`), el cual traduce automáticamente `camelCase <-> snake_case` y desactiva la latencia/fallos simulados.

### Opción B — Consultas nativas de Supabase dentro de cada Repositorio
Para aprovechar el filtrado e indexación directamente en el motor PostgreSQL (por ejemplo, los índices `idx_appointments_starts_at` o `idx_clinical_logs_patient_session_date`), cada repositorio puede delegar en `supabase` cuando `isSupabaseConfigured()` es `true`, manteniendo exactamente la misma firma pública:

```js
// Ejemplo en src/features/appointments/api/appointmentRepository.js
import { supabase, isSupabaseConfigured, getCollectionMapper } from '../../../core/services/index.js';

const mapper = getCollectionMapper('appointments');

export const appointmentRepository = {
  async getAll({ patientId, startDate, endDate, status, signal } = {}) {
    if (isSupabaseConfigured()) {
      let query = supabase.from('appointments').select('*').order('starts_at', { ascending: true });
      if (patientId) query = query.eq('patient_id', patientId);
      if (status) query = query.eq('status', status);
      if (startDate) query = query.gte('starts_at', `${startDate}T00:00:00.000Z`);
      if (endDate) query = query.lte('starts_at', `${endDate}T23:59:59.999Z`);
      if (signal) query = query.abortSignal(signal);

      const { data, error } = await query;
      if (error) throw StorageError.from(error);
      return data.map(mapper.fromDb);
    }

    // Fallback al storageService local (mock / offline / tests unitarios)
    // ...
  }
};
```

De este modo:
1. **Los hooks y componentes no sufren cambios**: siguen recibiendo promesas con entidades en `camelCase` y errores normalizados `StorageError`.
2. **Los tests unitarios (`npm run test`) siguen siendo deterministas y ultrarrápidos** en memoria sin requerir red.

---

## Comandos disponibles

- `npm run dev` — Inicia el servidor de desarrollo con Vite.
- `npm run test` — Ejecuta la suite de pruebas automatizadas con Vitest.
- `npm run build` — Genera el empaquetado de producción en `dist/`.
