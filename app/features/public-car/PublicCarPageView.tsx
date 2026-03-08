import { Link } from "react-router";
import { StarIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";

import Breadcrumbs from "~/components/public/Breadcrumbs";
import Footer from "~/components/public/Footer";
import Header from "~/components/public/Header";
import CarGallery from "~/components/public/car/CarGallery";
import CarHostSection from "~/components/public/car/CarHostSection";
import CarIncludedSection from "~/components/public/car/CarIncludedSection";
import CarReviewsSection from "~/components/public/car/CarReviewsSection";
import CarRulesSection from "~/components/public/car/CarRulesSection";
import CarTripSidebar from "~/components/public/car/CarTripSidebar";
import type {
  CarFeatureItem,
  CarIncludedItem,
  CarRatingSummary,
  CarReviewItem,
  CarRuleItem,
} from "~/components/public/car/types";

const formatMonthYear = (date: Date | null) => {
  if (!date) {
    return null;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

const FALLBACK_SEAT_OPTIONS = [4, 5, 7];
const FALLBACK_FUEL_OPTIONS = ["Petrol", "Hybrid", "Diesel"];
const FALLBACK_TRANSMISSION_OPTIONS = ["Automatic", "Manual"];
const FALLBACK_BODY_OPTIONS = ["Sedan", "SUV", "Hatchback"];

type PublicCarPageData = {
  car: {
    id: number;
    licensePlate: string;
    brandName: string | null;
    modelName: string | null;
    bodyType: string | null;
    year: number | null;
    fuelType: string | null;
    engineVolume: number | null;
    seats: number | null;
    doors: number | null;
    luggageCapacity: string | null;
    companyName: string;
    districtName: string | null;
    locationName: string | null;
    ownerName: string | null;
    ownerCreatedAt: Date | null;
    ownerAvatarUrl: string | null;
    companySlug: string;
    pathSegment: string;
    companyPhone: string | null;
    companyEmail: string | null;
    companyTelegram: string | null;
    deliveryFeeAfterHours: number;
    weeklySchedule: string | null;
    holidays: string | null;
    pricePerDay: number;
  };
  photos: string[];
  returnDistricts: Array<{
    id: number;
    name: string;
    isActive: boolean;
    deliveryPrice: number;
  }>;
  hostTrips: number;
  ratingSummary: CarRatingSummary | null;
  reviews: CarReviewItem[];
  includedItems: CarIncludedItem[];
  rules: CarRuleItem[];
  features: CarFeatureItem[];
};

export default function PublicCarPageView({
  car,
  photos,
  returnDistricts,
  hostTrips,
  ratingSummary,
  reviews,
  includedItems,
  rules,
  features,
}: PublicCarPageData) {
  const carNumber = String(car.licensePlate || "").trim();
  const displayCarNumber = carNumber
    ? carNumber.startsWith("#")
      ? carNumber
      : `#${carNumber}`
    : `#${car.id}`;
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
    {
      href: `/legal?company=${encodeURIComponent(car.companySlug)}`,
      label: "Terms & Policies",
    },
    {
      href: `/insurance-protection?company=${encodeURIComponent(car.companySlug)}`,
      label: "Insurance Docs",
    },
    {
      href: `/contact-support?company=${encodeURIComponent(car.companySlug)}`,
      label: "Support Guidelines",
    },
  ];
  const rulesFooterNote =
    "Vehicle may have a device that collects driving and location data. Data may be shared with third parties for vehicle recovery or protection purposes.";
  const engineFormatted =
    car.engineVolume == null ? null : String(car.engineVolume).replace(".", ",");
  const specifications = [
    `Year - ${car.year ?? "N/A"}`,
    `Body Type - ${car.bodyType || fallbackBody}`,
    `Fuel Type - ${car.fuelType || fallbackFuel}`,
    `Engine Volume (L) - ${engineFormatted || "N/A"}`,
    `Seats - ${String(car.seats || fallbackSeats)}`,
    `Doors - ${String(car.doors || 4)}`,
    `Luggage Capacity - ${
      car.luggageCapacity
        ? `${car.luggageCapacity[0].toUpperCase()}${car.luggageCapacity.slice(1)}`
        : "Medium"
    }`,
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <Breadcrumbs items={breadcrumbs} />
      <main className="max-w-5xl mx-auto px-4 space-y-6">
        <CarGallery title={title} photos={photos} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-2 space-y-6">
            <section className="space-y-4">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-4xl">
                {title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-gray-700">
                <span>
                  {car.year ?? "N/A"} {car.bodyType || fallbackBody}
                </span>
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
            <CarRulesSection
              rules={rules}
              policyLinks={policyLinks}
              footerNote={rulesFooterNote}
            />
            <CarReviewsSection rating={ratingSummary} reviews={reviews} />
            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-3">
              <h2 className="text-xl font-semibold text-gray-800">
                Need help before booking?
              </h2>
              <p className="text-sm text-gray-600">
                Contact support and we will help with pickup details, insurance,
                and host communication.
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
            initialReturnDistrictId={
              returnDistricts.find((district) => district.name === car.districtName)
                ?.id ?? null
            }
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
