import { useLoaderData } from "react-router";
import type { Route } from "./+types/search-cars";
import SearchCarsPageView from "~/features/search-cars/SearchCarsPageView";
import { loadSearchCarsPage } from "~/features/search-cars/search-cars.loader.server";

export async function loader({ context, request }: Route.LoaderArgs) {
  return loadSearchCarsPage({ db: context.cloudflare.env.DB, request });
}

export default function SearchCarsPage() {
  return <SearchCarsPageView {...useLoaderData<typeof loader>()} />;
}
