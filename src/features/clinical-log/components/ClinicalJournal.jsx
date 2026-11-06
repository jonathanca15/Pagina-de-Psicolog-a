import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useClinicalJournal } from '../hooks/useClinicalJournal.js';
import { patientRepository } from '../../patients/api/patientRepository.js';
import {
  isAbortError,
  storageBucketService,
  CLINICAL_MEDIA_BUCKET,
} from '../../../core/services/index.js';
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Toast,
  controlClassName,
} from '../../../shared/components/index.js';
import { cx } from '../../../shared/utils/cx.js';
import styles from './ClinicalJournal.module.css';

export function ClinicalJournal() {
  const {
    logs,
    loading,
    error,
    patientIdFilter,
    setPatientIdFilter,
    dateFilter,
    setDateFilter,
    reload,
    addEntry,
  } = useClinicalJournal();

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState(null);

  const [form, setForm] = useState({
    patientId: '',
    title: '',
    content: '',
    sessionDate: new Date().toISOString().slice(0, 10),
    videoUrl: '',
    media: [],
  });

  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadError, setUploadError] = useState(null);

  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState(null);
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const loadPatients = useCallback(async (signal) => {
    setPatientsLoading(true);
    setPatientsError(null);
    try {
      const list = await patientRepository.getAll({ signal });
      setPatients(list);
      setForm((prev) => ({
        ...prev,
        patientId: prev.patientId || (list[0]?.id ?? ''),
      }));
    } catch (err) {
      if (err?.name !== 'AbortError' && !isAbortError(err)) {
        setPatientsError(err?.message || 'No se pudo cargar la lista de pacientes.');
      }
    } finally {
      if (!signal?.aborted) {
        setPatientsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadPatients(controller.signal);
    return () => controller.abort();
  }, [loadPatients]);

  const patientMap = useMemo(() => {
    const map = new Map();
    patients.forEach((patient) => map.set(patient.id, patient));
    return map;
  }, [patients]);

  const activeUploads = useMemo(
    () => uploadQueue.filter((item) => item.status === 'uploading'),
    [uploadQueue],
  );
  const isUploadingMedia = activeUploads.length > 0;

  const overallProgress = useMemo(() => {
    if (uploadQueue.length === 0) return 0;
    const sum = uploadQueue.reduce((acc, item) => acc + (item.progress || 0), 0);
    return Math.round(sum / uploadQueue.length);
  }, [uploadQueue]);

  const uploadSingleFile = async (queueId, file, previewUrl, patientId) => {
    setUploadQueue((prev) =>
      prev.map((item) =>
        item.queueId === queueId
          ? { ...item, status: 'uploading', progress: 10, errorMessage: null }
          : item,
      ),
    );

    try {
      const uploaded = await storageBucketService.uploadClinicalImage(file, {
        patientId: patientId || 'general',
        onProgress: (percent) => {
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.queueId === queueId ? { ...item, progress: percent } : item,
            ),
          );
        },
      });

      setUploadQueue((prev) =>
        prev.map((item) =>
          item.queueId === queueId
            ? {
                ...item,
                status: 'uploaded',
                progress: 100,
                uploadedUrl: uploaded.url,
                storagePath: uploaded.path,
              }
            : item,
        ),
      );

      setForm((prev) => ({
        ...prev,
        media: [
          ...prev.media,
          {
            id: uploaded.id,
            type: 'image',
            url: uploaded.url,
            path: uploaded.path,
            previewUrl,
            caption: uploaded.caption,
          },
        ],
      }));
    } catch (err) {
      const message =
        err?.message || `No se pudo subir "${file.name}" a Supabase Storage.`;
      setUploadError(message);
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.queueId === queueId
            ? { ...item, status: 'error', progress: 0, errorMessage: message }
            : item,
        ),
      );
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadError(null);
    e.target.value = '';

    const entries = files.map((file) => ({
      queueId: `up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: 'uploading',
      errorMessage: null,
      uploadedUrl: null,
      storagePath: null,
    }));

    setUploadQueue((prev) => [...prev, ...entries]);

    await Promise.all(
      entries.map((entry) =>
        uploadSingleFile(entry.queueId, entry.file, entry.previewUrl, form.patientId),
      ),
    );
  };

  const handleRetryUpload = (entry) => {
    setUploadError(null);
    uploadSingleFile(entry.queueId, entry.file, entry.previewUrl, form.patientId);
  };

  const handleRemoveMediaItem = async (mediaItem) => {
    if (mediaItem.path) {
      try {
        await storageBucketService.removeClinicalImage(mediaItem.path);
      } catch {
        // Ignorar error de borrado remoto si el archivo no existía
      }
    }
    setForm((prev) => ({
      ...prev,
      media: prev.media.filter((item) => item.id !== mediaItem.id),
    }));
    setUploadQueue((prev) =>
      prev.filter((item) => item.uploadedUrl !== mediaItem.url),
    );
  };

  const handleDismissFailedUpload = (queueId) => {
    setUploadQueue((prev) => prev.filter((item) => item.queueId !== queueId));
  };

  const handleAddVideoUrl = () => {
    const trimmed = form.videoUrl.trim();
    if (!trimmed) return;
    setForm((prev) => ({
      ...prev,
      videoUrl: '',
      media: [
        ...prev.media,
        {
          id: `med-${Date.now().toString(36).slice(-4)}`,
          type: 'video',
          url: trimmed,
          caption: 'Video de referencia',
        },
      ],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUploadingMedia) return;

    setSaving(true);
    setFormErrors(null);

    const payload = {
      patientId: form.patientId,
      title: form.title,
      content: form.content,
      authorId: 'psy-001',
      sessionDate: new Date(form.sessionDate).toISOString(),
      media: form.media.map(({ id, type, url, caption }) => ({
        id,
        type,
        url,
        caption,
      })),
    };

    const res = await addEntry(payload);
    setSaving(false);

    if (!res.success) {
      setFormErrors(res.error?.details || { general: res.error?.message || 'Error al guardar' });
    } else {
      setForm((prev) => ({
        patientId: prev.patientId || (patients[0]?.id ?? ''),
        title: '',
        content: '',
        sessionDate: new Date().toISOString().slice(0, 10),
        videoUrl: '',
        media: [],
      }));
      setUploadQueue([]);
      setUploadError(null);
      setToast({
        id: Date.now(),
        message: 'Entrada clínica guardada correctamente.',
        variant: 'success',
      });
    }
  };

  const hasFilters = Boolean(patientIdFilter || dateFilter);

  return (
    <section className={styles.container} aria-label="Bitácora Clínica Multimedia">
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Bitácora Clínica Multimedia</h1>
          <p className={styles.subtitle}>
            Registra notas de evolución clínica por paciente con soporte de imágenes en la nube y
            enlaces de video.
          </p>
        </div>
      </header>

      <div className={styles.layoutGrid}>
        {/* Panel lateral: Formulario de registro de nota clínica */}
        <aside className={styles.cardPanel} aria-label="Nueva entrada de bitácora">
          <h2 className={styles.panelTitle}>Nueva Entrada de Sesión</h2>

          {patientsError && (
            <Alert variant="error" title="Error al cargar pacientes">
              {patientsError}{' '}
              <Button variant="ghost" size="sm" onClick={() => loadPatients()}>
                Reintentar
              </Button>
            </Alert>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <Field
              id="clinical-log-patient"
              label="Paciente"
              required
              error={formErrors?.patientId}
            >
              {(a11yProps) => (
                <select
                  {...a11yProps}
                  required
                  value={form.patientId}
                  disabled={patientsLoading || saving || patients.length === 0}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                >
                  <option value="" disabled>
                    {patientsLoading
                      ? 'Cargando pacientes registrados…'
                      : patients.length === 0
                        ? 'No hay pacientes registrados'
                        : 'Selecciona un paciente…'}
                  </option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.fullName} — {patient.email}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field id="clinical-log-date" label="Fecha de sesión" required>
              {(a11yProps) => (
                <input
                  {...a11yProps}
                  type="date"
                  required
                  value={form.sessionDate}
                  disabled={saving}
                  onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
                />
              )}
            </Field>

            <Field
              id="clinical-log-title"
              label="Título de la sesión"
              required
              error={formErrors?.title}
            >
              {(a11yProps) => (
                <input
                  {...a11yProps}
                  type="text"
                  required
                  placeholder="Ej: Sesión de seguimiento cognitivo"
                  value={form.title}
                  disabled={saving}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              )}
            </Field>

            <Field
              id="clinical-log-content"
              label="Notas Clínicas"
              required={form.media.length === 0}
              error={formErrors?.content}
            >
              {(a11yProps) => (
                <textarea
                  {...a11yProps}
                  rows={4}
                  required={form.media.length === 0}
                  placeholder="Anotaciones, observaciones y acuerdos terapéuticos..."
                  value={form.content}
                  disabled={saving}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              )}
            </Field>

            <Field
              id="clinical-log-files"
              label={`Subir Imágenes (${CLINICAL_MEDIA_BUCKET})`}
              hint="Formatos: PNG, JPG, WEBP o GIF (máx. 5 MB)."
            >
              {(a11yProps) => (
                <input
                  {...a11yProps}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  disabled={saving || isUploadingMedia}
                  onChange={handleFileChange}
                />
              )}
            </Field>

            <Field id="clinical-log-video" label="Enlace a Video (URL)">
              {(a11yProps) => (
                <div className={styles.videoInputRow}>
                  <input
                    {...a11yProps}
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={form.videoUrl}
                    disabled={saving}
                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={saving || !form.videoUrl.trim()}
                    onClick={handleAddVideoUrl}
                  >
                    Añadir
                  </Button>
                </div>
              )}
            </Field>

            {uploadQueue.length > 0 && (
              <div className={styles.uploadStatusBox} role="status" aria-live="polite">
                <div className={styles.uploadHeader}>
                  <span>
                    {isUploadingMedia
                      ? `Subiendo imágenes a "${CLINICAL_MEDIA_BUCKET}"…`
                      : 'Imágenes procesadas en Supabase Storage'}
                  </span>
                  <span>{overallProgress}%</span>
                </div>

                <div className={styles.progressTrack}>
                  <div
                    className={cx(
                      styles.progressFill,
                      !isUploadingMedia && styles.progressFillDone,
                    )}
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>

                <div className={styles.uploadQueueList}>
                  {uploadQueue.map((entry) => (
                    <div key={entry.queueId} className={styles.uploadQueueItem}>
                      <div className={styles.uploadThumbGroup}>
                        <img
                          src={entry.previewUrl}
                          alt={entry.name}
                          className={styles.uploadThumb}
                        />
                        <span>{entry.name}</span>
                      </div>

                      <div className={styles.uploadThumbGroup}>
                        {entry.status === 'uploading' && (
                          <span>Subiendo ({entry.progress}%)…</span>
                        )}
                        {entry.status === 'uploaded' && <span>✓ Subida</span>}
                        {entry.status === 'error' && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleRetryUpload(entry)}
                            >
                              Reintentar
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDismissFailedUpload(entry.queueId)}
                            >
                              Quitar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadError && (
              <Alert variant="error" title="Error en Supabase Storage">
                {uploadError}
              </Alert>
            )}

            {form.media.length > 0 && (
              <div className={styles.mediaChips}>
                {form.media.map((m, idx) => (
                  <div key={m.id || idx} className={styles.mediaChip}>
                    {m.type === 'image' && (
                      <img
                        src={m.previewUrl || m.url}
                        alt={m.caption}
                        className={styles.uploadThumb}
                      />
                    )}
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mediaChipLink}
                    >
                      {m.type === 'video' ? `🎬 ${m.caption}` : m.caption}
                    </a>
                    <button
                      type="button"
                      className={styles.removeMediaBtn}
                      onClick={() => handleRemoveMediaItem(m)}
                      aria-label={`Eliminar adjunto ${m.caption}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {formErrors?.general && (
              <Alert variant="error" title="No se pudo guardar">
                {formErrors.general}
              </Alert>
            )}

            <Button
              type="submit"
              isLoading={saving || isUploadingMedia}
              disabled={patients.length === 0}
              fullWidth
            >
              {isUploadingMedia
                ? 'Subiendo imágenes al bucket…'
                : saving
                  ? 'Guardando entrada…'
                  : 'Guardar en Bitácora'}
            </Button>
          </form>
        </aside>

        {/* Columna derecha: Filtros e Historial Cronológico */}
        <div>
          <section className={styles.filtersCard} aria-label="Filtros de bitácora">
            <div className={styles.filtersGrid}>
              <Field id="filter-log-patient" label="Filtrar por Paciente">
                {(a11yProps) => (
                  <select
                    {...a11yProps}
                    value={patientIdFilter || ''}
                    disabled={patientsLoading}
                    onChange={(e) => setPatientIdFilter(e.target.value)}
                  >
                    <option value="">Todos los pacientes</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.fullName} — {patient.email}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field id="filter-log-date" label="Filtrar por Fecha">
                {(a11yProps) => (
                  <input
                    {...a11yProps}
                    type="date"
                    value={dateFilter || ''}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                )}
              </Field>
            </div>

            {hasFilters && (
              <div className={styles.filtersActions}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPatientIdFilter('');
                    setDateFilter('');
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            )}
          </section>

          {loading && <LoadingState label="Cargando bitácora clínica…" />}

          {!loading && error && (
            <ErrorState
              title="No se pudo cargar la bitácora"
              message={error}
              onRetry={reload}
            />
          )}

          {!loading && !error && logs.length === 0 && (
            <EmptyState
              title="Sin registros en la bitácora"
              description="No hay entradas clínicas registradas para los filtros seleccionados."
              action={
                hasFilters && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setPatientIdFilter('');
                      setDateFilter('');
                    }}
                  >
                    Mostrar todos los registros
                  </Button>
                )
              }
            />
          )}

          {!loading && !error && logs.length > 0 && (
            <div className={styles.logsList}>
              {logs.map((log) => {
                const matchedPatient = patientMap.get(log.patientId);
                return (
                  <article key={log.id} className={styles.logCard}>
                    <div className={styles.logHeader}>
                      <h3 className={styles.logTitle}>{log.title}</h3>
                      <span className={styles.logDate}>
                        {new Date(log.sessionDate).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className={styles.logPatient}>
                      {matchedPatient
                        ? `${matchedPatient.fullName} — ${matchedPatient.email}`
                        : `Paciente (${log.patientId})`}
                    </div>

                    {log.content && <p className={styles.logContent}>{log.content}</p>}

                    {log.media?.length > 0 && (
                      <div className={styles.logMediaGrid}>
                        {log.media.map((m, idx) =>
                          m.type === 'video' ? (
                            <a
                              key={m.id || idx}
                              href={m.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.videoBadgeLink}
                            >
                              🎬 {m.caption || 'Ver video'}
                            </a>
                          ) : (
                            <a
                              key={m.id || idx}
                              href={m.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={m.caption}
                            >
                              <img
                                src={m.url}
                                alt={m.caption}
                                className={styles.logImageThumb}
                              />
                            </a>
                          ),
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />
    </section>
  );
}
