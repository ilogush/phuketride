import type { BookingDetailRow } from "~/lib/bookings-detail.server";
import type { BookingListRow } from "~/lib/db-types";

type D1DatabaseLike = {
    prepare: (query: string) => {
        bind: (...values: unknown[]) => {
            all: () => Promise<{ results?: unknown[] }>;
            first: () => Promise<unknown>;
        };
    };
};

type CountRow = { count?: number | string } | null;

export async function countBookingsPage(params: {
    db: D1DatabaseLike;
    companyId: number | null;
    status: string;
    search?: string;
}) {
    const { db, companyId, status, search } = params;
    const q = `%${search || ""}%`;
    const whereSql = companyId
        ? "WHERE cc.company_id = ? AND b.status = ?"
        : "WHERE b.status = ?";
    const searchSql = search
        ? " AND (CAST(b.id AS TEXT) LIKE ? OR b.client_name LIKE ? OR b.client_surname LIKE ? OR b.client_phone LIKE ?)"
        : "";

    const finalWhere = status === "all"
        ? (companyId ? "WHERE cc.company_id = ?" : "WHERE 1=1")
        : whereSql;

    const row = await db.prepare(`
        SELECT COUNT(*) AS count
        FROM bookings b
        JOIN company_cars cc ON cc.id = b.company_car_id
        ${finalWhere}
        ${searchSql}
    `).bind(...[
        ...(status === "all" ? (companyId ? [companyId] : []) : (companyId ? [companyId, status] : [status])),
        ...(search ? [q, q, q, q] : [])
    ]).first() as CountRow;

    return Number(row?.count || 0);
}

export async function listBookingsPage(params: {
    db: D1DatabaseLike;
    companyId: number | null;
    status: string;
    pageSize: number;
    offset: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}) {
    const { db, companyId, status, pageSize, offset, search, sortBy, sortOrder } = params;
    const q = `%${search || ""}%`;
    const searchSql = search
        ? " AND (CAST(b.id AS TEXT) LIKE ? OR b.client_name LIKE ? OR b.client_surname LIKE ? OR b.client_phone LIKE ?)"
        : "";

    const sortColumn = sortBy === "startDate" ? "b.start_date" : "b.created_at";
    const direction = sortOrder === "asc" ? "ASC" : "DESC";

    const whereSql = status === "all"
        ? (companyId ? "WHERE cc.company_id = ?" : "WHERE 1=1")
        : (companyId ? "WHERE cc.company_id = ? AND b.status = ?" : "WHERE b.status = ?");

    const sql = `
        SELECT
            b.id,
            b.start_date AS startDate,
            b.end_date AS endDate,
            b.estimated_amount AS estimatedAmount,
            b.currency,
            b.deposit_amount AS depositAmount,
            b.deposit_paid AS depositPaid,
            b.status,
            b.created_at AS createdAt,
            b.client_name AS clientName,
            b.client_surname AS clientSurname,
            b.client_phone AS clientPhone,
            b.client_email AS clientEmail,
            cc.license_plate AS carLicensePlate,
            cc.year AS carYear,
            cb.name AS brandName,
            cm.name AS modelName
        FROM bookings b
        JOIN company_cars cc ON cc.id = b.company_car_id
        LEFT JOIN car_templates ct ON ct.id = cc.template_id
        LEFT JOIN car_brands cb ON cb.id = ct.brand_id
        LEFT JOIN car_models cm ON cm.id = ct.model_id
        ${whereSql}
        ${searchSql}
        ORDER BY ${sortColumn} ${direction}, b.id DESC
        LIMIT ? OFFSET ?
    `;

    const binds: unknown[] = [
        ...(companyId ? [companyId] : []),
        ...(status !== "all" ? [status] : []),
        ...(search ? [q, q, q, q] : []),
        pageSize,
        offset
    ];

    const result = await db.prepare(sql).bind(...binds).all();
    return (result.results || []) as BookingListRow[];
}

export async function getBookingDetailById(params: {
    db: D1DatabaseLike;
    bookingId: number;
    companyId?: number | null;
}) {
    const { db, bookingId, companyId } = params;
    const binds: unknown[] = [bookingId];
    if (companyId) binds.push(companyId);

    return await db.prepare(`
        SELECT
            b.*,
            cc.company_id AS companyId,
            cc.id AS carId,
            cc.license_plate AS carLicensePlate,
            cc.year AS carYear,
            cb.name AS brandName,
            cm.name AS modelName,
            cl.name AS colorName,
            d1.name AS pickupDistrictName,
            d2.name AS returnDistrictName
        FROM bookings b
        JOIN company_cars cc ON cc.id = b.company_car_id
        LEFT JOIN car_templates ct ON ct.id = cc.template_id
        LEFT JOIN car_brands cb ON cb.id = ct.brand_id
        LEFT JOIN car_models cm ON cm.id = ct.model_id
        LEFT JOIN colors cl ON cl.id = cc.color_id
        LEFT JOIN districts d1 ON d1.id = b.pickup_district_id
        LEFT JOIN districts d2 ON d2.id = b.return_district_id
        WHERE b.id = ?
        ${companyId ? "AND cc.company_id = ?" : ""}
        LIMIT 1
    `).bind(...binds).first() as BookingDetailRow | null;
}
