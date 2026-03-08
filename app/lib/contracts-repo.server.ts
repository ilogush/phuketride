import type { SortOrder } from "~/lib/query-filters.server";
import type { ContractListRow } from "~/lib/db-types";
import {
  type D1DatabaseLike,
  type ListQueryParams,
  type CountQueryParams,
  type StatusCount,
  normalizeCount,
  normalizeStatusCounts,
  buildSortClause,
} from "~/lib/repo-types.server";

type CountRow = { count?: number | string } | null;
type StatusCountRow = { status: string; count: number | string };
type ClosableContractRow = {
    id: number;
    companyId: number;
    company_car_id: number;
    client_id: string | null;
    start_date: string;
    end_date: string;
    start_mileage: number | null;
    fuel_level: string | null;
    cleanliness: string | null;
    brandName: string | null;
    modelName: string | null;
    clientName: string | null;
    clientSurname: string | null;
};
type EditableContractRow = {
    id: number;
    company_car_id: number;
    start_date: string;
    end_date: string;
    pickup_district_id: number | null;
    pickup_hotel: string | null;
    pickup_room: string | null;
    return_district_id: number | null;
    return_hotel: string | null;
    return_room: string | null;
    delivery_cost: number | null;
    return_cost: number | null;
    deposit_amount: number | null;
    total_amount: number | null;
    total_currency: string | null;
    deposit_currency: string | null;
    fuel_level: string | null;
    cleanliness: string | null;
    start_mileage: number | null;
    carId: number;
    companyId: number;
    licensePlate: string;
    clientId: string;
    clientName: string | null;
    clientSurname: string | null;
    clientPhone: string | null;
    clientEmail: string | null;
    clientWhatsapp: string | null;
    clientTelegram: string | null;
    clientPassport: string | null;
    clientPassportPhotos: string | null;
    clientDriverLicensePhotos: string | null;
    notes: string | null;
    photos: string | null;
};

const CONTRACT_SORT_SQL: Record<string, string> = {
    id: "c.id",
    createdAt: "c.created_at",
    startDate: "c.start_date",
    endDate: "c.end_date",
    totalAmount: "c.total_amount",
    status: "c.status",
};

function getContractSortClause(sortBy: string, sortOrder: SortOrder): string {
    return buildSortClause(CONTRACT_SORT_SQL, sortBy, sortOrder, "createdAt", "c.id");
}

export async function listContractsPage(params: {
    db: D1DatabaseLike;
    companyId: number | null;
    status: string;
    pageSize: number;
    offset: number;
    search: string;
    sortBy: string;
    sortOrder: SortOrder;
}): Promise<ContractListRow[]> {
    const { db, companyId, status, pageSize, offset, search, sortBy, sortOrder } = params;
    const whereSql = companyId
        ? "WHERE cc.company_id = ? AND c.status = ?"
        : "WHERE c.status = ?";
    const searchSql = search
        ? " AND (CAST(c.id AS TEXT) LIKE ? OR CAST(c.start_date AS TEXT) LIKE ? OR CAST(c.end_date AS TEXT) LIKE ? OR CAST(c.total_amount AS TEXT) LIKE ?)"
        : "";

    const sql = `
        SELECT
            c.id,
            c.start_date AS startDate,
            c.end_date AS endDate,
            c.total_amount AS totalAmount,
            c.status
        FROM contracts c
        ${companyId ? "JOIN company_cars cc ON cc.id = c.company_car_id" : ""}
        ${whereSql}
        ${searchSql}
        ${getContractSortClause(sortBy, sortOrder)}
        LIMIT ? OFFSET ?
    `;
    const binds: unknown[] = companyId ? [companyId, status] : [status];
    if (search) {
        const q = `%${search}%`;
        binds.push(q, q, q, q);
    }
    binds.push(pageSize, offset);
    const result = await db.prepare(sql).bind(...binds).all();
    return (result.results || []) as ContractListRow[];
}

export async function listContractStatusCounts(params: {
    db: D1DatabaseLike;
    companyId: number | null;
}): Promise<StatusCount[]> {
    const { db, companyId } = params;
    const result = companyId
        ? await db.prepare(`
            SELECT c.status AS status, COUNT(*) AS count
            FROM contracts c
            JOIN company_cars cc ON cc.id = c.company_car_id
            WHERE cc.company_id = ?
            GROUP BY c.status
        `).bind(companyId).all()
        : await db.prepare(`
            SELECT status, COUNT(*) AS count
            FROM contracts
            GROUP BY status
        `).all();

    return normalizeStatusCounts(result.results as StatusCountRow[]);
}

export async function countContractsPage(params: {
    db: D1DatabaseLike;
    companyId: number | null;
    status: string;
    search: string;
}): Promise<number> {
    const { db, companyId, status, search } = params;
    const q = `%${search}%`;
    const row = companyId
        ? await db.prepare(`
            SELECT COUNT(*) AS count
            FROM contracts c
            JOIN company_cars cc ON cc.id = c.company_car_id
            WHERE cc.company_id = ? AND c.status = ?
            ${search ? "AND (CAST(c.id AS TEXT) LIKE ? OR CAST(c.start_date AS TEXT) LIKE ? OR CAST(c.end_date AS TEXT) LIKE ? OR CAST(c.total_amount AS TEXT) LIKE ?)" : ""}
        `).bind(...(search ? [companyId, status, q, q, q, q] : [companyId, status])).first() as CountRow
        : await db.prepare(`
            SELECT COUNT(*) AS count
            FROM contracts c
            WHERE c.status = ?
            ${search ? "AND (CAST(c.id AS TEXT) LIKE ? OR CAST(c.start_date AS TEXT) LIKE ? OR CAST(c.end_date AS TEXT) LIKE ? OR CAST(c.total_amount AS TEXT) LIKE ?)" : ""}
        `).bind(...(search ? [status, q, q, q, q] : [status])).first() as CountRow;

    return normalizeCount(row);
}

export async function getClosableContractById(params: {
    db: D1DatabaseLike;
    contractId: number;
    companyId?: number | null;
}) {
    const { db, contractId, companyId } = params;
    const binds: unknown[] = [contractId];
    if (companyId) binds.push(companyId);
    return await db.prepare(`
        SELECT
            c.*,
            cc.company_id AS companyId,
            cb.name AS brandName,
            cm.name AS modelName,
            u.name AS clientName,
            u.surname AS clientSurname
        FROM contracts c
        JOIN company_cars cc ON cc.id = c.company_car_id
        LEFT JOIN car_templates ct ON ct.id = cc.template_id
        LEFT JOIN car_brands cb ON cb.id = ct.brand_id
        LEFT JOIN car_models cm ON cm.id = ct.model_id
        LEFT JOIN users u ON u.id = c.client_id
        WHERE c.id = ?
        ${companyId ? "AND cc.company_id = ?" : ""}
        LIMIT 1
    `).bind(...binds).first() as ClosableContractRow | null;
}

export async function getEditableContractById(params: {
    db: D1DatabaseLike;
    contractId: number;
    companyId?: number | null;
}) {
    const { db, contractId, companyId } = params;
    const binds: unknown[] = [contractId];
    if (companyId) binds.push(companyId);
    return await db
        .prepare(`
            SELECT
                c.*,
                cc.id AS carId,
                cc.company_id AS companyId,
                cc.license_plate AS licensePlate,
                u.id AS clientId,
                u.name AS clientName,
                u.surname AS clientSurname,
                u.phone AS clientPhone,
                u.email AS clientEmail,
                u.whatsapp AS clientWhatsapp,
                u.telegram AS clientTelegram,
                u.passport_number AS clientPassport,
                u.passport_photos AS clientPassportPhotos,
                u.driver_license_photos AS clientDriverLicensePhotos
            FROM contracts c
            JOIN company_cars cc ON cc.id = c.company_car_id
            LEFT JOIN users u ON u.id = c.client_id
            WHERE c.id = ?
            ${companyId ? "AND cc.company_id = ?" : ""}
            LIMIT 1
        `)
        .bind(...binds)
        .first() as EditableContractRow | null;
}
