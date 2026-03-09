import { type ActionFunctionArgs } from "react-router";
import type { SessionUser } from "~/lib/auth.server";
import { carSchema } from "~/schemas/car";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { uploadToR2 } from "~/lib/r2.server";
import { getCachedFuelTypes } from "~/lib/dictionaries-cache.server";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";

import { parseDocPhotos } from "~/lib/photo-utils";

type CreateCarActionArgs = {
  request: Request;
  db: D1Database;
  assets: R2Bucket;
  user: SessionUser;
  companyId: number;
  formData: FormData;
};

export async function handleCreateCarAction({ request, db, assets, user, companyId, formData }: CreateCarActionArgs) {
  // 1. Validate input using Zod
  const validation = parseWithSchema(carSchema, Object.fromEntries(formData), "Validation failed");
  if (!validation.ok) {
    return redirectWithRequestError(request, "/cars/create", validation.error);
  }
  const data = validation.data;

  try {
    // 2. Business Logic: Check for duplicates
    const duplicate = await db
      .prepare(`
        SELECT cc.id FROM company_cars cc
        JOIN car_templates ct ON ct.id = cc.template_id
        WHERE cc.company_id = ?
          AND ct.brand_id = (SELECT brand_id FROM car_templates WHERE id = ?)
          AND ct.model_id = (SELECT model_id FROM car_templates WHERE id = ?)
          AND UPPER(TRIM(cc.license_plate)) = ?
          AND cc.archived_at IS NULL
        LIMIT 1
      `)
      .bind(companyId, data.templateId, data.templateId, data.licensePlate)
      .first();

    if (duplicate) {
      return redirectWithRequestError(request, "/cars/create", "Car with this license plate already exists");
    }

    // 3. Resolve internal IDs (Fuel Type)
    const fuelTypes = await getCachedFuelTypes(db) as Array<{ id: number; name: string }>;
    const fuelType = fuelTypes.find((f) => f.name.toLowerCase() === data.fuelType.toLowerCase());

    // 4. Handle Photo Uploads (Dynamic for all categories)
    const photoCategories = {
      photos: "cars/main",
      greenBookPhotos: "cars/docs/greenbook",
      insurancePhotos: "cars/docs/insurance",
      taxRoadPhotos: "cars/docs/tax",
    };

    const uploadedUrls: Record<string, string[]> = {};
    const timestamp = Date.now();

    for (const [field, path] of Object.entries(photoCategories)) {
      const fieldPhotos = parseDocPhotos(data[field as keyof typeof data] as string);
      if (fieldPhotos.length > 0) {
        uploadedUrls[field] = await Promise.all(
          fieldPhotos.map(async (p, i) => 
            uploadToR2(assets, p.base64, `${path}/${timestamp}_${i}_${p.fileName}`)
          )
        );
      }
    }

    // 5. Database Insertion
    const formatDate = (d: string | null | undefined) => 
      d ? new Date(d.split("-").reverse().join("-")).toISOString() : null;

    const result = await db
      .prepare(`
        INSERT INTO company_cars (
          company_id, template_id, color_id, license_plate, transmission, engine_volume, fuel_type_id,
          status, mileage, next_oil_change_mileage, oil_change_interval, price_per_day, deposit,
          insurance_type, insurance_expiry_date, registration_expiry, tax_road_expiry_date,
          insurance_price_per_day, max_insurance_price, min_rental_days, marketing_headline, description, 
          photos, green_book_photos, insurance_photos, tax_road_photos,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        companyId,
        data.templateId,
        data.colorId,
        data.licensePlate,
        data.transmission,
        data.engineVolume,
        fuelType?.id ?? null,
        data.status,
        data.currentMileage,
        data.nextOilChangeMileage,
        data.oilChangeInterval,
        data.pricePerDay,
        data.deposit,
        data.insuranceType,
        formatDate(data.insuranceExpiry),
        formatDate(data.registrationExpiry),
        formatDate(data.taxRoadExpiry),
        data.insurancePricePerDay,
        data.maxInsurancePrice,
        data.minRentalDays,
        data.marketingHeadline,
        data.description,
        JSON.stringify(uploadedUrls.photos || []),
        JSON.stringify(uploadedUrls.greenBookPhotos || []),
        JSON.stringify(uploadedUrls.insurancePhotos || []),
        JSON.stringify(uploadedUrls.taxRoadPhotos || []),
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    // 6. Audit Logging
    const carId = Number(result.meta.last_row_id);
    quickAudit({
      db,
      userId: user.id,
      role: user.role,
      companyId,
      entityType: "car",
      entityId: carId,
      action: "create",
      afterState: { ...data, id: carId, photoUrls: uploadedUrls },
      ...getRequestMetadata(request),
    });

    return redirectWithRequestSuccess(request, "/cars", "Car added to inventory");
  } catch (error: any) {
    if (error.message?.includes("UNIQUE")) {
      return redirectWithRequestError(request, "/cars/create", "License plate is already in use");
    }
    return redirectWithRequestError(request, "/cars/create", "Database error while creating car");
  }
}
