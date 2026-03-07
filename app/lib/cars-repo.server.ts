import type { SortOrder } from "~/lib/query-filters.server";
import type { CarListRow } from "~/lib/db-types";
import {
  type D1DatabaseLike,
  type StatusCount,
  normalizeCount,
  normalizeStatusCounts,
  buildSortClause,
} from "~/lib/repo-types.server";

type CountRow = { count?: number | string } | null;
type StatusCountRow = { status: string; count: number | string };
type EditableCarRow = Record<string, unknown> & {
    company_id: number;
    template_id: number | null;
    color_id: number | null;
    license_plate: string | null;
    price_per_day: number | null;
    insurance_type: string | null;
    insurance_expiry_date: string | null;
    registration_expiry: string | null;
    tax_road_expiry_date: string | null;
    next_oil_change_mileage: number | null;
    oil_change_interval: number | null;
    insurance_price_per_day: number | null;
    max_insurance_price: number | null;
    min_rental_days: number | null;
    archived_at: string | null;
    brandName: string | null;
    modelName: string | null;
    bodyTypeName: string | null;
    templateFuelTypeName: string | null;
    colorName: string | null;
    engine_volume: number | null;
    transmission: string | null;
    seats: number | null;
    doors: number | null;
    mileage: number | null;
    year: number | null;
    status: "available" | "rented" | "maintenance" | "booked" | null;
    deposit: number | null;
    photos: string | null;
    templateDrivetrain: string | null;
    templateLuggageCapacity: string | null;
    templateRearCamera: number | null;
    templateBluetoothEnabled: number | null;
    templateCarplayEnabled: number | null;
    templateAndroidAutoEnabled: number | null;
    templateFeatureAirConditioning: number | null;
    templateFeatureAbs: number | null;
    templateFeatureAirbags: number | null;
};

const CAR_SORT_SQL: Record<string, string> = {
    id: "cc.id",
    createdAt: "cc.created_at",
    licensePlate: "cc.license_plate",
    pricePerDay: "cc.price_per_day",
    mileage: "cc.mileage",
    deposit: "cc.deposit",
};

function getCarSortClause(sortBy: string, sortOrder: SortOrder): string {
    return buildSortClause(CAR_SORT_SQL, sortBy, sortOrder, "createdAt", "cc.id");
}

export async function listCarsPage(params: {
    db: D1DatabaseLike;
    companyId: number | null;
    status: string;
    pageSize: number;
    offset: number;
    search: string;
    sortBy: string;
    sortOrder: SortOrder;
}): Promise<CarListRow[]> {
    const { db, companyId, status, pageSize, offset, search, sortBy, sortOrder } = params;
    const sql = `
        SELECT
            cc.id,
            cc.photos,
            cc.license_plate,
            cc.price_per_day,
            cc.insurance_type,
            cc.engine_volume,
            cc.mileage,
            cc.deposit,
            cc.status,
            cb.name AS brandName,
            cm.name AS modelName,
            bt.name AS bodyTypeName,
            cl.name AS colorName
        FROM company_cars cc
        LEFT JOIN car_templates ct ON ct.id = cc.template_id
        LEFT JOIN car_brands cb ON cb.id = ct.brand_id
        LEFT JOIN car_models cm ON cm.id = ct.model_id
        LEFT JOIN body_types bt ON bt.id = ct.body_type_id
        LEFT JOIN colors cl ON cl.id = cc.color_id
        WHERE ${companyId ? "cc.company_id = ? AND " : ""}cc.status = ?
        ${search ? "AND (COALESCE(cc.license_plate,'') LIKE ? OR COALESCE(cb.name,'') LIKE ? OR COALESCE(cm.name,'') LIKE ? OR COALESCE(bt.name,'') LIKE ? OR COALESCE(cl.name,'') LIKE ?)" : ""}
        ${getCarSortClause(sortBy, sortOrder)}
        LIMIT ? OFFSET ?
    `;
    const binds: unknown[] = companyId ? [companyId, status] : [status];
    if (search) {
        const q = `%${search}%`;
        binds.push(q, q, q, q, q);
    }
    binds.push(pageSize, offset);
    const result = await db.prepare(sql).bind(...binds).all();
    return (result.results || []) as CarListRow[];
}

export async function listCarStatusCounts(params: {
    db: D1DatabaseLike;
    companyId: number | null;
}): Promise<StatusCount[]> {
    const { db, companyId } = params;
    const result = companyId
        ? await db.prepare(`
            SELECT status, COUNT(*) AS count
            FROM company_cars
            WHERE company_id = ?
            GROUP BY status
        `).bind(companyId).all()
        : await db.prepare(`
            SELECT status, COUNT(*) AS count
            FROM company_cars
            GROUP BY status
        `).all();

    return normalizeStatusCounts(result.results as StatusCountRow[]);
}

export async function countCarsPage(params: {
    db: D1DatabaseLike;
    companyId: number | null;
    status: string;
    search: string;
}): Promise<number> {
    const { db, companyId, status, search } = params;
    if (!search) {
        const row = companyId
            ? await db.prepare(`
                SELECT COUNT(*) AS count
                FROM company_cars
                WHERE company_id = ? AND status = ?
            `).bind(companyId, status).first() as CountRow
            : await db.prepare(`
                SELECT COUNT(*) AS count
                FROM company_cars
                WHERE status = ?
            `).bind(status).first() as CountRow;
        return normalizeCount(row);
    }

    const q = `%${search}%`;
    const row = companyId
        ? await db.prepare(`
            SELECT COUNT(*) AS count
            FROM company_cars cc
            LEFT JOIN car_templates ct ON ct.id = cc.template_id
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            LEFT JOIN body_types bt ON bt.id = ct.body_type_id
            LEFT JOIN colors cl ON cl.id = cc.color_id
            WHERE cc.company_id = ? AND cc.status = ?
            AND (COALESCE(cc.license_plate,'') LIKE ? OR COALESCE(cb.name,'') LIKE ? OR COALESCE(cm.name,'') LIKE ? OR COALESCE(bt.name,'') LIKE ? OR COALESCE(cl.name,'') LIKE ?)
        `).bind(companyId, status, q, q, q, q, q).first() as CountRow
        : await db.prepare(`
            SELECT COUNT(*) AS count
            FROM company_cars cc
            LEFT JOIN car_templates ct ON ct.id = cc.template_id
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            LEFT JOIN body_types bt ON bt.id = ct.body_type_id
            LEFT JOIN colors cl ON cl.id = cc.color_id
            WHERE cc.status = ?
            AND (COALESCE(cc.license_plate,'') LIKE ? OR COALESCE(cb.name,'') LIKE ? OR COALESCE(cm.name,'') LIKE ? OR COALESCE(bt.name,'') LIKE ? OR COALESCE(cl.name,'') LIKE ?)
        `).bind(status, q, q, q, q, q).first() as CountRow;

    return normalizeCount(row);
}

export async function getEditableCarById(params: {
    db: D1DatabaseLike;
    carId: number;
}) {
    const { db, carId } = params;
    return await db
        .prepare(`
            SELECT
                cc.*,
                ct.drivetrain AS templateDrivetrain,
                ct.luggage_capacity AS templateLuggageCapacity,
                ct.rear_camera AS templateRearCamera,
                ct.bluetooth_enabled AS templateBluetoothEnabled,
                ct.carplay_enabled AS templateCarplayEnabled,
                ct.android_auto_enabled AS templateAndroidAutoEnabled,
                ct.feature_air_conditioning AS templateFeatureAirConditioning,
                ct.feature_abs AS templateFeatureAbs,
                ct.feature_airbags AS templateFeatureAirbags,
                cb.name AS brandName,
                cm.name AS modelName,
                bt.name AS bodyTypeName,
                ft.name AS templateFuelTypeName,
                c.name AS colorName
            FROM company_cars cc
            LEFT JOIN car_templates ct ON ct.id = cc.template_id
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            LEFT JOIN body_types bt ON bt.id = ct.body_type_id
            LEFT JOIN fuel_types ft ON ft.id = ct.fuel_type_id
            LEFT JOIN colors c ON c.id = cc.color_id
            WHERE cc.id = ?
            LIMIT 1
        `)
        .bind(carId)
        .first() as EditableCarRow | null;
}
