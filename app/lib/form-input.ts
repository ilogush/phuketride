/**
 * Centralized utilities for parsing and normalizing form input values.
 */

/**
 * Parses a money value from a FormData entry.
 * Handles commas, whitespace, and ensures a value is a finite number.
 * Returns a number rounded to 2 decimal places or null.
 */
export function parseMoneyValue(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(Math.abs(parsed) * 100) / 100;
}

/**
 * Parses an integer value from a FormData entry.
 * Handles commas, whitespace, and ensures a value is a non-negative integer.
 */
export function parseIntegerValue(value: FormDataEntryValue | null, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(Math.abs(parsed)));
}

/**
 * Parses a boolean value from a FormData entry.
 * Interprets "true" (string) or "on" (checkbox) as true.
 */
export function parseBooleanValue(value: FormDataEntryValue | null): boolean {
  if (value === null) return false;
  if (typeof value !== "string") return false;
  const lower = value.toLowerCase().trim();
  return lower === "true" || lower === "on" || lower === "1";
}

/**
 * Parses a date string into an ISO string or null.
 */
export function parseDateToISO(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value.trim());
  return isNaN(date.getTime()) ? null : date.toISOString();
}
