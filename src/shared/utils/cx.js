/**
 * Concatena clases CSS ignorando valores falsy.
 * @param {...(string | false | null | undefined)} classes
 * @returns {string}
 */
export const cx = (...classes) => classes.filter(Boolean).join(' ');
