const slugPart = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

export const buildCompanySlug = (companyName: string | null | undefined) =>
  slugPart(String(companyName || "")) || "company";

export const buildCarPathSegment = (
  companyName: string | null | undefined,
  brandName: string | null | undefined,
  modelName: string | null | undefined,
  licensePlate: string | null | undefined,
) => {
  const companySlug = buildCompanySlug(companyName);
  const brandSlug = slugPart(String(brandName || "")) || "brand";
  const modelSlug = slugPart(String(modelName || "")) || "model";
  const plateSlug = slugPart(String(licensePlate || "")) || "plate";

  return `${companySlug}-${brandSlug}-${modelSlug}-${plateSlug}`;
};

export const parseCarPathSegment = (raw: string | undefined | null) => {
  const value = String(raw || "").trim();
  if (!value) return null;
  const chunks = value.split("-");
  return {
    full: value,
    plateTail: chunks[chunks.length - 1] || "",
  };
};
