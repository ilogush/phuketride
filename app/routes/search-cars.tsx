import { useLoaderData } from "react-router";
import type { Route } from "./+types/search-cars";
import { useMemo, useState } from "react";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";
import HeroSection from "~/components/public/HeroSection";
import BodyTypeFilters from "~/components/public/BodyTypeFilters";
import PopularCarsSection from "~/components/public/PopularCarsSection";
import { buildCarPathSegment, buildCompanySlug } from "~/lib/car-path";
import { getCarPhotoUrls } from "~/lib/car-photos";
import { QUERY_LIMITS } from "~/lib/query-limits";

interface SearchCarItem {
  id: number;
  licensePlate: string;
  companyId: number;
  brandName: string;
  modelName: string;
  bodyType: string;
  year: number | null;
  transmission: string | null;
  fuelType: string | null;
  pricePerDay: number;
  deposit: number;
  photoUrl: string | null;
  photoUrls: string[];
  districtTitle: string;
  officeAddress: string;
  rating: number | null;
  totalRatings: number | null;
  pathSegment: string;
  companySlug: string;
}

const toNonEmpty = (value: string | null) => (value || "").trim();

export async function loader({ context, request }: Route.LoaderArgs) {
  const d1 = context.cloudflare.env.DB;
  const url = new URL(request.url);
  const q = toNonEmpty(url.searchParams.get("q")).toLowerCase();
  const district = toNonEmpty(url.searchParams.get("district")).toLowerCase();
  const bodyType = toNonEmpty(url.searchParams.get("bodyType"));

  const rowsResult = await d1
    .prepare(
      `
      SELECT
        cc.id AS id,
        cc.license_plate AS licensePlate,
        cc.company_id AS companyId,
        cb.name AS brandName,
        cm.name AS modelName,
        bt.name AS bodyType,
        cc.year AS year,
        cc.transmission AS transmission,
        ft.name AS fuelType,
        cc.price_per_day AS pricePerDay,
        cc.deposit AS deposit,
        cc.photos AS photos,
        c.name AS companyName,
        l.name AS locationName,
        d.name AS districtName,
        c.street AS street,
        c.house_number AS houseNumber,
        crm.total_rating AS rating,
        crm.total_ratings AS totalRatings
      FROM company_cars cc
      LEFT JOIN car_templates ct ON cc.template_id = ct.id
      LEFT JOIN car_brands cb ON ct.brand_id = cb.id
      LEFT JOIN car_models cm ON ct.model_id = cm.id
      LEFT JOIN body_types bt ON ct.body_type_id = bt.id
      LEFT JOIN fuel_types ft ON cc.fuel_type_id = ft.id
      INNER JOIN companies c ON cc.company_id = c.id
      LEFT JOIN locations l ON c.location_id = l.id
      LEFT JOIN districts d ON c.district_id = d.id
      LEFT JOIN car_rating_metrics crm ON cc.id = crm.company_car_id
      WHERE cc.status = 'available'
        AND cc.archived_at IS NULL
        AND c.archived_at IS NULL
      ORDER BY cc.created_at DESC
      LIMIT ${QUERY_LIMITS.XL}
      `,
    )
    .all();

  const rows = (rowsResult.results ?? []) as Array<Record<string, unknown>>;
  const cars = rows.map((row): SearchCarItem => {
    const photoUrls = getCarPhotoUrls(row.photos, request.url);
    const officeAddress = [row.street, row.houseNumber].filter(Boolean).map(String).join(" ");

    return {
      id: Number(row.id),
      licensePlate: String(row.licensePlate || ""),
      companyId: Number(row.companyId),
      brandName: (row.brandName as string) || "Car",
      modelName: (row.modelName as string) || `#${String(row.id)}`,
      bodyType: (row.bodyType as string) || "",
      year: (row.year as number | null) ?? null,
      transmission: (row.transmission as string | null) ?? null,
      fuelType: (row.fuelType as string | null) ?? null,
      pricePerDay: Number(row.pricePerDay || 0),
      deposit: Number(row.deposit || 0),
      photoUrl: photoUrls[0] || null,
      photoUrls,
      districtTitle: String(row.districtName || row.locationName || row.companyName || "Available cars"),
      officeAddress: officeAddress || String(row.companyName || ""),
      rating: row.rating ? Number(row.rating) : null,
      totalRatings: row.totalRatings ? Number(row.totalRatings) : null,
      pathSegment: buildCarPathSegment(
        String(row.companyName || ""),
        String(row.brandName || "Car"),
        String(row.modelName || ""),
        String(row.licensePlate || ""),
      ),
      companySlug: buildCompanySlug(String(row.companyName || "")),
    };
  });

  const filteredCars = cars.filter((car) => {
    const districtSource = `${car.districtTitle} ${car.officeAddress}`.toLowerCase();
    const querySource = `${car.brandName} ${car.modelName} ${car.bodyType} ${car.licensePlate}`.toLowerCase();

    if (district && !districtSource.includes(district)) {
      return false;
    }
    if (q && !querySource.includes(q) && !districtSource.includes(q)) {
      return false;
    }
    if (bodyType && bodyType !== "All" && car.bodyType !== bodyType) {
      return false;
    }
    return true;
  });

  const bodyTypes = [
    "All",
    ...Array.from(new Set(cars.map((car) => car.bodyType).filter((type) => Boolean(type)))),
  ];
  const districts = Array.from(
    new Set(
      cars
        .map((car) => car.districtTitle)
        .filter((name) => Boolean(name))
    )
  );

  return {
    cars: filteredCars,
    districts,
    bodyTypes,
    query: {
      q: toNonEmpty(url.searchParams.get("q")),
      district: toNonEmpty(url.searchParams.get("district")),
      bodyType: bodyType || "All",
      startDate: toNonEmpty(url.searchParams.get("startDate")),
      endDate: toNonEmpty(url.searchParams.get("endDate")),
      startTime: toNonEmpty(url.searchParams.get("startTime")),
      endTime: toNonEmpty(url.searchParams.get("endTime")),
    },
  };
}

export default function SearchCarsPage() {
  const { cars, districts, bodyTypes, query } = useLoaderData<typeof loader>();
  const [activeBodyType, setActiveBodyType] = useState(query.bodyType || "All");

  const shownCars = useMemo(() => {
    if (activeBodyType === "All") {
      return cars;
    }
    return cars.filter((car) => car.bodyType === activeBodyType);
  }, [activeBodyType, cars]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <HeroSection districts={districts} />

        <BodyTypeFilters bodyTypes={bodyTypes} activeType={activeBodyType} onTypeChange={setActiveBodyType} />
        <PopularCarsSection cars={shownCars} />
      </main>
      <Footer />
    </div>
  );
}
