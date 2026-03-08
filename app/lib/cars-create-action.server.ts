import { type ActionFunctionArgs } from "react-router";
import type { SessionUser } from "~/lib/auth.server";
import { carSchema } from "~/schemas/car";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { uploadToR2 } from "~/lib/r2.server";
import { getCachedFuelTypes } from "~/lib/dictionaries-cache.server";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";

type FuelTypeRow = {
  id: number;
  name: string;
};

type CreateCarActionArgs = {
  request: Request;
  db: D1Database;
  assets: R2Bucket;
  user: SessionUser;
  companyId: number;
  formData: FormData;
};

export async function handleCreateCarAction({ request, db, assets, user, companyId, formData }: CreateCarActionArgs) {
  if (!companyId) {
    return redirectWithRequestError(request, "/cars/create", "Company is required");
  }

  const rawData = {
    templateId: formData.get("templateId") ? Number(formData.get("templateId")) : null,
    colorId: Number(formData.get("colorId")) || 0,
    licensePlate: (formData.get("licensePlate") as string)?.toUpperCase() || "",
    transmission: formData.get("transmission") as "automatic" | "manual",
    engineVolume: Number(formData.get("engineVolume")) || 0,
    fuelType: formData.get("fuelType") as "petrol" | "diesel" | "electric" | "hybrid",
    status: (formData.get("status") as "available" | "rented" | "maintenance" | "booked") || "available",
    currentMileage: Number(formData.get("currentMileage")) || 0,
    nextOilChangeMileage: Number(formData.get("nextOilChangeMileage")) || 0,
    oilChangeInterval: Number(formData.get("oilChangeInterval")) || 10000,
    pricePerDay: Number(formData.get("pricePerDay")) || 0,
    deposit: Number(formData.get("deposit")) || 0,
    insuranceType: (formData.get("insuranceType") as string) || null,
    insuranceExpiry: (formData.get("insuranceExpiry") as string) || null,
    registrationExpiry: (formData.get("registrationExpiry") as string) || null,
    taxRoadExpiry: (formData.get("taxRoadExpiry") as string) || null,
    minRentalDays: formData.get("minRentalDays") ? Number(formData.get("minRentalDays")) : null,
    insurancePricePerDay: formData.get("fullInsuranceEnabled") === "true"
      ? (formData.get("insurancePricePerDay") ? Number(formData.get("insurancePricePerDay")) : null)
      : null,
    maxInsurancePrice: formData.get("fullInsuranceEnabled") === "true"
      ? (formData.get("maxInsurancePrice") ? Number(formData.get("maxInsurancePrice")) : null)
      : null,
  };

  const validation = parseWithSchema(carSchema, rawData, "Validation failed");
  if (!validation.ok) {
    return redirectWithRequestError(request, "/cars/create", validation.error);
  }

  const validData = validation.data;

  try {
    const marketingHeadline = (formData.get("marketingHeadline") as string) || null;
    const description = (formData.get("description") as string) || null;

    const duplicateByCompanyResult = await db
      .prepare(`
        SELECT cc.id
        FROM company_cars cc
        JOIN car_templates ct ON ct.id = cc.template_id
        WHERE cc.company_id = ?
          AND ct.brand_id = (SELECT brand_id FROM car_templates WHERE id = ?)
          AND ct.model_id = (SELECT model_id FROM car_templates WHERE id = ?)
          AND UPPER(TRIM(cc.license_plate)) = UPPER(TRIM(?))
          AND cc.archived_at IS NULL
        LIMIT 1
      `)
      .bind(companyId, validData.templateId, validData.templateId, validData.licensePlate)
      .all();

    if ((duplicateByCompanyResult.results ?? []).length > 0) {
      return redirectWithRequestError(
        request,
        "/cars/create",
        "Car with same brand, model and license plate already exists in this company"
      );
    }

    const fuelTypes = await getCachedFuelTypes(db) as FuelTypeRow[];
    const fuelType = fuelTypes.find((item) => item.name.toLowerCase() === validData.fuelType.toLowerCase());

    const photosData = formData.get("photos") as string;
    let photoUrls: string[] = [];

    if (photosData && photosData !== "[]") {
      try {
        const photos = JSON.parse(photosData);
        if (Array.isArray(photos) && photos.length > 0) {
          const tempId = Date.now();
          photoUrls = await Promise.all(
            photos.map(async (photo: { base64: string; fileName: string }) => {
              return uploadToR2(assets, photo.base64, `cars/${tempId}/${photo.fileName}`);
            })
          );
        }
      } catch {
        // ignore invalid photos payload
      }
    }

    const insertResult = await db
      .prepare(`
        INSERT INTO company_cars (
          company_id, template_id, color_id, license_plate, transmission, engine_volume, fuel_type_id,
          status, mileage, next_oil_change_mileage, oil_change_interval, price_per_day, deposit,
          insurance_type, insurance_expiry_date, registration_expiry, tax_road_expiry_date,
          insurance_price_per_day, max_insurance_price, min_rental_days, marketing_headline, description, photos, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        companyId,
        validData.templateId,
        validData.colorId,
        validData.licensePlate,
        validData.transmission,
        validData.engineVolume,
        fuelType?.id ?? null,
        validData.status,
        validData.currentMileage,
        validData.nextOilChangeMileage,
        validData.oilChangeInterval,
        validData.pricePerDay,
        validData.deposit,
        validData.insuranceType,
        validData.insuranceExpiry ? new Date(validData.insuranceExpiry.split("-").reverse().join("-")).toISOString() : null,
        validData.registrationExpiry ? new Date(validData.registrationExpiry.split("-").reverse().join("-")).toISOString() : null,
        validData.taxRoadExpiry ? new Date(validData.taxRoadExpiry.split("-").reverse().join("-")).toISOString() : null,
        validData.insurancePricePerDay,
        validData.maxInsurancePrice,
        validData.minRentalDays,
        marketingHeadline,
        description,
        photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    const newCar = { id: Number(insertResult.meta.last_row_id) };
    const metadata = getRequestMetadata(request);
    quickAudit({
      db,
      userId: user.id,
      role: user.role,
      companyId: companyId,
      entityType: "car",
      entityId: newCar.id,
      action: "create",
      afterState: { ...validData, id: newCar.id },
      ...metadata,
    });

    return redirectWithRequestSuccess(request, "/cars", "Car created successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed") && message.includes("license_plate")) {
      return redirectWithRequestError(request, "/cars/create", `License plate "${validData.licensePlate}" is already in use`);
    }
    return redirectWithRequestError(request, "/cars/create", "Failed to create car");
  }
}
