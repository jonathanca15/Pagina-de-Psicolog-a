import { useEffect, useRef } from 'react';
import styles from './ImageLightbox.module.css';

/**
 * Visor de imagen a pantalla completa usando el elemento nativo <dialog>
 * (gestiona foco, tecla Escape y capa modal sin librerías).
 *
 * @param {{ image: { url: string, caption?: string } | null, onClose: () => void }} props
 */
export function ImageLightbox({ image, onClose }) {
  const dialogRef = useRef(/** @type {HTMLDialogElement | null} */ (null));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (image && !dialog.open) dialog.showModal();
    if (!image && dialog.open) dialog.close();
  }, [image]);

  const handleBackdropClick = (event) => {
    if (event.target === dialogRef.current) dialogRef.current.close();
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClose={onClose}
      onClick={handleBackdropClick}
      aria-label={image?.caption || 'Imagen adjunta'}
    >
      {image && (
        <figure className={styles.figure}>
          <img src={image.url} alt={image.caption || 'Imagen adjunta'} className={styles.image} />
          {image.caption && <figcaption className={styles.caption}>{image.caption}</figcaption>}
        </figure>
      )}
      <button type="button" className={styles.close} onClick={() => dialogRef.current?.close()}>
        <span aria-hidden="true">×</span>
        <span className="sr-only">Cerrar visor</span>
      </button>
    </dialog>
  );
}
