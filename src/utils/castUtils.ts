/**
 * Shared cast presence utilities.
 * Single source of truth — do not duplicate in other files.
 */

/**
 * Normalizes a presence value string to one of the three canonical values.
 * Handles legacy formats: "background", "present", "off-scene", "true"/"false", boolean false.
 */
export function normalizePresence(value: any, legacyPresent: boolean = true): "active" | "nearby" | "inactive" {
  const raw = String(value || "").trim().toLowerCase();
  if (["active", "nearby", "inactive"].includes(raw)) return raw as "active" | "nearby" | "inactive";
  if (raw === "background" || raw === "present") return "nearby";
  if (raw === "off-scene" || raw === "offscene" || raw === "not present") return "inactive";
  if (raw === "true") return "active";
  if (raw === "false") return "inactive";
  return legacyPresent === false ? "inactive" : "active";
}

/**
 * Extracts and normalizes presence from a cast state row object.
 * Reads row.presence with row.present as legacy fallback.
 */
export function getRowPresence(row: any): "active" | "nearby" | "inactive" {
  return normalizePresence(row?.presence, row?.present);
}

/**
 * Formats a presence value as a human-readable label for the UI.
 */
export function formatPresenceLabel(presence: string): string {
  if (presence === "nearby") return "Nearby / background";
  if (presence === "inactive") return "Inactive / off-scene";
  return "Active";
}
