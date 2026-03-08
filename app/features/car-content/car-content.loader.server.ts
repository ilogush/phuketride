import { loadCarContentManagementPage } from "~/lib/cars-content-management.server";

export async function loadCarContentPage(args: {
  request: Request;
  context: { cloudflare: { env: Env } };
  carIdParam: string | undefined;
}) {
  const { request, context, carIdParam } = args;
  const carId = Number(carIdParam || 0);

  if (!Number.isFinite(carId) || carId <= 0) {
    throw new Response("Invalid car id", { status: 400 });
  }

  return loadCarContentManagementPage({ request, context, db: context.cloudflare.env.DB, carId });
}
