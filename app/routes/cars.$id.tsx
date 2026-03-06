import type { Route } from "./+types/cars.$id";
import { Link, useLoaderData } from "react-router";
import {
  StarIcon,
} from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";
import Breadcrumbs from "~/components/public/Breadcrumbs";
import CarGallery from "~/components/public/car/CarGallery";
import CarHostSection from "~/components/public/car/CarHostSection";
import CarIncludedSection from "~/components/public/car/CarIncludedSection";
import CarRulesSection from "~/components/public/car/CarRulesSection";
import CarReviewsSection from "~/components/public/car/CarReviewsSection";
import CarTripSidebar from "~/components/public/car/CarTripSidebar";
import type {
  CarFeatureItem,
  CarRatingSummary,
  CarReviewItem,
} from "~/components/public/car/types";
import { buildCarPathSegment, buildCompanySlug, parseCarPathSegment } from "~/lib/car-path";
import { getCarPhotoUrls } from "~/lib/car-photos";
import { ensureCarDemoContent } from "~/lib/car-demo-content.server";
import { STATIC_INCLUDED_ITEMS, STATIC_RULES } from "~/components/public/car/static-policy-content";

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

const formatMonthYear = (date: Date | null) => {
  if (!date) {
    return null;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
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

const FALLBACK_SEAT_OPTIONS = [4, 5, 7];
const FALLBACK_FUEL_OPTIONS = ["Petrol", "Hybrid", "Diesel"];
const FALLBACK_TRANSMISSION_OPTIONS = ["Automatic", "Manual"];
const FALLBACK_BODY_OPTIONS = ["Sedan", "SUV", "Hatchback"];

export function meta({ data }: Route.MetaArgs) {
  if (!data?.car) {
    return [
      { title: "Car details | Phuket Ride" },
      { name: "description", content: "View detailed car information, pricing, and booking options on Phuket Ride." },
    ];
  }

  const car = data.car;
  const rawPlate = String(car.licensePlate || "").trim();
  const displayPlate = rawPlate ? (rawPlate.startsWith("#") ? rawPlate : `#${rawPlate}`) : `#${car.id}`;
  const carName = `${car.brandName || "Car"} ${car.modelName || "Model"} ${displayPlate}`.trim();
  const district = car.districtName || car.locationName || "Phuket";
  const title = `${carName} | Rent in ${district} | Phuket Ride`;
  const description = `Rent ${carName} in ${district}. Price from ฿${Math.round(car.pricePerDay || 0).toLocaleString()}/day on Phuket Ride.`;
  const canonical = data.canonicalUrl || "https://phuketride.com";
  const ogImage = data.photos?.[0] || "/images/hero-bg.webp";

  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "index,follow" },
    { tagName: "link", rel: "canonical", href: canonical },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const d1 = context.cloudflare.env.DB;
  const parsedPath = parseCarPathSegment(params.id);
  if (!parsedPath) {
    throw new Response("Invalid car path", { status: 400 });
  }

  const carCandidatesResult = await d1
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
      `
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
  const car = carRows.find((row) => (
    buildCarPathSegment(
      String(row.companyName || ""),
      String(row.brandName || ""),
      String(row.modelName || ""),
      String(row.licensePlate || ""),
    ) === parsedPath.full
  ));

  if (!car) {
    throw new Response("Car not found", { status: 404 });
  }
  const carId = Number(car.id || 0);
  await ensureCarDemoContent({
    db: d1,
    carId,
    carTitle: `${String(car.brandName || "Car")} ${String(car.modelName || "Model")}`.trim(),
    requestUrl: request.url,
  });

  const parsedLocationId = Number(car.locationId);
  const parsedCompanyId = Number(car.companyId);
  const safeLocationId = Number.isFinite(parsedLocationId) && parsedLocationId > 0 ? parsedLocationId : null;
  const safeCompanyId = Number.isFinite(parsedCompanyId) && parsedCompanyId > 0 ? parsedCompanyId : null;
  const districtPromise = (safeLocationId && safeCompanyId)
    ? d1
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
          `
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
    d1.prepare("SELECT count(*) AS trips FROM contracts WHERE company_car_id = ?").bind(carId).all(),
    d1.prepare(
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
      `
    ).bind(carId).all(),
    d1.prepare(
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
      `
    ).bind(carId).all(),
    d1.prepare(
      `
      SELECT
        id,
        category,
        name
      FROM car_features
      WHERE company_car_id = ?
      ORDER BY sort_order ASC, id ASC
      `
    ).bind(carId).all(),
  ]);

  const districtRows = (districtResult.results ?? []) as Array<Record<string, unknown>>;
  const tripStats = (tripStatsResult.results ?? []) as Array<Record<string, unknown>>;
  const ratingMetricsRows = (ratingMetricsResult.results ?? []) as Array<Record<string, unknown>>;
  const reviewRows = (reviewsResult.results ?? []) as Array<Record<string, unknown>>;
  const featureRows = (featuresResult.results ?? []) as Array<Record<string, unknown>>;

  const photos = getCarPhotoUrls(car.photos, request.url);

  const totalRatings = Number(ratingMetricsRows[0]?.totalRatings || 0);
  const ratingSummary: CarRatingSummary | null = totalRatings > 0
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

  const includedItems = STATIC_INCLUDED_ITEMS;
  const rules = STATIC_RULES;

  const features: CarFeatureItem[] = featureRows.map((row) => ({
    id: Number(row.id),
    category: String(row.category || ""),
    name: String(row.name || ""),
  }));
  const normalizedFeatureNames = new Set(features.map((feature) => feature.name.toLowerCase()));
  if (car.rearCamera && !normalizedFeatureNames.has("rear camera")) {
    features.push({ id: -1, category: "Safety", name: "Rear camera" });
  }
  if (car.bluetoothEnabled && !normalizedFeatureNames.has("bluetooth")) {
    features.push({ id: -2, category: "Specifications", name: "Bluetooth" });
  }
  if (Number(car.carplayEnabled || 0) && !normalizedFeatureNames.has("apple carplay") && !normalizedFeatureNames.has("carplay")) {
    features.push({ id: -3, category: "Specifications", name: "Apple CarPlay" });
  }
  if (Number(car.androidAutoEnabled || 0) && !normalizedFeatureNames.has("android auto")) {
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
      insurancePricePerDay: car.insurancePricePerDay ? Number(car.insurancePricePerDay) : null,
      maxInsurancePrice: car.maxInsurancePrice ? Number(car.maxInsurancePrice) : null,
      minRentalDays: car.minRentalDays ? Number(car.minRentalDays) : 1,
      fullInsuranceMinPrice: car.fullInsuranceMinPrice ? Number(car.fullInsuranceMinPrice) : null,
      fullInsuranceMaxPrice: car.fullInsuranceMaxPrice ? Number(car.fullInsuranceMaxPrice) : null,
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
    returnDistricts: districtRows.map((row) => ({
      id: Number(row.id || 0),
      name: String(row.name || ""),
      isActive: Boolean(row.isActive),
      deliveryPrice: Number(row.deliveryPrice || 0),
    })).filter((row) => row.id > 0 && row.name),
    hostTrips: Number(tripStats[0]?.trips || 0),
    ratingSummary,
    reviews,
    includedItems,
    rules,
    features,
    canonicalUrl: request.url,
  };
}

export default function PublicCarPage() {
  const { car, photos, returnDistricts, hostTrips, ratingSummary, reviews, includedItems, rules, features } = useLoaderData<typeof loader>();

  const carNumber = String(car.licensePlate || "").trim();
  const displayCarNumber = carNumber ? (carNumber.startsWith("#") ? carNumber : `#${carNumber}`) : `#${car.id}`;
  const title = `${car.brandName || "Car"} ${car.modelName || "Model"} ${displayCarNumber}`;
  const breadcrumbTitle = `${car.brandName || "Car"} ${car.modelName || "Model"}`.trim();
  const breadcrumbs = [
    { label: "Home", to: "/" },
    { label: "Cars" },
    { label: breadcrumbTitle },
  ];
  const pickupDistrict = car.districtName || car.locationName || car.companyName;
  const fallbackIndex = Math.abs(car.id || 0) % 3;
  const fallbackSeats = FALLBACK_SEAT_OPTIONS[fallbackIndex];
  const fallbackFuel = FALLBACK_FUEL_OPTIONS[fallbackIndex];
  const fallbackTransmission = FALLBACK_TRANSMISSION_OPTIONS[fallbackIndex % 2];
  const fallbackBody = FALLBACK_BODY_OPTIONS[fallbackIndex];
  const hostRating = Number(ratingSummary?.totalRating || 4.8);
  const formattedHostRating = hostRating.toFixed(2);
  const policyLinks = [
    { href: `/legal?company=${encodeURIComponent(car.companySlug)}`, label: "Terms & Policies" },
    { href: `/insurance-protection?company=${encodeURIComponent(car.companySlug)}`, label: "Insurance Docs" },
    { href: `/contact-support?company=${encodeURIComponent(car.companySlug)}`, label: "Support Guidelines" },
  ];
  const rulesFooterNote = "Vehicle may have a device that collects driving and location data. Data may be shared with third parties for vehicle recovery or protection purposes.";
  const engineFormatted = car.engineVolume == null ? null : String(car.engineVolume).replace(".", ",");
  const specifications = [
    `Year - ${car.year ?? "N/A"}`,
    `Body Type - ${car.bodyType || fallbackBody}`,
    `Fuel Type - ${car.fuelType || fallbackFuel}`,
    `Engine Volume (L) - ${engineFormatted || "N/A"}`,
    `Seats - ${String(car.seats || fallbackSeats)}`,
    `Doors - ${String(car.doors || 4)}`,
    `Luggage Capacity - ${car.luggageCapacity ? `${car.luggageCapacity[0].toUpperCase()}${car.luggageCapacity.slice(1)}` : "Medium"}`,
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <Breadcrumbs items={breadcrumbs} />
      <main className="max-w-5xl mx-auto px-4 space-y-6">
        <CarGallery title={title} photos={photos} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-6">
            <section className="space-y-4">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-4xl">
                {title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-gray-700">
                <span>{car.year ?? "N/A"} {car.bodyType || fallbackBody}</span>
                <span className="text-gray-400">•</span>
                <span>{formattedHostRating}</span>
                <StarIcon className="h-5 w-5 text-green-600" />
                <span className="text-gray-500">({hostTrips} trips)</span>
                <span className="text-gray-400">•</span>
                <SparklesIcon className="h-5 w-5 text-green-600" />
                <span className="text-base">All-Star Host</span>
              </div>
            </section>
            <CarHostSection
              companyName={car.companyName}
              ownerName={car.ownerName}
              companySlug={car.companySlug}
              hostTrips={hostTrips}
              hostJoinedAt={formatMonthYear(car.ownerCreatedAt || null)}
              hostAvatarUrl={car.ownerAvatarUrl}
              hostRating={hostRating}
              features={features}
              specifications={specifications}
            />

            <CarIncludedSection items={includedItems} />
            <CarRulesSection rules={rules} policyLinks={policyLinks} footerNote={rulesFooterNote} />
            <CarReviewsSection rating={ratingSummary} reviews={reviews} />
            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-3">
              <h3 className="text-xl font-semibold text-gray-800">Need help before booking?</h3>
              <p className="text-sm text-gray-600">
                Contact support and we will help with pickup details, insurance, and host communication.
              </p>
              <Link
                to={`/contact-support?company=${encodeURIComponent(car.companySlug)}`}
                className="inline-flex items-center rounded-lg border border-green-600 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
              >
                Contact support
              </Link>
            </section>
          </section>

          <CarTripSidebar
            carId={car.id}
            carPathSegment={car.pathSegment}
            showPricePerDay={false}
            pickupDistrict={pickupDistrict}
            returnDistricts={returnDistricts}
            initialReturnDistrictId={returnDistricts.find((district) => district.name === car.districtName)?.id ?? null}
            pricePerDay={car.pricePerDay}
            hostPhone={car.companyPhone || "+66610000000"}
            hostEmail={car.companyEmail || "host+test@phuketride.com"}
            hostTelegram={car.companyTelegram || "@phuketride_support_test"}
            deliveryFeeAfterHours={Number(car.deliveryFeeAfterHours || 0)}
            weeklySchedule={car.weeklySchedule || null}
            holidays={car.holidays || null}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
