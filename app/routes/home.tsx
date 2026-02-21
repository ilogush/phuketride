import type { Route } from "./+types/home";
import { useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import { drizzle } from "drizzle-orm/d1";
import { and, desc, eq, isNull } from "drizzle-orm";
import * as schema from "~/db/schema";
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
  const db = drizzle(context.cloudflare.env.DB, { schema });

  const rows = await db
    .select({
      id: schema.companyCars.id,
      companyId: schema.companyCars.companyId,
      brandName: schema.carBrands.name,
      modelName: schema.carModels.name,
      bodyType: schema.bodyTypes.name,
      year: schema.companyCars.year,
      transmission: schema.companyCars.transmission,
      fuelType: schema.fuelTypes.name,
      pricePerDay: schema.companyCars.pricePerDay,
      deposit: schema.companyCars.deposit,
      photos: schema.companyCars.photos,
      companyName: schema.companies.name,
      locationName: schema.locations.name,
      districtName: schema.districts.name,
      street: schema.companies.street,
      houseNumber: schema.companies.houseNumber,
    })
    .from(schema.companyCars)
    .leftJoin(schema.carTemplates, eq(schema.companyCars.templateId, schema.carTemplates.id))
    .leftJoin(schema.carBrands, eq(schema.carTemplates.brandId, schema.carBrands.id))
    .leftJoin(schema.carModels, eq(schema.carTemplates.modelId, schema.carModels.id))
    .leftJoin(schema.bodyTypes, eq(schema.carTemplates.bodyTypeId, schema.bodyTypes.id))
    .leftJoin(schema.fuelTypes, eq(schema.companyCars.fuelTypeId, schema.fuelTypes.id))
    .innerJoin(schema.companies, eq(schema.companyCars.companyId, schema.companies.id))
    .leftJoin(schema.locations, eq(schema.companies.locationId, schema.locations.id))
    .leftJoin(schema.districts, eq(schema.companies.districtId, schema.districts.id))
    .where(
      and(
        eq(schema.companyCars.status, "available"),
        isNull(schema.companyCars.archivedAt),
        isNull(schema.companies.archivedAt),
      ),
    )
    .orderBy(desc(schema.companyCars.createdAt))
    .limit(120);

  const districtsRows = await db
    .select({
      name: schema.districts.name,
    })
    .from(schema.districts)
    .orderBy(schema.districts.name);

  const cars = rows.map((row) => {
    let photoUrl: string | null = null;
    if (row.photos) {
      try {
        const parsed = JSON.parse(row.photos) as string[];
        photoUrl = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
      } catch {
        photoUrl = null;
      }
    }

    const districtTitle = row.districtName || row.locationName || row.companyName || "Available cars";
    const officeAddress = [row.street, row.houseNumber].filter(Boolean).join(" ");

    return {
      id: row.id,
      companyId: row.companyId,
      brandName: row.brandName || "Car",
      modelName: row.modelName || `#${row.id}`,
      bodyType: row.bodyType || "",
      year: row.year,
      transmission: row.transmission,
      fuelType: row.fuelType,
      pricePerDay: Number(row.pricePerDay || 0),
      deposit: Number(row.deposit || 0),
      photoUrl,
      districtTitle,
      officeAddress: officeAddress || row.companyName,
    };
  });

  const districts = Array.from(new Set(districtsRows.map((row) => row.name).filter((name): name is string => Boolean(name))));

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
    <div className="min-h-screen bg-white">
      <Header />
      <main className="flex-1 bg-white">
        <div className="max-w-7xl mx-auto px-4 pt-0 pb-6 space-y-6">
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
