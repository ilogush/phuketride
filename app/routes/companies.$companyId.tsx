import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import CompanyDetailPageView from "~/features/company-detail/CompanyDetailPageView";
import { loadCompanyDetailPage } from "~/features/company-detail/company-detail.loader.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  return loadCompanyDetailPage({
    request,
    db: context.cloudflare.env.DB,
    companyIdParam: params.companyId,
  });
}

export default function CompanyDetailPage() {
  const data = useLoaderData<typeof loader>();
  return <CompanyDetailPageView {...data} />;
}
