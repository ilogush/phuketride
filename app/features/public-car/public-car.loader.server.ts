import { STATIC_INCLUDED_ITEMS, STATIC_RULES } from "~/components/public/car/static-policy-content";
import type {
  CarFeatureItem,
  CarRatingSummary,
  CarReviewItem,
} from "~/components/public/car/types";
import { buildCarPathSegment, buildCompanySlug, parseCarPathSegment } from "~/lib/car-path";
import { getCarPhotoUrls } from "~/lib/car-photos";
import { ensureCarDemoContent } from "~/lib/car-demo-content.server";

const formatDate = (date: Date | null) => {
  if (!date) {
    return null;
  }
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const toDateOrNull = (value: unknown): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  const date = new Date(n);
  return Number.isNaN(date.getTime()) ? null : date;
};

export async function loadPublicCarPage(args: {
  db: D1Database;
  request: Request;
  routeCarPath: string | undefined;
}) {
  const { db, request, routeCarPath } = args;
  const parsedPath = parseCarPathSegment(routeCarPath);
  if (!parsedPath) {
    throw new Response("Invalid car path", { status: 400 });
  }

  const carCandidatesResult = await db
    .prepare(
      `
      SELECT
        cc.id AS id,
        cc.license_plate AS licensePlate,
        c.id AS companyId,
        cb.name AS brandName,
        cm.name AS modelName,
        bt.name AS bodyType,
        cc.year AS year,
        cc.transmission AS transmission,
        ft.name AS fuelType,
        cc.engine_volume AS engineVolume,
        ct.seats AS seats,
        ct.doors AS doors,
        ct.drivetrain AS drivetrain,
        ct.luggage_capacity AS luggageCapacity,
        ct.rear_camera AS rearCamera,
        ct.bluetooth_enabled AS bluetoothEnabled,
        ct.carplay_enabled AS carplayEnabled,
        ct.android_auto_enabled AS androidAutoEnabled,
        ct.feature_airbags AS featureAirbags,
        cc.price_per_day AS pricePerDay,
        cc.deposit AS deposit,
        cc.insurance_price_per_day AS insurancePricePerDay,
        cc.max_insurance_price AS maxInsurancePrice,
        cc.min_rental_days AS minRentalDays,
        cc.full_insurance_min_price AS fullInsuranceMinPrice,
        cc.full_insurance_max_price AS fullInsuranceMaxPrice,
        cc.photos AS photos,
        c.name AS companyName,
        c.location_id AS locationId,
        l.name AS locationName,
        d.name AS districtName,
        c.email AS companyEmail,
        c.phone AS companyPhone,
        c.telegram AS companyTelegram,
        c.delivery_fee_after_hours AS deliveryFeeAfterHours,
        c.weekly_schedule AS weeklySchedule,
        c.holidays AS holidays,
        u.name AS ownerName,
        u.avatar_url AS ownerAvatarUrl,
        u.created_at AS ownerCreatedAt,
        cc.marketing_headline AS marketingHeadline,
        cc.description AS description
      FROM company_cars cc
      LEFT JOIN car_templates ct ON cc.template_id = ct.id
      LEFT JOIN car_brands cb ON ct.brand_id = cb.id
      LEFT JOIN car_models cm ON ct.model_id = cm.id
      LEFT JOIN body_types bt ON ct.body_type_id = bt.id
      LEFT JOIN fuel_types ft ON cc.fuel_type_id = ft.id
      INNER JOIN companies c ON cc.company_id = c.id
      LEFT JOIN users u ON c.owner_id = u.id
      LEFT JOIN locations l ON c.location_id = l.id
      LEFT JOIN districts d ON c.district_id = d.id
      WHERE cc.archived_at IS NULL
        AND c.archived_at IS NULL
        AND (
          LOWER(TRIM(COALESCE(cc.license_plate, ''))) = LOWER(TRIM(?))
          OR LOWER(COALESCE(cc.license_plate, '')) LIKE '%' || LOWER(?) || '%'
        )
        AND (
          ? = ''
          OR LOWER(COALESCE(c.name, '')) LIKE LOWER(?) || '%'
        )
      ORDER BY
        CASE WHEN LOWER(TRIM(COALESCE(cc.license_plate, ''))) = LOWER(TRIM(?)) THEN 0 ELSE 1 END,
        CASE WHEN ? = '' OR LOWER(COALESCE(c.name, '')) LIKE LOWER(?) || '%' THEN 0 ELSE 1 END,
        cc.id DESC
      LIMIT 8
      `,
    )
    .bind(
      parsedPath.plateTail,
      parsedPath.plateTail,
      parsedPath.companyHint,
      parsedPath.companyHint,
      parsedPath.plateTail,
      parsedPath.companyHint,
      parsedPath.companyHint,
    )
    .all();
  const carRows = (carCandidatesResult.results ?? []) as Array<Record<string, unknown>>;
  const car = carRows.find(
    (row) =>
      buildCarPathSegment(
        String(row.companyName || ""),
        String(row.brandName || ""),
        String(row.modelName || ""),
        String(row.licensePlate || ""),
      ) === parsedPath.full,
  );

  if (!car) {
    throw new Response("Car not found", { status: 404 });
  }

  const carId = Number(car.id || 0);
  await ensureCarDemoContent({
    db,
    carId,
    carTitle: `${String(car.brandName || "Car")} ${String(
      car.modelName || "Model",
    )}`.trim(),
    requestUrl: request.url,
  });

  const parsedLocationId = Number(car.locationId);
  const parsedCompanyId = Number(car.companyId);
  const safeLocationId =
    Number.isFinite(parsedLocationId) && parsedLocationId > 0
      ? parsedLocationId
      : null;
  const safeCompanyId =
    Number.isFinite(parsedCompanyId) && parsedCompanyId > 0
      ? parsedCompanyId
      : null;
  const districtPromise =
    safeLocationId && safeCompanyId
      ? db
          .prepare(
            `
            SELECT
              d.id AS id,
              d.name AS name,
              cds.is_active AS isActive,
              cds.delivery_price AS deliveryPrice
            FROM company_delivery_settings cds
            JOIN districts d ON d.id = cds.district_id
            WHERE cds.company_id = ?
              AND d.location_id = ?
            ORDER BY name ASC
            `,
          )
          .bind(safeCompanyId, safeLocationId)
          .all()
      : Promise.resolve({ results: [] as Record<string, unknown>[] });

  const [
    districtResult,
    tripStatsResult,
    ratingMetricsResult,
    reviewsResult,
    featuresResult,
  ] = await Promise.all([
    districtPromise,
    db.prepare("SELECT count(*) AS trips FROM contracts WHERE company_car_id = ?")
      .bind(carId)
      .all(),
    db.prepare(
      `
      SELECT
        total_rating AS totalRating,
        total_ratings AS totalRatings,
        cleanliness,
        maintenance,
        communication,
        convenience,
        accuracy
      FROM car_rating_metrics
      WHERE company_car_id = ?
      LIMIT 1
      `,
    )
      .bind(carId)
      .all(),
    db.prepare(
      `
      SELECT
        id,
        reviewer_name AS reviewerName,
        reviewer_avatar_url AS reviewerAvatarUrl,
        rating,
        review_text AS reviewText,
        review_date AS reviewDate
      FROM car_reviews
      WHERE company_car_id = ?
      ORDER BY COALESCE(review_date, 0) DESC, id DESC
      LIMIT 12
      `,
    )
      .bind(carId)
      .all(),
    db.prepare(
      `
      SELECT
        id,
        category,
        name
      FROM car_features
      WHERE company_car_id = ?
      ORDER BY sort_order ASC, id ASC
      `,
    )
      .bind(carId)
      .all(),
  ]);

  const districtRows = (districtResult.results ?? []) as Array<Record<string, unknown>>;
  const tripStats = (tripStatsResult.results ?? []) as Array<Record<string, unknown>>;
  const ratingMetricsRows = (ratingMetricsResult.results ?? []) as Array<
    Record<string, unknown>
  >;
  const reviewRows = (reviewsResult.results ?? []) as Array<Record<string, unknown>>;
  const featureRows = (featuresResult.results ?? []) as Array<Record<string, unknown>>;

  const photos = getCarPhotoUrls(car.photos, request.url);
  const totalRatings = Number(ratingMetricsRows[0]?.totalRatings || 0);
  const ratingSummary: CarRatingSummary | null =
    totalRatings > 0
      ? {
          totalRating: Number(ratingMetricsRows[0].totalRating || 0),
          totalRatings,
          cleanliness: Number(ratingMetricsRows[0].cleanliness || 0),
          maintenance: Number(ratingMetricsRows[0].maintenance || 0),
          communication: Number(ratingMetricsRows[0].communication || 0),
          convenience: Number(ratingMetricsRows[0].convenience || 0),
          accuracy: Number(ratingMetricsRows[0].accuracy || 0),
        }
      : null;

  const reviews: CarReviewItem[] = reviewRows.map((row) => ({
    id: Number(row.id),
    reviewerName: String(row.reviewerName || ""),
    reviewerAvatarUrl: (row.reviewerAvatarUrl as string | null) ?? null,
    rating: Number(row.rating || 0),
    reviewText: String(row.reviewText || ""),
    reviewDate: formatDate(toDateOrNull(row.reviewDate)),
  }));

  const features: CarFeatureItem[] = featureRows.map((row) => ({
    id: Number(row.id),
    category: String(row.category || ""),
    name: String(row.name || ""),
  }));
  const normalizedFeatureNames = new Set(
    features.map((feature) => feature.name.toLowerCase()),
  );
  if (car.rearCamera && !normalizedFeatureNames.has("rear camera")) {
    features.push({ id: -1, category: "Safety", name: "Rear camera" });
  }
  if (car.bluetoothEnabled && !normalizedFeatureNames.has("bluetooth")) {
    features.push({ id: -2, category: "Specifications", name: "Bluetooth" });
  }
  if (
    Number(car.carplayEnabled || 0) &&
    !normalizedFeatureNames.has("apple carplay") &&
    !normalizedFeatureNames.has("carplay")
  ) {
    features.push({ id: -3, category: "Specifications", name: "Apple CarPlay" });
  }
  if (
    Number(car.androidAutoEnabled || 0) &&
    !normalizedFeatureNames.has("android auto")
  ) {
    features.push({ id: -4, category: "Specifications", name: "Android Auto" });
  }

  return {
    car: {
      id: Number(car.id),
      licensePlate: String(car.licensePlate || ""),
      companyId: Number(car.companyId || 0),
      brandName: (car.brandName as string | null) ?? null,
      modelName: (car.modelName as string | null) ?? null,
      bodyType: (car.bodyType as string | null) ?? null,
      year: (car.year as number | null) ?? null,
      transmission: (car.transmission as string | null) ?? null,
      fuelType: (car.fuelType as string | null) ?? null,
      engineVolume: Number(car.engineVolume || 0) || null,
      seats: (car.seats as number | null) ?? null,
      doors: (car.doors as number | null) ?? null,
      drivetrain: (car.drivetrain as string | null) ?? null,
      luggageCapacity: (car.luggageCapacity as string | null) ?? null,
      rearCamera: Number(car.rearCamera || 0),
      bluetoothEnabled: Number(car.bluetoothEnabled || 0),
      carplayEnabled: Number(car.carplayEnabled || 0),
      androidAutoEnabled: Number(car.androidAutoEnabled || 0),
      featureAirbags: Number(car.featureAirbags || 0),
      pricePerDay: Number(car.pricePerDay || 0),
      deposit: Number(car.deposit || 0),
      insurancePricePerDay: car.insurancePricePerDay
        ? Number(car.insurancePricePerDay)
        : null,
      maxInsurancePrice: car.maxInsurancePrice ? Number(car.maxInsurancePrice) : null,
      minRentalDays: car.minRentalDays ? Number(car.minRentalDays) : 1,
      fullInsuranceMinPrice: car.fullInsuranceMinPrice
        ? Number(car.fullInsuranceMinPrice)
        : null,
      fullInsuranceMaxPrice: car.fullInsuranceMaxPrice
        ? Number(car.fullInsuranceMaxPrice)
        : null,
      companyName: String(car.companyName || ""),
      locationId: Number(car.locationId || 0) || null,
      locationName: (car.locationName as string | null) ?? null,
      districtName: (car.districtName as string | null) ?? null,
      ownerName: (car.ownerName as string | null) ?? null,
      ownerAvatarUrl: (car.ownerAvatarUrl as string | null) ?? null,
      ownerCreatedAt: toDateOrNull(car.ownerCreatedAt),
      companyEmail: (car.companyEmail as string | null) ?? null,
      companyPhone: (car.companyPhone as string | null) ?? null,
      companyTelegram: (car.companyTelegram as string | null) ?? null,
      deliveryFeeAfterHours: Number(car.deliveryFeeAfterHours || 0),
      weeklySchedule: (car.weeklySchedule as string | null) ?? null,
      holidays: (car.holidays as string | null) ?? null,
      marketingHeadline: (car.marketingHeadline as string | null) ?? null,
      description: (car.description as string | null) ?? null,
      companySlug: buildCompanySlug(String(car.companyName || "")),
      pathSegment: buildCarPathSegment(
        String(car.companyName || ""),
        (car.brandName as string | null) ?? null,
        (car.modelName as string | null) ?? null,
        String(car.licensePlate || ""),
      ),
    },
    photos,
    returnDistricts: districtRows
      .map((row) => ({
        id: Number(row.id || 0),
        name: String(row.name || ""),
        isActive: Boolean(row.isActive),
        deliveryPrice: Number(row.deliveryPrice || 0),
      }))
      .filter((row) => row.id > 0 && row.name),
    hostTrips: Number(tripStats[0]?.trips || 0),
    ratingSummary,
    reviews,
    includedItems: STATIC_INCLUDED_ITEMS,
    rules: STATIC_RULES,
    features,
    canonicalUrl: request.url,
  };
}
