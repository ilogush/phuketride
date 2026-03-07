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
    companyId: number;
    status: string;
}) {
    const { db, companyId, status } = params;
    const row = status === "all"
        ? await db.prepare(`
            SELECT COUNT(*) AS count
            FROM bookings b
            JOIN company_cars cc ON cc.id = b.company_car_id
            WHERE cc.company_id = ?
        `).bind(companyId).first() as CountRow
        : await db.prepare(`
            SELECT COUNT(*) AS count
            FROM bookings b
            JOIN company_cars cc ON cc.id = b.company_car_id
            WHERE cc.company_id = ? AND b.status = ?
        `).bind(companyId, status).first() as CountRow;

    return Number(row?.count || 0);
}

export async function listBookingsPage(params: {
    db: D1DatabaseLike;
    companyId: number;
    status: string;
    pageSize: number;
    offset: number;
}) {
    const { db, companyId, status, pageSize, offset } = params;
    const result = status === "all"
        ? await db.prepare(`
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
            WHERE cc.company_id = ?
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        `).bind(companyId, pageSize, offset).all()
        : await db.prepare(`
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
            WHERE cc.company_id = ? AND b.status = ?
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        `).bind(companyId, status, pageSize, offset).all();

    return (result.results || []) as BookingListRow[];
}
