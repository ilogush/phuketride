import { buildCarPathSegment, buildCompanySlug } from "~/lib/car-path";
import { getCarPhotoUrls } from "~/lib/car-photos";
import { QUERY_LIMITS } from "~/lib/query-limits";
import { parseTripDateTime } from "~/components/public/trip-date.model";

export interface SearchCarsQuery {
  q: string;
  district: string;
  bodyType: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

export interface SearchCarItem {
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
  companySlug: string;
}

const toNonEmpty = (value: string | null) => (value || "").trim();

export async function loadSearchCarsPage(args: {
  db: D1Database;
  request: Request;
}) {
  const { db, request } = args;
  const url = new URL(request.url);
  const query = parseSearchCarsQuery(url);
  const unavailableCarIds = await loadUnavailableCarIds(db, query);
  const rows = await loadSearchCarRows(db, unavailableCarIds);
  const cars = rows.map((row) => mapSearchCarRow(row, request.url));
  const filteredCars = filterSearchCars(cars, query);

  return {
    cars: filteredCars,
    districts: buildDistrictOptions(cars),
    bodyTypes: buildBodyTypeOptions(cars),
    query,
  };
}

function parseSearchCarsQuery(url: URL): SearchCarsQuery {
  return {
    q: toNonEmpty(url.searchParams.get("q")),
    district: toNonEmpty(url.searchParams.get("district")),
    bodyType: toNonEmpty(url.searchParams.get("bodyType")) || "All",
    startDate: toNonEmpty(url.searchParams.get("startDate")),
    endDate: toNonEmpty(url.searchParams.get("endDate")),
    startTime: toNonEmpty(url.searchParams.get("startTime")),
    endTime: toNonEmpty(url.searchParams.get("endTime")),
  };
}

async function loadSearchCarRows(db: D1Database, unavailableCarIds: number[]) {
  const unavailableClause =
    unavailableCarIds.length > 0
      ? `AND cc.id NOT IN (${unavailableCarIds.map(() => "?").join(", ")})`
      : "";
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
        ${unavailableClause}
      ORDER BY cc.created_at DESC
      LIMIT ${QUERY_LIMITS.XL}
      `,
    )
    .bind(...unavailableCarIds)
    .all();

  return (rowsResult.results ?? []) as Array<Record<string, unknown>>;
}

async function loadUnavailableCarIds(db: D1Database, query: SearchCarsQuery) {
  const pickupAt = parseTripDateTime(query.startDate, query.startTime);
  const returnAt = parseTripDateTime(query.endDate, query.endTime);
  if (!pickupAt || !returnAt || returnAt <= pickupAt) {
    return [];
  }

  const result = await db
    .prepare(
      `
      SELECT DISTINCT company_car_id AS carId
      FROM (
        SELECT company_car_id
        FROM contracts
        WHERE status IN ('active', 'pending')
          AND start_date < ? AND end_date > ?

        UNION

        SELECT company_car_id
        FROM bookings
        WHERE status IN ('pending', 'confirmed')
          AND start_date < ? AND end_date > ?
      )
      `,
    )
    .bind(
      returnAt.toISOString(),
      pickupAt.toISOString(),
      returnAt.toISOString(),
      pickupAt.toISOString(),
    )
    .all<{ carId: number | string }>();

  return (result.results ?? []).map((row) => Number(row.carId)).filter((id) => Number.isFinite(id));
}

function mapSearchCarRow(row: Record<string, unknown>, requestUrl: string): SearchCarItem {
  const photoUrls = getCarPhotoUrls(row.photos, requestUrl);
  const officeAddress = [row.street, row.houseNumber].filter(Boolean).map(String).join(" ");

  return {
    id: Number(row.id),
    licensePlate: String(row.licensePlate || ""),
    companyId: Number(row.companyId),
    brandName: (row.brandName as string) || "Car",
    modelName: (row.modelName as string) || `#${String(row.id)}`,
    bodyType: (row.bodyType as string) || "",
    year: (row.year as number | null) ?? null,
    transmission: (row.transmission as string | null) ?? null,
    fuelType: (row.fuelType as string | null) ?? null,
    pricePerDay: Number(row.pricePerDay || 0),
    deposit: Number(row.deposit || 0),
    photoUrl: photoUrls[0] || null,
    photoUrls,
    districtTitle: String(row.districtName || row.locationName || row.companyName || "Available cars"),
    officeAddress: officeAddress || String(row.companyName || ""),
    rating: row.rating ? Number(row.rating) : null,
    totalRatings: row.totalRatings ? Number(row.totalRatings) : null,
    pathSegment: buildCarPathSegment(
      String(row.companyName || ""),
      String(row.brandName || "Car"),
      String(row.modelName || ""),
      String(row.licensePlate || ""),
    ),
    companySlug: buildCompanySlug(String(row.companyName || "")),
  };
}

function filterSearchCars(cars: SearchCarItem[], query: SearchCarsQuery) {
  const q = query.q.toLowerCase();
  const district = query.district.toLowerCase();

  return cars.filter((car) => {
    const districtSource = `${car.districtTitle} ${car.officeAddress}`.toLowerCase();
    const querySource = `${car.brandName} ${car.modelName} ${car.bodyType} ${car.licensePlate}`.toLowerCase();

    if (district && !districtSource.includes(district)) {
      return false;
    }
    if (q && !querySource.includes(q) && !districtSource.includes(q)) {
      return false;
    }
    if (query.bodyType && query.bodyType !== "All" && car.bodyType !== query.bodyType) {
      return false;
    }
    return true;
  });
}

function buildBodyTypeOptions(cars: SearchCarItem[]) {
  return ["All", ...Array.from(new Set(cars.map((car) => car.bodyType).filter((type) => Boolean(type))))];
}

function buildDistrictOptions(cars: SearchCarItem[]) {
  return Array.from(new Set(cars.map((car) => car.districtTitle).filter((name) => Boolean(name))));
}
