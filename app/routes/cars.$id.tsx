import { useLoaderData } from "react-router";

import type { Route } from "./+types/cars.$id";
import PublicCarPageView from "~/features/public-car/PublicCarPageView";
import { loadPublicCarPage } from "~/features/public-car/public-car.loader.server";

export function meta({ data }: Route.MetaArgs) {
  if (!data?.car) {
    return [
      { title: "Car details | Phuket Ride" },
      {
        name: "description",
        content:
          "View detailed car information, pricing, and booking options on Phuket Ride.",
      },
    ];
  }

  const car = data.car;
  const rawPlate = String(car.licensePlate || "").trim();
  const displayPlate = rawPlate
    ? rawPlate.startsWith("#")
      ? rawPlate
      : `#${rawPlate}`
    : `#${car.id}`;
  const carName = `${car.brandName || "Car"} ${car.modelName || "Model"} ${displayPlate}`.trim();
  const district = car.districtName || car.locationName || "Phuket";
  const title = `${carName} | Rent in ${district} | Phuket Ride`;
  const description = `Rent ${carName} in ${district}. Price from ฿${Math.round(
    car.pricePerDay || 0,
  ).toLocaleString()}/day on Phuket Ride.`;
  const canonical = data.canonicalUrl || "https://phuketride.com";
  const ogImage = data.photos?.[0] || "/images/hero-bg.webp";

  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "index,follow" },
    { tagName: "link", rel: "canonical", href: canonical },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  return loadPublicCarPage({
    db: context.cloudflare.env.DB,
    request,
    routeCarPath: params.id,
  });
}

export function headers() {
  return {
    "Cache-Control": "public, max-age=60, s-maxage=300",
  };
}

export default function PublicCarPage() {
  const data = useLoaderData<typeof loader>();
  return <PublicCarPageView {...data} />;
}
