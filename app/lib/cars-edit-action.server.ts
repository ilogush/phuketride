import { redirect, type ActionFunctionArgs } from "react-router";
import type { SessionUser } from "~/lib/auth.server";
import { carSchema } from "~/schemas/car";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { uploadToR2 } from "~/lib/r2.server";
import { getCarPhotoUrls } from "~/lib/car-photos";
import { getCachedFuelTypes } from "~/lib/dictionaries-cache.server";
import { parseWithSchema } from "~/lib/validation.server";
import { getRequestModCompanyId, withModCompanyId } from "~/lib/mod-mode.server";

type EditCarActionArgs = {
  db: any;
  assets: any;
  request: Request;
  user: SessionUser;
  params: ActionFunctionArgs["params"];
  formData: FormData;
};

type FuelTypeRow = {
  id: number;
  name: string;
};

export async function handleEditCarAction({ db, assets, request, user, params, formData }: EditCarActionArgs) {
  const modCompanyIdValue = getRequestModCompanyId(request, user);
  const withModCompany = (path: string) => withModCompanyId(path, modCompanyIdValue);

  const carId = Number(params.id);
  if (!Number.isFinite(carId) || carId <= 0) {
    return redirect(withModCompany(`/cars?error=${encodeURIComponent("Invalid car id")}`));
  }

  const car = await db
    .prepare(`
      SELECT
        id, company_id, template_id, year, color_id, license_plate, transmission, engine_volume,
        status, mileage, next_oil_change_mileage, oil_change_interval, price_per_day, deposit,
        insurance_type, insurance_expiry_date, registration_expiry, tax_road_expiry_date,
        insurance_price_per_day, max_insurance_price, min_rental_days, photos
      FROM company_cars
      WHERE id = ?
      LIMIT 1
    `)
    .bind(carId)
    .first() as {
      id: number;
      company_id: number;
      template_id: number | null;
      year: number | null;
      color_id: number | null;
      license_plate: string | null;
      transmission: "automatic" | "manual" | null;
      engine_volume: number | null;
      status: "available" | "rented" | "maintenance" | "booked" | null;
      mileage: number | null;
      next_oil_change_mileage: number | null;
      oil_change_interval: number | null;
      price_per_day: number | null;
      deposit: number | null;
      insurance_type: string | null;
      insurance_expiry_date: string | null;
      registration_expiry: string | null;
      tax_road_expiry_date: string | null;
      insurance_price_per_day: number | null;
      max_insurance_price: number | null;
      min_rental_days: number | null;
      photos: string | null;
    } | null;

  if (!car) {
    return redirect(withModCompany(`/cars?error=Car not found`));
  }

  if (user.role !== "admin" && car.company_id !== user.companyId) {
    return redirect(withModCompany(`/cars/${carId}?error=Access denied`));
  }

  const intent = formData.get("intent");
  if (intent === "archive" || intent === "delete") {
    const { deleteOrArchiveCar } = await import("~/lib/archive.server");
    const result = await deleteOrArchiveCar(db, carId, car.company_id);
    if (result.success) {
      return redirect(withModCompany(`/cars?success=${encodeURIComponent(result.message || "Car updated successfully")}`));
    }
    return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent(result.message || result.error || "Failed to update car")}`));
  }

  if (intent === "unarchive") {
    await db
      .prepare("UPDATE company_cars SET archived_at = NULL, updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), carId)
      .run();
    return redirect(withModCompany(`/cars/${carId}/edit?success=Car unarchived successfully`));
  }

  const rawData = {
    templateId: formData.get("templateId") ? Number(formData.get("templateId")) : (car.template_id || null),
    year: formData.get("year") ? Number(formData.get("year")) : car.year,
    colorId: Number(formData.get("colorId")) || car.color_id || 0,
    licensePlate: (formData.get("licensePlate") as string)?.toUpperCase() || car.license_plate || "",
    transmission: (formData.get("transmission") as "automatic" | "manual") || car.transmission || "automatic",
    engineVolume: Number(formData.get("engineVolume")) || car.engine_volume || 0,
    fuelType: (formData.get("fuelType") as "petrol" | "diesel" | "electric" | "hybrid") || "petrol",
    status: (formData.get("status") as "available" | "rented" | "maintenance" | "booked") || car.status || "available",
    currentMileage: Number(formData.get("currentMileage")) || car.mileage || 0,
    nextOilChangeMileage: Number(formData.get("nextOilChangeMileage")) || car.next_oil_change_mileage || 0,
    oilChangeInterval: Number(formData.get("oilChangeInterval")) || car.oil_change_interval || 10000,
    pricePerDay: Number(formData.get("pricePerDay")) || car.price_per_day || 0,
    deposit: Number(formData.get("deposit")) || car.deposit || 0,
    insuranceType: (formData.get("insuranceType") as string) || "First Class Insurance",
    insuranceExpiry: (formData.get("insuranceExpiry") as string) || null,
    registrationExpiry: (formData.get("registrationExpiry") as string) || null,
    taxRoadExpiry: (formData.get("taxRoadExpiry") as string) || null,
    minRentalDays: formData.get("minRentalDays") ? Number(formData.get("minRentalDays")) : (car.min_rental_days ?? null),
    insurancePricePerDay: formData.get("fullInsuranceEnabled") === "true"
      ? (formData.get("insurancePricePerDay") ? Number(formData.get("insurancePricePerDay")) : car.insurance_price_per_day)
      : null,
    maxInsurancePrice: formData.get("fullInsuranceEnabled") === "true"
      ? (formData.get("maxInsurancePrice") ? Number(formData.get("maxInsurancePrice")) : car.max_insurance_price)
      : null,
  };

  const validation = parseWithSchema(carSchema, rawData, "Validation failed");
  if (!validation.ok) {
    return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent(validation.error)}`));
  }

  const validData = validation.data;
  const checkboxToInt = (value: FormDataEntryValue | null) => (value === "1" || value === "on" || value === "true" ? 1 : 0);
  const drivetrainRaw = String(formData.get("drivetrain") || "").toUpperCase();
  const templateSpecs = {
    drivetrain: (["FWD", "RWD", "AWD", "4WD"].includes(drivetrainRaw) ? drivetrainRaw : null) as "FWD" | "RWD" | "AWD" | "4WD" | null,
    rear_camera: checkboxToInt(formData.get("rear_camera")),
    bluetooth_enabled: checkboxToInt(formData.get("bluetooth_enabled")),
    carplay_enabled: checkboxToInt(formData.get("carplay_enabled")),
    android_auto_enabled: checkboxToInt(formData.get("android_auto_enabled")),
    feature_air_conditioning: checkboxToInt(formData.get("feature_air_conditioning")),
    feature_abs: checkboxToInt(formData.get("feature_abs")),
  };

  if (!rawData.year) {
    return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent("Year is required")}`));
  }
  if (!validData.insuranceType || !String(validData.insuranceType).trim()) {
    return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent("Insurance type is required")}`));
  }

  try {
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
          AND cc.id != ?
        LIMIT 1
      `)
      .bind(car.company_id, validData.templateId, validData.templateId, validData.licensePlate, carId)
      .all();

    if ((duplicateByCompanyResult.results ?? []).length > 0) {
      return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent("Car with same brand, model and license plate already exists in this company")}`));
    }

    const fuelTypes = await getCachedFuelTypes(db) as FuelTypeRow[];
    const fuelType = fuelTypes.find((item) => item.name.toLowerCase() === validData.fuelType.toLowerCase());

    const photosData = formData.get("photos") as string;
    let photoUrls: string[] = getCarPhotoUrls(car.photos);
    if (photosData) {
      try {
        const photos = JSON.parse(photosData);
        if (Array.isArray(photos) && photos.length > 0) {
          photoUrls = await Promise.all(
            photos.map(async (photo: { base64: string; fileName: string }) => {
              if (photo.base64.startsWith("/assets/") || photo.base64.startsWith("http")) return photo.base64;
              return uploadToR2(assets, photo.base64, `cars/${carId}/${photo.fileName}`);
            })
          );
        }
      } catch {
        // ignore invalid photos payload
      }
    }

    await db
      .prepare(`
        UPDATE company_cars
        SET template_id = ?, year = ?, color_id = ?, license_plate = ?, transmission = ?, engine_volume = ?,
            fuel_type_id = ?, status = ?, mileage = ?, next_oil_change_mileage = ?, oil_change_interval = ?,
            price_per_day = ?, deposit = ?, insurance_type = ?, insurance_expiry_date = ?, registration_expiry = ?,
            tax_road_expiry_date = ?, insurance_price_per_day = ?, max_insurance_price = ?, min_rental_days = ?, photos = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(
        validData.templateId,
        rawData.year ?? null,
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
        photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
        new Date().toISOString(),
        carId
      )
      .run();

    if (validData.templateId) {
      await db
        .prepare(`
          UPDATE car_templates
          SET
            drivetrain = COALESCE(?, drivetrain),
            rear_camera = ?,
            bluetooth_enabled = ?,
            carplay_enabled = ?,
            android_auto_enabled = ?,
            feature_air_conditioning = ?,
            feature_abs = ?,
            updated_at = ?
          WHERE id = ?
        `)
        .bind(
          templateSpecs.drivetrain,
          templateSpecs.rear_camera,
          templateSpecs.bluetooth_enabled,
          templateSpecs.carplay_enabled,
          templateSpecs.android_auto_enabled,
          templateSpecs.feature_air_conditioning,
          templateSpecs.feature_abs,
          new Date().toISOString(),
          validData.templateId
        )
        .run();
    }

    const metadata = getRequestMetadata(request);
    quickAudit({
      db,
      userId: user.id,
      role: user.role,
      companyId: car.company_id,
      entityType: "car",
      entityId: carId,
      action: "update",
      afterState: { ...validData, id: carId },
      ...metadata,
    });

    return redirect(withModCompany(`/cars?success=${encodeURIComponent("Car updated successfully")}`));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed") && message.includes("license_plate")) {
      return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent(`License plate "${validData.licensePlate}" is already in use`)}`));
    }
    return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent("Failed to update car")}`));
  }
}
