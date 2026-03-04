import { normalizeAssetUrl } from "~/lib/asset-url";

type PhotoLike = string | { base64?: string; url?: string; src?: string; fileName?: string };

const pickPhotoValue = (item: PhotoLike): string | null => {
  if (typeof item === "string") {
    return item.trim() || null;
  }
  if (!item || typeof item !== "object") {
    return null;
  }
  const value = item.base64 || item.url || item.src || "";
  if (typeof value !== "string") {
    return null;
  }
  return value.trim() || null;
};

const parsePhotosPayload = (value: unknown): PhotoLike[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value as PhotoLike[];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as PhotoLike[]) : [];
  } catch {
    return [];
  }
};

export const getCarPhotoUrls = (value: unknown, requestUrl?: string): string[] => {
  return parsePhotosPayload(value)
    .map((item) => pickPhotoValue(item))
    .filter((item): item is string => Boolean(item))
    .map((item) => (requestUrl ? normalizeAssetUrl(item, requestUrl) : item));
};

export const getPrimaryCarPhotoUrl = (
  value: unknown,
  requestUrl?: string,
  fallback: string | null = null,
): string | null => {
  const [first] = getCarPhotoUrls(value, requestUrl);
  return first || fallback;
};
