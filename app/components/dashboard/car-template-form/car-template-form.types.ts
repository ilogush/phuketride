export interface CarBrand {
  id: number;
  name: string;
}

export interface CarModel {
  id: number;
  name: string;
  brand_id: number;
}

export interface BodyType {
  id: number;
  name: string;
}

export interface FuelType {
  id: number;
  name: string;
}

export interface CarTemplate {
  id: number;
  brand_id: number;
  model_id: number;
  transmission?: "automatic" | "manual";
  engine_volume?: number;
  body_type_id?: number;
  seats?: number;
  doors?: number;
  fuel_type_id?: number;
  description?: string;
  photos?: string;
  feature_transmission?: "automatic" | "manual" | null;
  feature_air_conditioning?: boolean;
  feature_abs?: boolean;
  feature_airbags?: boolean;
  drivetrain?: "FWD" | "RWD" | "AWD" | "4WD" | null;
  luggage_capacity?: "small" | "medium" | "large" | null;
  rear_camera?: boolean;
  carplay_enabled?: boolean;
  android_auto_enabled?: boolean;
  bluetooth_enabled?: boolean;
}

export interface CarTemplateFormData {
  brand_id: string;
  model_id: string;
  transmission: "automatic" | "manual";
  engine_volume: string;
  body_type_id: string;
  seats: string;
  doors: string;
  fuel_type_id: string;
  description: string;
  feature_air_conditioning: boolean;
  feature_abs: boolean;
  feature_airbags: boolean;
  drivetrain: "FWD" | "RWD" | "AWD" | "4WD";
  luggage_capacity: "small" | "medium" | "large";
  rear_camera: boolean;
  carplay_enabled: boolean;
  android_auto_enabled: boolean;
  bluetooth_enabled: boolean;
  photos: Array<{ base64: string; fileName: string }>;
}
