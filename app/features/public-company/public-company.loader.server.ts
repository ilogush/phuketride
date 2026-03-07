import { buildCarPathSegment, buildCompanySlug } from "~/lib/car-path";
import { getCarPhotoUrls } from "~/lib/car-photos";
import { QUERY_LIMITS } from "~/lib/query-limits";

export interface PublicCompanyCar {
  id: number;
  licensePlate: string;
  companyId: number;
  brandName: string;
  modelName: string;
  bodyType: string;
  year: number | null;
  transmission: string | null;
  fuelType: string | null;
  pricePerDay: number;
  deposit: number;
  photoUrl: string | null;
  photoUrls: string[];
  districtTitle: string;
  officeAddress: string;
  rating: number | null;
  totalRatings: number | null;
  pathSegment: string;
}

export interface PublicCompanyPageData {
  companyName: string;
  cars: PublicCompanyCar[];
  canonicalUrl: string;
}

export async function loadPublicCompanyPage(args: {
  db: D1Database;
  request: Request;
  slug: string | undefined;
}): Promise<PublicCompanyPageData> {
  const { db, request, slug } = args;
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (!normalizedSlug) {
    throw new Response("Company slug is required", { status: 400 });
  }

  const rowsResult = await db
    .prepare(
      `
      SELECT
        cc.id AS id,
        cc.license_plate AS licensePlate,
        cc.company_id AS companyId,
        cb.name AS brandName,
        cm.name AS modelName,
        bt.name AS bodyType,
        cc.year AS year,
        cc.transmission AS transmission,
        ft.name AS fuelType,
        cc.price_per_day AS pricePerDay,
        cc.deposit AS deposit,
        cc.photos AS photos,
        c.name AS companyName,
        l.name AS locationName,
        d.name AS districtName,
        c.street AS street,
        c.house_number AS houseNumber,
        crm.total_rating AS rating,
        crm.total_ratings AS totalRatings
      FROM company_cars cc
      LEFT JOIN car_templates ct ON cc.template_id = ct.id
      LEFT JOIN car_brands cb ON ct.brand_id = cb.id
      LEFT JOIN car_models cm ON ct.model_id = cm.id
      LEFT JOIN body_types bt ON ct.body_type_id = bt.id
      LEFT JOIN fuel_types ft ON cc.fuel_type_id = ft.id
      INNER JOIN companies c ON cc.company_id = c.id
      LEFT JOIN locations l ON c.location_id = l.id
      LEFT JOIN districts d ON c.district_id = d.id
      LEFT JOIN car_rating_metrics crm ON cc.id = crm.company_car_id
      WHERE cc.status = 'available'
        AND cc.archived_at IS NULL
        AND c.archived_at IS NULL
      ORDER BY cc.created_at DESC
      LIMIT ${QUERY_LIMITS.XL}
      `,
    )
    .all();

  const rows = (rowsResult.results ?? []) as Array<Record<string, unknown>>;
  const companyCars = rows.filter(
    (row) => buildCompanySlug(String(row.companyName || "")) === normalizedSlug,
  );
  if (!companyCars.length) {
    throw new Response("Company not found", { status: 404 });
  }

  const companyName = String(companyCars[0].companyName || "");
  const cars = companyCars.map((row) => {
    const photoUrls = getCarPhotoUrls(row.photos, request.url);
    const officeAddress = [row.street, row.houseNumber]
      .filter(Boolean)
      .map(String)
      .join(" ");

    return {
      id: Number(row.id),
      licensePlate: String(row.licensePlate || ""),
      companyId: Number(row.companyId),
      brandName: (row.brandName as string) || "Car",
      modelName: (row.modelName as string) || "Model",
      bodyType: (row.bodyType as string) || "",
      year: (row.year as number | null) ?? null,
      transmission: (row.transmission as string | null) ?? null,
      fuelType: (row.fuelType as string | null) ?? null,
      pricePerDay: Number(row.pricePerDay || 0),
      deposit: Number(row.deposit || 0),
      photoUrl: photoUrls[0] || null,
      photoUrls,
      districtTitle: String(row.districtName || row.locationName || companyName),
      officeAddress: officeAddress || companyName,
      rating: row.rating ? Number(row.rating) : null,
      totalRatings: row.totalRatings ? Number(row.totalRatings) : null,
      pathSegment: buildCarPathSegment(
        companyName,
        String(row.brandName || ""),
        String(row.modelName || ""),
        String(row.licensePlate || ""),
      ),
    };
  });

  return {
    companyName,
    cars,
    canonicalUrl: request.url,
  };
}
