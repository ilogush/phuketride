import { buildCarPathSegment, buildCompanySlug } from "~/lib/car-path";
import { getCarPhotoUrls } from "~/lib/car-photos";
import { QUERY_LIMITS } from "~/lib/query-limits";

type HomeCarRow = Record<string, unknown>;
type HomeDistrictRow = Record<string, unknown>;

export async function loadPublicHomePage(db: D1Database, request: Request) {
    const rows = await loadHomeCarRows(db);
    const districtsRows = await loadDistrictRows(db);

    const cars = rows.map((row) => mapHomeCarRow(row, request.url));
    const districts = Array.from(
        new Set(
            districtsRows
                .map((row) => row.name)
                .filter((name): name is string => typeof name === "string" && Boolean(name))
        )
    );

    return { cars, districts };
}

async function loadHomeCarRows(db: D1Database): Promise<HomeCarRow[]> {
    try {
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
                `
            )
            .all();
        return (rowsResult.results ?? []) as HomeCarRow[];
    } catch {
        const fallbackRowsResult = await db
            .prepare(
                `
                SELECT
                  cc.id AS id,
                  cc.company_id AS companyId,
                  cc.price_per_day AS pricePerDay,
                  cc.deposit AS deposit,
                  cc.photos AS photos,
                  cc.year AS year,
                  cc.transmission AS transmission,
                  c.name AS companyName
                FROM company_cars cc
                INNER JOIN companies c ON cc.company_id = c.id
                WHERE cc.status = 'available'
                ORDER BY cc.created_at DESC
                LIMIT ${QUERY_LIMITS.XL}
                `
            )
            .all()
            .catch(() => ({ results: [] as HomeCarRow[] }));
        return (fallbackRowsResult.results ?? []) as HomeCarRow[];
    }
}

async function loadDistrictRows(db: D1Database): Promise<HomeDistrictRow[]> {
    const districtsResult = await db
        .prepare("SELECT name FROM districts ORDER BY name")
        .all()
        .catch(() => ({ results: [] as HomeDistrictRow[] }));

    return (districtsResult.results ?? []) as HomeDistrictRow[];
}

function mapHomeCarRow(row: HomeCarRow, requestUrl: string) {
    const photoUrls = getCarPhotoUrls(row.photos, requestUrl);
    const fallbackPhotoUrl = photoUrls[0] || null;
    const districtTitle =
        (typeof row.districtName === "string" && row.districtName) ||
        (typeof row.locationName === "string" && row.locationName) ||
        (typeof row.companyName === "string" && row.companyName) ||
        "Available cars";
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
        photoUrl: photoUrls[0] || fallbackPhotoUrl,
        photoUrls,
        districtTitle,
        officeAddress: officeAddress || String(row.companyName || ""),
        rating: row.rating ? Number(row.rating) : null,
        totalRatings: row.totalRatings ? Number(row.totalRatings) : null,
        pathSegment: buildCarPathSegment(
            String(row.companyName || ""),
            (row.brandName as string) || "Car",
            (row.modelName as string) || "",
            String(row.licensePlate || ""),
        ),
        companySlug: buildCompanySlug(String(row.companyName || "")),
    };
}
