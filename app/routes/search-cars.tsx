import { useLoaderData, type MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Search Cars | Phuket Ride" },
    { name: "description", content: "Search and book your perfect rental car in Phuket with affordable rates and direct booking." },
  ];
};
import type { Route } from "./+types/search-cars";
import SearchCarsPageView from "~/features/search-cars/SearchCarsPageView";
import { loadSearchCarsPage } from "~/features/search-cars/search-cars.loader.server";

export async function loader({ context, request }: Route.LoaderArgs) {
  return loadSearchCarsPage({ db: context.cloudflare.env.DB, request });
}

export function headers() {
  return {
    "Cache-Control": "public, max-age=60, s-maxage=300",
  };
}

export default function SearchCarsPage() {
  return <SearchCarsPageView {...useLoaderData<typeof loader>()} />;
}
