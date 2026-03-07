import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { requireAdminUserMutationAccess } from "~/lib/access-policy.server";
import { useUrlToast } from "~/lib/useUrlToast";

function getCompanyId(raw: string | undefined): number {
  const id = Number(raw || 0);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Response("Invalid company id", { status: 400 });
  }
  return id;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAdminUserMutationAccess(request);
  const companyId = getCompanyId(params.companyId);
  return redirect(`/home?modCompanyId=${companyId}`);
}

export async function action({ request, params }: ActionFunctionArgs) {
  await requireAdminUserMutationAccess(request);
  const companyId = getCompanyId(params.companyId);
  return redirect(`/home?modCompanyId=${companyId}`);
}

export default function CompanyEditRedirectPage() {
    useUrlToast();
  return null;
}
