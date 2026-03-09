import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { getScopedDb } from "~/lib/db-factory.server";
import { requireAdminUserMutationAccess } from "~/lib/access-policy.server";
import { assertSameOriginMutation } from "~/lib/request-security.server";

function getCompanyId(raw: string | undefined): number {
  const id = Number(raw || 0);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Response("Invalid company id", { status: 400 });
  }
  return id;
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  await getScopedDb(request, context, requireAdminUserMutationAccess);
  const companyId = getCompanyId(params.companyId);
  return redirect(`/home?modCompanyId=${companyId}`);
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  assertSameOriginMutation(request);
  await getScopedDb(request, context, requireAdminUserMutationAccess);
  const companyId = getCompanyId(params.companyId);
  return redirect(`/home?modCompanyId=${companyId}`);
}

export default function CompanyEditRedirectPage() {
  return null;
}
