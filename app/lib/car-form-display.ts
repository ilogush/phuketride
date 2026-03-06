export type CarTemplateDisplay = {
  brand?: { name?: string | null };
  model?: { name?: string | null };
  fuelType?: { name?: string | null };
  engineVolume?: number | null;
};

export function getCarTemplateDisplayName(template: CarTemplateDisplay): string {
  const brand = template.brand?.name || "Unknown";
  const model = template.model?.name || "Unknown";
  const engine = template.engineVolume ? `${template.engineVolume}L` : "";
  const fuel = template.fuelType?.name || "";

  let name = `${brand} ${model}`;
  if (engine) name += ` ${engine}`;
  if (fuel) name += ` ${fuel}`;
  return name;
}

export function formatDateInput(value: Date | string | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}
