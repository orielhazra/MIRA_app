/**
 * Shared array utility functions.
 * Single source of truth — do not duplicate in other files.
 */

/**
 * Deduplicates an array of values, converting each to a string and filtering out empty strings.
 */
export function uniqueCompact(values: any[]): string[] {
  return [...new Set((values || []).map(String).filter(Boolean))];
}
