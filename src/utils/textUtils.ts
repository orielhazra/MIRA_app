/**
 * Shared text normalization utilities.
 * Single source of truth — do not duplicate in other files.
 */

/**
 * Normalizes text for case-insensitive matching: lowercases, normalizes quotes
 * and whitespace, trims. Used by prompt building, lore matching, and app helpers.
 */
export function normalizeMatchText(text: string | undefined): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
