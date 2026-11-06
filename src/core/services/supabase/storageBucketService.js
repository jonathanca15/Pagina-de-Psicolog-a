import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { StorageError, STORAGE_ERROR_CODES } from '../storage/StorageError.js';
import { generateId } from '../../utils/id.js';

export const CLINICAL_MEDIA_BUCKET = 'clinical-media';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Normaliza el nombre de archivo eliminando caracteres especiales o espacios.
 * @param {string} fileName
 * @returns {string}
 */
function sanitizeFileName(fileName = 'imagen.png') {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase();
}

/**
 * Valida que el archivo sea una imagen permitida y no exceda el límite de peso.
 * @param {File} file
 */
export function validateImageFile(file) {
  if (!file || typeof file !== 'object') {
    throw new StorageError(
      STORAGE_ERROR_CODES.VALIDATION,
      'No se proporcionó un archivo válido.',
    );
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new StorageError(
      STORAGE_ERROR_CODES.VALIDATION,
      `Formato no permitido (${file.type || 'desconocido'}). Usa PNG, JPG, WEBP o GIF.`,
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new StorageError(
      STORAGE_ERROR_CODES.VALIDATION,
      'La imagen supera el tamaño máximo permitido de 5 MB.',
    );
  }
}

/**
 * Servicio para gestionar la subida de adjuntos multimedia al bucket `clinical-media`
 * de Supabase Storage y obtener su URL pública o firmada.
 */
export const storageBucketService = {
  /**
   * Sube una imagen al bucket `clinical-media` de Supabase Storage y retorna su URL.
   *
   * @param {File} file
   * @param {{
   *   patientId?: string,
   *   useSignedUrl?: boolean,
   *   signedUrlExpiresIn?: number,
   *   onProgress?: (percent: number) => void,
   * }} [options]
   * @returns {Promise<{ id: string, path: string, url: string, caption: string, type: 'image' }>}
   */
  async uploadClinicalImage(
    file,
    {
      patientId = 'general',
      useSignedUrl = false,
      signedUrlExpiresIn = 60 * 60 * 24 * 365, // 1 año en segundos
      onProgress,
    } = {},
  ) {
    validateImageFile(file);

    const attachmentId = generateId('med', 6);
    const folder = String(patientId || 'general').trim() || 'general';
    const safeName = sanitizeFileName(file.name);
    const filePath = `${folder}/${attachmentId}-${safeName}`;

    onProgress?.(15);

    if (!isSupabaseConfigured() || !supabase) {
      throw new StorageError(
        STORAGE_ERROR_CODES.INVALID_ARGUMENT,
        'Supabase no está configurado. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
      );
    }

    onProgress?.(40);

    const { data, error: uploadError } = await supabase.storage
      .from(CLINICAL_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new StorageError(
        STORAGE_ERROR_CODES.NETWORK,
        `Error al subir "${file.name}" al bucket "${CLINICAL_MEDIA_BUCKET}": ${uploadError.message}`,
        { cause: uploadError, details: { bucket: CLINICAL_MEDIA_BUCKET, filePath } },
      );
    }

    onProgress?.(85);

    const storedPath = data?.path || filePath;
    let resolvedUrl = '';

    if (useSignedUrl) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(CLINICAL_MEDIA_BUCKET)
        .createSignedUrl(storedPath, signedUrlExpiresIn);

      if (signedError || !signedData?.signedUrl) {
        throw new StorageError(
          STORAGE_ERROR_CODES.NETWORK,
          `No se pudo generar la URL firmada para "${file.name}".`,
          { cause: signedError },
        );
      }
      resolvedUrl = signedData.signedUrl;
    } else {
      const { data: publicData } = supabase.storage
        .from(CLINICAL_MEDIA_BUCKET)
        .getPublicUrl(storedPath);

      resolvedUrl = publicData?.publicUrl || '';
    }

    if (!resolvedUrl) {
      throw new StorageError(
        STORAGE_ERROR_CODES.UNKNOWN,
        `No se pudo obtener la URL del archivo "${file.name}".`,
      );
    }

    onProgress?.(100);

    return {
      id: attachmentId,
      path: storedPath,
      url: resolvedUrl,
      caption: file.name,
      type: 'image',
    };
  },

  /**
   * Elimina un archivo del bucket `clinical-media`.
   * @param {string} filePath
   */
  async removeClinicalImage(filePath) {
    if (!filePath || !isSupabaseConfigured() || !supabase) return;

    const { error } = await supabase.storage
      .from(CLINICAL_MEDIA_BUCKET)
      .remove([filePath]);

    if (error) {
      throw new StorageError(
        STORAGE_ERROR_CODES.NETWORK,
        `No se pudo eliminar el archivo del bucket: ${error.message}`,
        { cause: error },
      );
    }
  },
};
