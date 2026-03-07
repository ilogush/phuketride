import type { Route } from "./+types/home";
import { useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import Header from "~/components/public/Header";
import HeroSection from "~/components/public/HeroSection";
import BodyTypeFilters from "~/components/public/BodyTypeFilters";
import PopularCarsSection from "~/components/public/PopularCarsSection";
import Footer from "~/components/public/Footer";
import { HOME_FAQ_ITEMS, WHY_CHOOSE_ITEMS } from "~/components/public/home-content";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { loadPublicHomePage } from "~/lib/home-page.server";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Phuket Ride | Car Rental Marketplace" },
    { 
      name: "description", 
      content: "Browse Phuket car rentals directly from hosts with transparent pricing, district delivery options, and instant online search."
    },
    { name: "author", content: "Phuket Ride Team" },
    { name: "keywords", content: "phuket car rental,car rental phuket,rent a car phuket,phuket ride" },
    { name: "creator", content: "Phuket Ride" },
    { name: "robots", content: "index, follow" },
    { property: "og:title", content: "Phuket Ride | Car Rental Marketplace" },
    { property: "og:description", content: "Rent cars in Phuket directly from hosts with clear terms and local delivery." },
    { property: "og:url", content: "https://phuketride.com" },
    { property: "og:site_name", content: "Phuket Ride" },
    { property: "og:locale", content: "en_US" },
    { property: "og:image", content: "https://phuketride.com/images/hero-bg.webp" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "Phuket Ride" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Phuket Ride | Car Rental Marketplace" },
    { name: "twitter:description", content: "Rent cars in Phuket directly from hosts with transparent pricing." },
    { name: "twitter:image", content: "https://phuketride.com/images/hero-bg.webp" },
  ];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  return loadPublicHomePage(context.cloudflare.env.DB, request);
}

export default function Home() {
  const { cars, districts } = useLoaderData<typeof loader>();
  const [activeBodyType, setActiveBodyType] = useState("All");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const bodyTypes = useMemo(() => {
    const unique = Array.from(new Set(cars.map((car) => car.bodyType).filter((type) => Boolean(type))));
    return ["All", ...unique];
  }, [cars]);

  const filteredCars = useMemo(() => {
    if (activeBodyType === "All") return cars;
    return cars.filter((car) => car.bodyType === activeBodyType);
  }, [cars, activeBodyType]);

  const faqColumns = [HOME_FAQ_ITEMS.slice(0, 6), HOME_FAQ_ITEMS.slice(6, 12)];

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
          <section id="why-phuketride-better" className="py-2 sm:py-3">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Why Is Renting with PhuketRide Better Than Other Services?
            </h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {WHY_CHOOSE_ITEMS.map((item) => (
                <article key={item.title} className="rounded-2xl bg-gray-50 p-4">
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-700">{item.text}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="pt-2 sm:pt-3 pb-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Frequently Asked Questions</h2>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              {faqColumns.map((column, columnIndex) => (
                <div key={`faq-column-${columnIndex}`} className="space-y-3">
                  {column.map((item) => {
                    const isOpen = openFaqId === item.id;
                    return (
                      <article key={item.id} className="rounded-2xl bg-gray-50 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setOpenFaqId((prev) => (prev === item.id ? null : item.id))}
                          className="w-full text-left font-medium text-gray-900 flex items-center justify-between gap-3"
                          aria-expanded={isOpen}
                        >
                          <span>{item.q}</span>
                          {isOpen ? (
                            <MinusIcon className="w-5 h-5 text-gray-500 shrink-0" />
                          ) : (
                            <PlusIcon className="w-5 h-5 text-gray-500 shrink-0" />
                          )}
                        </button>
                        {isOpen ? (
                          <p className="mt-2 text-sm text-gray-700">{item.a}</p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
