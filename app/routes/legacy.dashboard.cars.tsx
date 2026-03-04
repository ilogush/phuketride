import { type LoaderFunctionArgs, redirect } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);
  const url = new URL(request.url);
  return redirect(`/cars${url.search}`);
}

export default function LegacyDashboardCarsRedirect() {
  return null;
}
