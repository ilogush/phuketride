import { useMemo, useState } from "react";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";
import HeroSection from "~/components/public/HeroSection";
import BodyTypeFilters from "~/components/public/BodyTypeFilters";
import PopularCarsSection from "~/components/public/PopularCarsSection";
import type { SearchCarItem, SearchCarsQuery } from "./search-cars.loader.server";

interface SearchCarsPageViewProps {
  cars: SearchCarItem[];
  districts: string[];
  bodyTypes: string[];
  query: SearchCarsQuery;
}

export default function SearchCarsPageView({
  cars,
  districts,
  bodyTypes,
  query,
}: SearchCarsPageViewProps) {
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
