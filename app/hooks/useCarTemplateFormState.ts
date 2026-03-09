import { useEffect, useMemo, useState } from "react";
import type {
  BodyType,
  CarBrand,
  CarModel,
  CarTemplate,
  CarTemplateFormData,
  FuelType,
} from "./car-template-form.types";

interface UseCarTemplateFormStateOptions {
  template?: CarTemplate | null;
  brands: CarBrand[];
  models: CarModel[];
  bodyTypes: BodyType[];
  fuelTypes: FuelType[];
}

const DEFAULT_FORM_DATA: CarTemplateFormData = {
  brand_id: "",
  model_id: "",
  transmission: "automatic",
  engine_volume: "",
  body_type_id: "",
  seats: "",
  doors: "",
  fuel_type_id: "",
  description: "",
  feature_air_conditioning: true,
  feature_abs: true,
  feature_airbags: true,
  drivetrain: "FWD",
  luggage_capacity: "medium",
  rear_camera: true,
  carplay_enabled: false,
  android_auto_enabled: false,
  bluetooth_enabled: true,
  photos: [],
};

function parseTemplatePhotos(photos?: string) {
  if (!photos) {
    return [];
  }

  try {
    const parsed = JSON.parse(photos);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildTemplateFormData(template?: CarTemplate | null): CarTemplateFormData {
  if (!template) {
    return DEFAULT_FORM_DATA;
  }

  return {
    brand_id: String(template.brand_id),
    model_id: String(template.model_id),
    transmission: template.transmission || "automatic",
    engine_volume: template.engine_volume?.toString() || "",
    body_type_id: template.body_type_id?.toString() || "",
    seats: template.seats?.toString() || "",
    doors: template.doors?.toString() || "",
    fuel_type_id: template.fuel_type_id?.toString() || "",
    description: template.description || "",
    feature_air_conditioning:
      template.feature_air_conditioning == null ? true : Boolean(template.feature_air_conditioning),
    feature_abs: template.feature_abs == null ? true : Boolean(template.feature_abs),
    feature_airbags: template.feature_airbags == null ? true : Boolean(template.feature_airbags),
    drivetrain: template.drivetrain || "FWD",
    luggage_capacity: template.luggage_capacity || "medium",
    rear_camera: template.rear_camera == null ? true : Boolean(template.rear_camera),
    carplay_enabled: template.carplay_enabled == null ? false : Boolean(template.carplay_enabled),
    android_auto_enabled:
      template.android_auto_enabled == null ? false : Boolean(template.android_auto_enabled),
    bluetooth_enabled: template.bluetooth_enabled == null ? true : Boolean(template.bluetooth_enabled),
    photos: parseTemplatePhotos(template.photos),
  };
}

export function useCarTemplateFormState({
  template,
  brands,
  models,
  bodyTypes,
  fuelTypes,
}: UseCarTemplateFormStateOptions) {
  const [formData, setFormData] = useState<CarTemplateFormData>(() => buildTemplateFormData(template));
  const [errors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(buildTemplateFormData(template));
  }, [template]);

  const filteredModels = useMemo(() => {
    if (!formData.brand_id) {
      return [];
    }

    return models.filter((model) => Number(model.brand_id) === Number(formData.brand_id));
  }, [formData.brand_id, models]);

  useEffect(() => {
    if (template?.brand_id || formData.brand_id || brands.length === 0) {
      return;
    }

    setFormData((current) => ({ ...current, brand_id: String(brands[0].id) }));
  }, [brands, formData.brand_id, template]);

  useEffect(() => {
    if (!formData.brand_id) {
      if (formData.model_id) {
        setFormData((current) => ({ ...current, model_id: "" }));
      }
      return;
    }

    if (template?.model_id) {
      const templateModelId = Number(template.model_id);
      const hasTemplateModel = filteredModels.some((model) => Number(model.id) === templateModelId);
      if (hasTemplateModel && Number(formData.model_id || 0) !== templateModelId) {
        setFormData((current) => ({ ...current, model_id: String(templateModelId) }));
      }
      return;
    }

    const hasSelectedModel = filteredModels.some((model) => Number(model.id) === Number(formData.model_id));
    if (!hasSelectedModel) {
      setFormData((current) => ({
        ...current,
        model_id: filteredModels.length > 0 ? String(filteredModels[0].id) : "",
      }));
    }
  }, [filteredModels, formData.brand_id, formData.model_id, template]);

  useEffect(() => {
    if (!template?.body_type_id) {
      const hasBodyType = bodyTypes.some((item) => String(item.id) === formData.body_type_id);
      if ((!formData.body_type_id || !hasBodyType) && bodyTypes.length > 0) {
        setFormData((current) => ({ ...current, body_type_id: String(bodyTypes[0].id) }));
      }
    }

    if (!template?.fuel_type_id) {
      const hasFuelType = fuelTypes.some((item) => String(item.id) === formData.fuel_type_id);
      if ((!formData.fuel_type_id || !hasFuelType) && fuelTypes.length > 0) {
        setFormData((current) => ({ ...current, fuel_type_id: String(fuelTypes[0].id) }));
      }
    }
  }, [bodyTypes, formData.body_type_id, formData.fuel_type_id, fuelTypes, template]);

  const updateField = (name: keyof CarTemplateFormData, value: CarTemplateFormData[keyof CarTemplateFormData]) => {
    setFormData((current) => ({ ...current, [name]: value }));
  };

  return {
    errors,
    filteredModels,
    formData,
    setFormData,
    updateField,
  };
}
