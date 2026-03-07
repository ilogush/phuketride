import {
  getCachedCarTemplateOptions,
  getCachedColors,
  getCachedRentalDurations,
  getCachedSeasons,
} from "~/lib/dictionaries-cache.server";
import { requireCarAccess } from "~/lib/access-policy.server";
import { type DurationRow, type SeasonRow } from "~/lib/cars-edit-types";
import { getEditableCarById } from "~/lib/cars-repo.server";

export async function loadCarEditPage(args: {
  db: D1Database;
  request: Request;
  carIdParam: string | undefined;
}) {
  const { db, request, carIdParam } = args;
  const carId = Number(carIdParam);

  if (!Number.isFinite(carId) || carId <= 0) {
    throw new Response("Invalid car id", { status: 400 });
  }

  await requireCarAccess(request, db, carId);

  const carRaw = await getEditableCarById({ db, carId });
  if (!carRaw) {
    throw new Response("Car not found", { status: 404 });
  }

  const [templatesList, colorsList, seasonsList, durationsList] = await Promise.all([
    getCachedCarTemplateOptions(db),
    getCachedColors(db),
    getCachedSeasons(db) as Promise<SeasonRow[]>,
    getCachedRentalDurations(db) as Promise<DurationRow[]>,
  ]);

  const car = {
    ...carRaw,
    companyId: carRaw.company_id,
    templateId: carRaw.template_id,
    colorId: carRaw.color_id,
    licensePlate: carRaw.license_plate,
    transmission: carRaw.transmission,
    engineVolume: carRaw.engine_volume,
    status: carRaw.status,
    deposit: carRaw.deposit,
    photos: carRaw.photos,
    pricePerDay: carRaw.price_per_day,
    insuranceType: carRaw.insurance_type,
    insuranceExpiryDate: carRaw.insurance_expiry_date,
    registrationExpiry: carRaw.registration_expiry,
    taxRoadExpiryDate: carRaw.tax_road_expiry_date,
    nextOilChangeMileage: carRaw.next_oil_change_mileage,
    oilChangeInterval: carRaw.oil_change_interval,
    insurancePricePerDay: carRaw.insurance_price_per_day,
    maxInsurancePrice: carRaw.max_insurance_price,
    minRentalDays: carRaw.min_rental_days,
    archivedAt: carRaw.archived_at,
    template: {
      brand: { name: carRaw.brandName },
      model: { name: carRaw.modelName },
      bodyType: { name: carRaw.bodyTypeName },
      fuelType: { name: carRaw.templateFuelTypeName },
      engineVolume: carRaw.engine_volume,
      transmission: carRaw.transmission,
      seats: carRaw.seats,
      doors: carRaw.doors,
      drivetrain: carRaw.templateDrivetrain,
      luggageCapacity: carRaw.templateLuggageCapacity,
      rearCamera: Number(carRaw.templateRearCamera || 0),
      bluetoothEnabled: Number(carRaw.templateBluetoothEnabled || 0),
      carplayEnabled: Number(carRaw.templateCarplayEnabled || 0),
      androidAutoEnabled: Number(carRaw.templateAndroidAutoEnabled || 0),
      featureAirConditioning: Number(carRaw.templateFeatureAirConditioning || 0),
      featureAbs: Number(carRaw.templateFeatureAbs || 0),
      featureAirbags: Number(carRaw.templateFeatureAirbags || 0),
    },
    color: { name: carRaw.colorName },
  };

  return {
    car,
    templates: templatesList,
    colors: colorsList,
    seasons: seasonsList,
    durations: durationsList,
  };
}
