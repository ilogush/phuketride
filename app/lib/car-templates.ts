export interface BrandRow {
  id: number;
  name: string;
  logo_url?: string | null;
  created_at?: string;
}

export interface ModelRow {
  id: number;
  name: string;
  brand_id: number;
  body_type_id?: number | null;
  created_at?: string;
  brand_name?: string | null;
}

export interface TemplateRow {
  id: number;
  brand_id: number;
  model_id: number;
  transmission?: string | null;
  engine_volume?: number | null;
  body_type_id?: number | null;
  seats?: number | null;
  doors?: number | null;
  fuel_type_id?: number | null;
  photos?: string | null;
  created_at?: string;
  brand_name?: string | null;
  model_name?: string | null;
  fuel_type_name?: string | null;
}
