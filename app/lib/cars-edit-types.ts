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
  drivetrain?: string | null;
  luggage_capacity?: string | null;
  rear_camera?: number | null;
  bluetooth_enabled?: number | null;
  carplay_enabled?: number | null;
  android_auto_enabled?: number | null;
  feature_air_conditioning?: number | null;
  feature_abs?: number | null;
  feature_airbags?: number | null;
}

export interface SeasonRow {
  id: number;
  seasonName: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  priceMultiplier: number;
  discountLabel: string | null;
}

export interface DurationRow {
  id: number;
  rangeName: string;
  minDays: number;
  maxDays: number | null;
  priceMultiplier: number;
  discountLabel: string | null;
}
