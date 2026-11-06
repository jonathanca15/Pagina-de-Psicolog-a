import React from 'react';
import styles from './ResourceArticleContent.module.css';

/**
 * Convierte texto con marcadores `**negrita**` en nodos React (`<strong>`).
 * @param {string} text
 * @returns {React.ReactNode[]}
 */
export function renderFormattedInline(text) {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className={styles.inlineStrong}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

// Detecta líneas que representan pasos o pautas prácticas:
// - Numeradas: "1. Título: ...", "2) ..."
// - Con prefijo "Paso X — ..." o "**Paso X — ..."
// - Viñetas con estructura "Título: Descripción": "• Título: ...", "- Título: ...", "* Título: ..."
const STEP_LINE_REGEX =
  /^(?:\d+[.)]\s+|(?:\*\*)?Paso\s+\d+\s*[—–\-:]\s*|[-•*]\s+(?:\*\*)?[^:\n]{2,60}(?:\*\*)?:\s+)/i;

const CLINICAL_NOTE_REGEX =
  /^(?:\*\*)?(Nota clínica|Recomendación clínica|Recomendación terapéutica|Recomendación final|Nota de cierre)\s*:?(?:\*\*)?\s*:?\s*(.*)$/i;

/**
 * Limpia cualquier prefijo redundante ("1.", "•", "Paso 1 —", etc.)
 * y separa el título clave de su explicación para un renderizado uniforme.
 * @param {string} rawLine
 * @returns {{ title: string | null, body: string }}
 */
export function parseStepItem(rawLine) {
  let cleaned = String(rawLine || '').trim();

  // 1. Remueve numeración o viñeta inicial ("1. ", "2) ", "• ", "- ", "* ")
  cleaned = cleaned.replace(/^(?:\d+[.)]|[-•*])\s+/, '');

  // 2. Remueve prefijo redundante "Paso X — " incluso si está dentro de negritas "**Paso 1 — "
  cleaned = cleaned.replace(/^(\*\*)?Paso\s+\d+\s*(?:[—–\-:]\s*)?/i, '$1');

  // 3. Separa "Título clave: Explicación" (con o sin ** alrededor del título)
  const titleMatch = cleaned.match(/^(?:\*\*)?([^:*\n]{2,75}?)(?::\*\*|\*\*:|:)\s+(.+)$/);
  if (titleMatch) {
    const cleanTitle = titleMatch[1]
      .replace(/^Paso\s+\d+\s*(?:[—–\-:]\s*)?/i, '')
      .replace(/\*\*/g, '')
      .trim();
    const cleanBody = titleMatch[2].trim();
    return {
      title: cleanTitle,
      body: cleanBody,
    };
  }

  return {
    title: null,
    body: cleaned,
  };
}

/**
 * Renderiza el contenido estructurado de un artículo de salud mental:
 * - Callout superior con el resumen introductorio
 * - Párrafo clínico de contexto
 * - Bloque de tarjetas numeradas (con badge circular + Título en negrita + descripción, sin texto "Paso X —")
 * - Nota de cierre con recomendación terapéutica
 */
export function ResourceArticleContent({ summary, content }) {
  const rawBlocks = String(content || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const structuredBlocks = [];

  for (const block of rawBlocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const clinicalMatch = block.match(CLINICAL_NOTE_REGEX);
    const isStepBlock =
      lines.length > 0 && lines.every((line) => STEP_LINE_REGEX.test(line));

    if (clinicalMatch) {
      structuredBlocks.push({
        type: 'clinical_note',
        label: clinicalMatch[1],
        body: clinicalMatch[2],
      });
    } else if (isStepBlock) {
      const parsedItems = lines.map(parseStepItem);
      const prev = structuredBlocks[structuredBlocks.length - 1];
      if (prev && prev.type === 'steps_list') {
        prev.items.push(...parsedItems);
      } else {
        structuredBlocks.push({
          type: 'steps_list',
          items: parsedItems,
        });
      }
    } else {
      structuredBlocks.push({
        type: 'paragraph',
        lines,
      });
    }
  }

  return (
    <div className={styles.articleBody}>
      {summary && (
        <div className={styles.summaryCallout} role="note" aria-label="Resumen introductorio">
          <span className={styles.summaryCalloutLabel}>Resumen</span>
          <p className={styles.summaryCalloutText}>{renderFormattedInline(summary)}</p>
        </div>
      )}

      {structuredBlocks.map((block, index) => {
        if (block.type === 'steps_list') {
          return (
            <div key={index} className={styles.stepsSection}>
              <h4 className={styles.stepsHeading}>Pautas prácticas</h4>
              <ol className={styles.stepsList}>
                {block.items.map((item, stepIdx) => (
                  <li key={stepIdx} className={styles.stepItem}>
                    <span className={styles.stepBadge} aria-hidden="true">
                      {stepIdx + 1}
                    </span>
                    <div className={styles.stepText}>
                      {item.title ? (
                        <>
                          <strong className={styles.stepTitle}>{item.title}:</strong>{' '}
                          {renderFormattedInline(item.body)}
                        </>
                      ) : (
                        renderFormattedInline(item.body)
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          );
        }

        if (block.type === 'clinical_note') {
          return (
            <aside key={index} className={styles.clinicalNoteBox} aria-label={block.label}>
              <span className={styles.clinicalNoteLabel}>Recomendación terapéutica</span>
              <p className={styles.clinicalNoteContent}>{renderFormattedInline(block.body)}</p>
            </aside>
          );
        }

        return (
          <p key={index} className={styles.paragraph}>
            {block.lines.map((line, lineIdx) => (
              <React.Fragment key={lineIdx}>
                {lineIdx > 0 && <br />}
                {renderFormattedInline(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
