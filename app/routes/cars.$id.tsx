import type { Route } from "./+types/cars.$id";
import { useLoaderData } from "react-router";
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
  CarIncludedItem,
  CarRatingSummary,
  CarReviewItem,
  CarRuleItem,
} from "~/components/public/car/types";

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

export async function loader({ context, params }: Route.LoaderArgs) {
  const d1 = context.cloudflare.env.DB;
  const carId = Number(params.id);

  if (!Number.isFinite(carId) || carId <= 0) {
    throw new Response("Invalid car id", { status: 400 });
  }

  const carResult = await d1
    .prepare(
      `
      SELECT
        cc.id AS id,
        cb.name AS brandName,
        cm.name AS modelName,
        bt.name AS bodyType,
        cc.year AS year,
        cc.transmission AS transmission,
        ft.name AS fuelType,
        cc.engine_volume AS engineVolume,
        ct.seats AS seats,
        ct.doors AS doors,
        cc.price_per_day AS pricePerDay,
        cc.deposit AS deposit,
        cc.min_insurance_price AS minInsurancePrice,
        cc.max_insurance_price AS maxInsurancePrice,
        cc.full_insurance_min_price AS fullInsuranceMinPrice,
        cc.full_insurance_max_price AS fullInsuranceMaxPrice,
        cc.photos AS photos,
        c.name AS companyName,
        c.location_id AS locationId,
        l.name AS locationName,
        d.name AS districtName,
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
      WHERE cc.id = ?
        AND cc.archived_at IS NULL
        AND c.archived_at IS NULL
      LIMIT 1
      `
    )
    .bind(carId)
    .all();
  const carRows = (carResult.results ?? []) as Array<Record<string, unknown>>;

  if (!carRows.length) {
    throw new Response("Car not found", { status: 404 });
  }
  const car = carRows[0];

  const parsedLocationId = Number(car.locationId);
  const safeLocationId = Number.isFinite(parsedLocationId) && parsedLocationId > 0 ? parsedLocationId : null;
  const districtRows: Array<Record<string, unknown>> = safeLocationId
    ? ((await d1
        .prepare(
          `
          SELECT
            id,
            name
          FROM districts
          WHERE location_id = ?
          ORDER BY name ASC
          `
        )
        .bind(safeLocationId)
        .all()).results ?? []) as Array<Record<string, unknown>>
    : [];

  const tripStatsResult = await d1
    .prepare("SELECT count(*) AS trips FROM contracts WHERE company_car_id = ?")
    .bind(carId)
    .all();
  const tripStats = (tripStatsResult.results ?? []) as Array<Record<string, unknown>>;

  const ratingMetricsResult = await d1
    .prepare(
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
    )
    .bind(carId)
    .all();
  const ratingMetricsRows = (ratingMetricsResult.results ?? []) as Array<Record<string, unknown>>;

  const reviewsResult = await d1
    .prepare(
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
      ORDER BY sort_order ASC, id ASC
      `
    )
    .bind(carId)
    .all();
  const reviewRows = (reviewsResult.results ?? []) as Array<Record<string, unknown>>;

  const includedResult = await d1
    .prepare(
      `
      SELECT
        id,
        category,
        title,
        description,
        icon_key AS iconKey
      FROM car_included_items
      WHERE company_car_id = ?
      ORDER BY sort_order ASC, id ASC
      `
    )
    .bind(carId)
    .all();
  const includedRows = (includedResult.results ?? []) as Array<Record<string, unknown>>;

  const rulesResult = await d1
    .prepare(
      `
      SELECT
        id,
        title,
        description,
        icon_key AS iconKey
      FROM car_rules
      WHERE company_car_id = ?
      ORDER BY sort_order ASC, id ASC
      `
    )
    .bind(carId)
    .all();
  const rulesRows = (rulesResult.results ?? []) as Array<Record<string, unknown>>;

  const featuresResult = await d1
    .prepare(
      `
      SELECT
        id,
        category,
        name
      FROM car_features
      WHERE company_car_id = ?
      ORDER BY sort_order ASC, id ASC
      `
    )
    .bind(carId)
    .all();
  const featureRows = (featuresResult.results ?? []) as Array<Record<string, unknown>>;

  let photos: string[] = [];
  if (typeof car.photos === "string" && car.photos) {
    try {
      const parsed = JSON.parse(car.photos);
      photos = Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
    } catch {
      photos = [];
    }
  }

  const ratingSummary: CarRatingSummary | null = ratingMetricsRows[0]
    ? {
        totalRating: Number(ratingMetricsRows[0].totalRating || 0),
        totalRatings: Number(ratingMetricsRows[0].totalRatings || 0),
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

  const includedItems: CarIncludedItem[] = includedRows.map((row) => ({
    id: Number(row.id),
    category: (row.category as string) || "General",
    title: String(row.title || ""),
    description: (row.description as string | null) ?? null,
    iconKey: String(row.iconKey || ""),
  }));

  const rules: CarRuleItem[] = rulesRows.map((row) => ({
    id: Number(row.id),
    title: String(row.title || ""),
    description: (row.description as string | null) ?? null,
    iconKey: String(row.iconKey || ""),
  }));

  const features: CarFeatureItem[] = featureRows.map((row) => ({
    id: Number(row.id),
    category: String(row.category || ""),
    name: String(row.name || ""),
  }));

  return {
    car: {
      id: Number(car.id),
      brandName: (car.brandName as string | null) ?? null,
      modelName: (car.modelName as string | null) ?? null,
      bodyType: (car.bodyType as string | null) ?? null,
      year: (car.year as number | null) ?? null,
      transmission: (car.transmission as string | null) ?? null,
      fuelType: (car.fuelType as string | null) ?? null,
      engineVolume: Number(car.engineVolume || 0) || null,
      seats: (car.seats as number | null) ?? null,
      doors: (car.doors as number | null) ?? null,
      pricePerDay: Number(car.pricePerDay || 0),
      deposit: Number(car.deposit || 0),
      minInsurancePrice: car.minInsurancePrice ? Number(car.minInsurancePrice) : null,
      maxInsurancePrice: car.maxInsurancePrice ? Number(car.maxInsurancePrice) : null,
      fullInsuranceMinPrice: car.fullInsuranceMinPrice ? Number(car.fullInsuranceMinPrice) : null,
      fullInsuranceMaxPrice: car.fullInsuranceMaxPrice ? Number(car.fullInsuranceMaxPrice) : null,
      companyName: String(car.companyName || ""),
      locationId: Number(car.locationId || 0) || null,
      locationName: (car.locationName as string | null) ?? null,
      districtName: (car.districtName as string | null) ?? null,
      ownerName: (car.ownerName as string | null) ?? null,
      ownerAvatarUrl: (car.ownerAvatarUrl as string | null) ?? null,
      ownerCreatedAt: toDateOrNull(car.ownerCreatedAt),
      marketingHeadline: (car.marketingHeadline as string | null) ?? null,
      description: (car.description as string | null) ?? null,
    },
    photos,
    returnDistricts: districtRows.map((row) => ({
      id: Number(row.id || 0),
      name: String(row.name || ""),
    })).filter((row) => row.id > 0 && row.name),
    hostTrips: Number(tripStats[0]?.trips || 0),
    ratingSummary,
    reviews,
    includedItems,
    rules,
    features,
  };
}

export default function PublicCarPage() {
  const { car, photos, returnDistricts, hostTrips, ratingSummary, reviews, includedItems, rules, features } = useLoaderData<typeof loader>();

  const title = `${car.brandName || "Car"} ${car.modelName || `#${car.id}`}`;
  const breadcrumbs = [
    { label: "Home", to: "/" },
    { label: "Cars", to: "/cars" },
    { label: title },
  ];
  const pickupDistrict = car.districtName || car.locationName || car.companyName;
  const specifications = [
    car.year ? String(car.year) : null,
    `${car.seats || 4} seats`,
    car.fuelType || "Gas",
    car.transmission || "Automatic",
    car.bodyType || "Car",
    car.engineVolume ? `${car.engineVolume}L` : null,
    car.doors ? `${car.doors} doors` : null,
    car.deposit ? `Deposit ฿${Math.round(car.deposit).toLocaleString()}` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="min-h-screen">
      <Header />
      <Breadcrumbs items={breadcrumbs} />
      <main className="max-w-5xl mx-auto px-4 space-y-6">
        <CarGallery title={title} photos={photos} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-6">
            <CarHostSection
              title={title}
              year={car.year}
              hostName={car.ownerName || car.companyName}
              hostTrips={hostTrips}
              hostJoinedAt={formatMonthYear(car.ownerCreatedAt || null)}
              hostAvatarUrl={car.ownerAvatarUrl}
              features={features}
              specifications={specifications}
            />

            <CarIncludedSection items={includedItems} />
            <CarRulesSection rules={rules} />
            <CarReviewsSection rating={ratingSummary} reviews={reviews} />
          </section>

          <CarTripSidebar
            carId={car.id}
            showPricePerDay={false}
            pickupDistrict={pickupDistrict}
            returnDistricts={returnDistricts.map((district) => district.name)}
            initialReturnDistrict={car.districtName}
            pricePerDay={car.pricePerDay}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
