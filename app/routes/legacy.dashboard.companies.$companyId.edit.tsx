import { type LoaderFunctionArgs, redirect } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAuth(request);
  const companyId = Number(params.companyId || 0);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new Response("Invalid company id", { status: 400 });
  }
  return redirect(`/home?modCompanyId=${companyId}`);
}

export default function LegacyDashboardCompanyEditRedirect() {
  return null;
}
