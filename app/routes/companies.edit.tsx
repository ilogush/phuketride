import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { requireAuth } from "~/lib/auth.server";

function getCompanyId(raw: string | undefined): number {
  const id = Number(raw || 0);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Response("Invalid company id", { status: 400 });
  }
  return id;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAuth(request);
  const companyId = getCompanyId(params.companyId);
  return redirect(`/home?modCompanyId=${companyId}`);
}

export async function action({ request, params }: ActionFunctionArgs) {
  await requireAuth(request);
  const companyId = getCompanyId(params.companyId);
  return redirect(`/home?modCompanyId=${companyId}`);
}

export default function CompanyEditRedirectPage() {
  return null;
}
