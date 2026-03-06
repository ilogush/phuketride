import { type LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";

type CarRow = {
  id: number;
  companyId: number;
  licensePlate: string | null;
  brandName: string | null;
  modelName: string | null;
};

export function withModCompanyId(path: string, modCompanyId: string | null) {
  if (!modCompanyId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}modCompanyId=${modCompanyId}`;
}

export async function requireCarAccess(request: Request, context: LoaderFunctionArgs["context"], carId: number) {
  const user = await requireAuth(request);
  const car = (await context.cloudflare.env.DB
    .prepare(
      `
      SELECT
        cc.id,
        cc.company_id AS companyId,
        cc.license_plate AS licensePlate,
        cb.name AS brandName,
        cm.name AS modelName
      FROM company_cars cc
      LEFT JOIN car_templates ct ON ct.id = cc.template_id
      LEFT JOIN car_brands cb ON cb.id = ct.brand_id
      LEFT JOIN car_models cm ON cm.id = ct.model_id
      WHERE cc.id = ?
      LIMIT 1
      `
    )
    .bind(carId)
    .first()) as CarRow | null;

  if (!car) {
    throw new Response("Car not found", { status: 404 });
  }
  if (user.role !== "admin" && car.companyId !== user.companyId) {
    throw new Response("Access denied", { status: 403 });
  }
  return { user, car };
}
