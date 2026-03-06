export interface TemplateQueryRow {
  id: number;
  brandName: string | null;
  modelName: string | null;
  bodyTypeName: string | null;
  fuelTypeName: string | null;
  engine_volume: number | null;
  transmission: string | null;
  seats: number | null;
  doors: number | null;
}

export interface CarTemplateOption {
  id: number;
  brand?: { name?: string | null };
  model?: { name?: string | null };
  bodyType?: { name?: string | null };
  fuelType?: { name?: string | null };
  engineVolume?: number | null;
  transmission?: string | null;
  seats?: number | null;
  doors?: number | null;
}

export interface SimpleOptionRow {
  id: number;
  name: string;
}
