import Breadcrumbs from "~/components/public/Breadcrumbs";
import Footer from "~/components/public/Footer";
import Header from "~/components/public/Header";
import PopularCarsSection from "~/components/public/PopularCarsSection";

import type { PublicCompanyPageData } from "./public-company.loader.server";

export default function PublicCompanyPageView({
  companyName,
  cars,
}: PublicCompanyPageData) {
  const breadcrumbs = [
    { label: "Home", to: "/" },
    { label: companyName },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <Breadcrumbs items={breadcrumbs} />
      <main className="mx-auto max-w-5xl space-y-4 px-4 pt-2 pb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{companyName}</h1>
        <PopularCarsSection cars={cars} />
      </main>
      <Footer />
    </div>
  );
}
