import type { SortOrder } from "~/lib/query-filters.server";
import type { CarListRow } from "~/lib/db-types";

type D1DatabaseLike = {
    prepare: (query: string) => {
        bind: (...values: unknown[]) => {
            all: () => Promise<{ results?: unknown[] }>;
        };
    };
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
    const sortColumn = CAR_SORT_SQL[sortBy] || CAR_SORT_SQL.createdAt;
    const direction = sortOrder === "asc" ? "ASC" : "DESC";
    return `ORDER BY ${sortColumn} ${direction}, cc.id DESC`;
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
