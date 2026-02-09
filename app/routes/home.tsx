import type { Route } from "./+types/home";
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

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="flex-1 bg-white">
        <div className="max-w-7xl mx-auto px-4 pt-0 pb-4">
          <HeroSection />
          <BodyTypeFilters />
          <PopularCarsSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}
