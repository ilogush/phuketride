import type { Route } from "./+types/home";
import { useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import Header from "~/components/public/Header";
import HeroSection from "~/components/public/HeroSection";
import BodyTypeFilters from "~/components/public/BodyTypeFilters";
import PopularCarsSection from "~/components/public/PopularCarsSection";
import Footer from "~/components/public/Footer";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Best Car Rental | Professional Fleet Management" },
    { 
      name: "description", 
      content: "Advanced car rental and fleet management system. Track contracts, manage payments, and optimize your business with Best Car Rental." 
    },
    { name: "author", content: "Best Car Rental Team" },
    { name: "keywords", content: "car rental,fleet management,booking system,Best Car Rental,Hua Hin car rental" },
    { name: "creator", content: "Best Car Rental" },
    { name: "robots", content: "index, follow" },
    { property: "og:title", content: "Best Car Rental | Professional Fleet Management" },
    { property: "og:description", content: "Steamlined car rental operations and fleet management." },
    { property: "og:url", content: "https://phuketride.com" },
    { property: "og:site_name", content: "Best Car Rental" },
    { property: "og:locale", content: "en_US" },
    { property: "og:image", content: "http://localhost:3000/og-image.png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "Best Car Rental Dashboard" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Best Car Rental | Professional Fleet Management" },
    { name: "twitter:description", content: "Advanced car rental and fleet management system." },
    { name: "twitter:image", content: "http://localhost:3000/og-image.png" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const d1 = context.cloudflare.env.DB;

  const rowsResult = await d1
    .prepare(
      `
      SELECT
        cc.id AS id,
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
        CASE
          WHEN json_valid(cc.photos) THEN json_extract(cc.photos, '$[0]')
          ELSE NULL
        END AS photoUrl,
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
      LIMIT 120
      `
    )
    .all();
  const rows = ((rowsResult.results ?? []) as Array<Record<string, unknown>>);

  const districtsResult = await d1
    .prepare("SELECT name FROM districts ORDER BY name")
    .all();
  const districtsRows = ((districtsResult.results ?? []) as Array<Record<string, unknown>>);

  const cars = rows.map((row) => {
    const fallbackPhotoUrl = typeof row.photoUrl === "string" ? row.photoUrl : null;
    let photoUrls: string[] = [];
    if (typeof row.photos === "string" && row.photos) {
      try {
        const parsed = JSON.parse(row.photos);
        photoUrls = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && Boolean(item)) : [];
      } catch {
        photoUrls = [];
      }
    }
    if (!photoUrls.length && fallbackPhotoUrl) {
      photoUrls = [fallbackPhotoUrl];
    }

    const districtTitle =
      (typeof row.districtName === "string" && row.districtName) ||
      (typeof row.locationName === "string" && row.locationName) ||
      (typeof row.companyName === "string" && row.companyName) ||
      "Available cars";
    const officeAddress = [row.street, row.houseNumber].filter(Boolean).map(String).join(" ");

    return {
      id: Number(row.id),
      companyId: Number(row.companyId),
      brandName: (row.brandName as string) || "Car",
      modelName: (row.modelName as string) || `#${String(row.id)}`,
      bodyType: (row.bodyType as string) || "",
      year: (row.year as number | null) ?? null,
      transmission: (row.transmission as string | null) ?? null,
      fuelType: (row.fuelType as string | null) ?? null,
      pricePerDay: Number(row.pricePerDay || 0),
      deposit: Number(row.deposit || 0),
      photoUrl: photoUrls[0] || fallbackPhotoUrl,
      photoUrls,
      districtTitle,
      officeAddress: officeAddress || String(row.companyName || ""),
      rating: row.rating ? Number(row.rating) : null,
      totalRatings: row.totalRatings ? Number(row.totalRatings) : null,
    };
  });

  const districts = Array.from(
    new Set(
      districtsRows
        .map((row) => row.name)
        .filter((name): name is string => typeof name === "string" && Boolean(name))
    )
  );

  return { cars, districts };
}

export default function Home() {
  const { cars, districts } = useLoaderData<typeof loader>();
  const [activeBodyType, setActiveBodyType] = useState("All");

  const bodyTypes = useMemo(() => {
    const unique = Array.from(new Set(cars.map((car) => car.bodyType).filter((type) => Boolean(type))));
    return ["All", ...unique];
  }, [cars]);

  const filteredCars = useMemo(() => {
    if (activeBodyType === "All") return cars;
    return cars.filter((car) => car.bodyType === activeBodyType);
  }, [cars, activeBodyType]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 pt-0 pb-6 space-y-6">
          <HeroSection districts={districts} />
          <BodyTypeFilters
            bodyTypes={bodyTypes}
            activeType={activeBodyType}
            onTypeChange={setActiveBodyType}
          />
          <PopularCarsSection cars={filteredCars} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
