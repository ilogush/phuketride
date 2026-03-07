import type { Route } from "./+types/company.$slug";
import { useLoaderData } from "react-router";
import PublicCompanyPageView from "~/features/public-company/PublicCompanyPageView";
import { loadPublicCompanyPage } from "~/features/public-company/public-company.loader.server";

export function meta({ data }: Route.MetaArgs) {
  const companyName = data?.companyName || "Company";
  const canonical = data?.canonicalUrl || "https://phuketride.com";
  const title = `${companyName} Fleet | Phuket Ride`;
  const description = `Browse available cars from ${companyName} on Phuket Ride. Compare daily rates, deposits, and car options in one place.`;

  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "index,follow" },
    { tagName: "link", rel: "canonical", href: canonical },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  return loadPublicCompanyPage({
    db: context.cloudflare.env.DB,
    request,
    slug: params.slug,
  });
}

export default function CompanyFleetPage() {
  const data = useLoaderData<typeof loader>();
  return <PublicCompanyPageView {...data} />;
}
