import type { Route } from "./+types/cars.$id";
import { useLoaderData } from "react-router";
import { drizzle } from "drizzle-orm/d1";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import * as schema from "~/db/schema";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";
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

export async function loader({ context, params }: Route.LoaderArgs) {
  const db = drizzle(context.cloudflare.env.DB, { schema });
  const carId = Number(params.id);

  if (!Number.isFinite(carId) || carId <= 0) {
    throw new Response("Invalid car id", { status: 400 });
  }

  const car = await db
    .select({
      id: schema.companyCars.id,
      brandName: schema.carBrands.name,
      modelName: schema.carModels.name,
      bodyType: schema.bodyTypes.name,
      year: schema.companyCars.year,
      transmission: schema.companyCars.transmission,
      fuelType: schema.fuelTypes.name,
      engineVolume: schema.companyCars.engineVolume,
      seats: schema.carTemplates.seats,
      doors: schema.carTemplates.doors,
      pricePerDay: schema.companyCars.pricePerDay,
      deposit: schema.companyCars.deposit,
      minInsurancePrice: schema.companyCars.minInsurancePrice,
      maxInsurancePrice: schema.companyCars.maxInsurancePrice,
      fullInsuranceMinPrice: schema.companyCars.fullInsuranceMinPrice,
      fullInsuranceMaxPrice: schema.companyCars.fullInsuranceMaxPrice,
      photos: schema.companyCars.photos,
      companyName: schema.companies.name,
      locationName: schema.locations.name,
      districtName: schema.districts.name,
      ownerName: schema.users.name,
      ownerAvatarUrl: schema.users.avatarUrl,
      ownerCreatedAt: schema.users.createdAt,
      marketingHeadline: schema.companyCars.marketingHeadline,
      description: schema.companyCars.description,
    })
    .from(schema.companyCars)
    .leftJoin(schema.carTemplates, eq(schema.companyCars.templateId, schema.carTemplates.id))
    .leftJoin(schema.carBrands, eq(schema.carTemplates.brandId, schema.carBrands.id))
    .leftJoin(schema.carModels, eq(schema.carTemplates.modelId, schema.carModels.id))
    .leftJoin(schema.bodyTypes, eq(schema.carTemplates.bodyTypeId, schema.bodyTypes.id))
    .leftJoin(schema.fuelTypes, eq(schema.companyCars.fuelTypeId, schema.fuelTypes.id))
    .innerJoin(schema.companies, eq(schema.companyCars.companyId, schema.companies.id))
    .leftJoin(schema.users, eq(schema.companies.ownerId, schema.users.id))
    .leftJoin(schema.locations, eq(schema.companies.locationId, schema.locations.id))
    .leftJoin(schema.districts, eq(schema.companies.districtId, schema.districts.id))
    .where(
      and(
        eq(schema.companyCars.id, carId),
        isNull(schema.companyCars.archivedAt),
        isNull(schema.companies.archivedAt),
      ),
    )
    .limit(1);

  if (!car.length) {
    throw new Response("Car not found", { status: 404 });
  }

  const tripStats = await db
    .select({
      trips: sql<number>`count(*)`,
    })
    .from(schema.contracts)
    .where(eq(schema.contracts.companyCarId, carId));

  const ratingMetricsRows = await db
    .select({
      totalRating: schema.carRatingMetrics.totalRating,
      totalRatings: schema.carRatingMetrics.totalRatings,
      cleanliness: schema.carRatingMetrics.cleanliness,
      maintenance: schema.carRatingMetrics.maintenance,
      communication: schema.carRatingMetrics.communication,
      convenience: schema.carRatingMetrics.convenience,
      accuracy: schema.carRatingMetrics.accuracy,
    })
    .from(schema.carRatingMetrics)
    .where(eq(schema.carRatingMetrics.companyCarId, carId))
    .limit(1);

  const reviewRows = await db
    .select({
      id: schema.carReviews.id,
      reviewerName: schema.carReviews.reviewerName,
      reviewerAvatarUrl: schema.carReviews.reviewerAvatarUrl,
      rating: schema.carReviews.rating,
      reviewText: schema.carReviews.reviewText,
      reviewDate: schema.carReviews.reviewDate,
    })
    .from(schema.carReviews)
    .where(eq(schema.carReviews.companyCarId, carId))
    .orderBy(asc(schema.carReviews.sortOrder), asc(schema.carReviews.id));

  const includedRows = await db
    .select({
      id: schema.carIncludedItems.id,
      category: schema.carIncludedItems.category,
      title: schema.carIncludedItems.title,
      description: schema.carIncludedItems.description,
      iconKey: schema.carIncludedItems.iconKey,
    })
    .from(schema.carIncludedItems)
    .where(eq(schema.carIncludedItems.companyCarId, carId))
    .orderBy(asc(schema.carIncludedItems.sortOrder), asc(schema.carIncludedItems.id));

  const rulesRows = await db
    .select({
      id: schema.carRules.id,
      title: schema.carRules.title,
      description: schema.carRules.description,
      iconKey: schema.carRules.iconKey,
    })
    .from(schema.carRules)
    .where(eq(schema.carRules.companyCarId, carId))
    .orderBy(asc(schema.carRules.sortOrder), asc(schema.carRules.id));

  const featureRows = await db
    .select({
      id: schema.carFeatures.id,
      category: schema.carFeatures.category,
      name: schema.carFeatures.name,
    })
    .from(schema.carFeatures)
    .where(eq(schema.carFeatures.companyCarId, carId))
    .orderBy(asc(schema.carFeatures.sortOrder), asc(schema.carFeatures.id));

  let photos: string[] = [];
  if (car[0].photos) {
    try {
      const parsed = JSON.parse(car[0].photos);
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
    id: row.id,
    reviewerName: row.reviewerName,
    reviewerAvatarUrl: row.reviewerAvatarUrl,
    rating: Number(row.rating || 0),
    reviewText: row.reviewText,
    reviewDate: formatDate(row.reviewDate || null),
  }));

  const includedItems: CarIncludedItem[] = includedRows.map((row) => ({
    id: row.id,
    category: row.category || "General",
    title: row.title,
    description: row.description,
    iconKey: row.iconKey,
  }));

  const rules: CarRuleItem[] = rulesRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    iconKey: row.iconKey,
  }));

  const features: CarFeatureItem[] = featureRows.map((row) => ({
    id: row.id,
    category: row.category,
    name: row.name,
  }));

  return {
    car: car[0],
    photos,
    hostTrips: Number(tripStats[0]?.trips || 0),
    ratingSummary,
    reviews,
    includedItems,
    rules,
    features,
  };
}

export default function PublicCarPage() {
  const { car, photos, hostTrips, ratingSummary, reviews, includedItems, rules, features } = useLoaderData<typeof loader>();

  const title = `${car.brandName || "Car"} ${car.modelName || `#${car.id}`}`;
  const officeLocation = [car.locationName, car.districtName].filter(Boolean).join(" • ") || car.companyName;
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
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-6">
            <CarGallery title={title} photos={photos} />

            <div className="space-y-1">
              <h1 className="text-3xl font-semibold text-gray-800">{title}</h1>
            </div>

            <CarHostSection
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
            officeLocation={officeLocation}
            pricePerDay={car.pricePerDay}
            minInsurancePrice={car.minInsurancePrice}
            maxInsurancePrice={car.maxInsurancePrice}
            fullInsuranceMinPrice={car.fullInsuranceMinPrice}
            fullInsuranceMaxPrice={car.fullInsuranceMaxPrice}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
