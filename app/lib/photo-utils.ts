import type { UploadPhotoItem } from "~/lib/r2.server";

/**
 * Parses a JSON FormData value into an array of photo upload items (base64 + fileName).
 * Returns an empty array for invalid / missing values.
 */
export function parseDocPhotos(value: FormDataEntryValue | null): UploadPhotoItem[] {
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.base64 === "string" && typeof p.fileName === "string");
  } catch {
    return [];
  }
}

/**
 * Parses a JSON FormData value into an array of photo URL strings.
 * Returns an empty array for invalid / missing values.
 */
export function parsePhotoList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => typeof p === "string" && p.trim().length > 0);
  } catch {
    return [];
  }
}
