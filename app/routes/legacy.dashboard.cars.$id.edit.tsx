import { type LoaderFunctionArgs, redirect } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAuth(request);
  const id = Number(params.id || 0);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Response("Invalid car id", { status: 400 });
  }
  const url = new URL(request.url);
  return redirect(`/cars/${id}/edit${url.search}`);
}

export default function LegacyDashboardCarEditRedirect() {
  return null;
}
