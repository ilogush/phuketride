import type { SortOrder } from "~/lib/query-filters.server";
import type { PaymentListRow } from "~/lib/db-types";

import { type D1DatabaseLike } from "~/lib/repo-types.server";

type CountRow = { count?: number | string } | null;
type StatusCountRow = { status: string; count: number | string };

const PAYMENT_SORT_SQL: Record<string, string> = {
    id: "p.id",
    createdAt: "p.created_at",
    amount: "p.amount",
    status: "p.status",
};

function getPaymentSortClause(sortBy: string, sortOrder: SortOrder): string {
    const sortColumn = PAYMENT_SORT_SQL[sortBy] || PAYMENT_SORT_SQL.createdAt;
    const direction = sortOrder === "asc" ? "ASC" : "DESC";
    return `ORDER BY ${sortColumn} ${direction}, p.id DESC`;
}

export async function listPaymentsPage(params: {
    db: D1DatabaseLike;
    companyId: number | null;
    status: string;
    pageSize: number;
    offset: number;
    search: string;
    sortBy: string;
    sortOrder: SortOrder;
}): Promise<PaymentListRow[]> {
    const { db, companyId, status, pageSize, offset, search, sortBy, sortOrder } = params;

    const baseSql = `
        SELECT
            p.*,
            c.id AS contractId,
            pt.name AS paymentTypeName,
            pt.sign AS paymentTypeSign,
            cur.code AS currencyCode,
            cur.symbol AS currencySymbol,
            u.name AS creatorName,
            u.surname AS creatorSurname
        FROM payments p
        ${companyId ? "JOIN contracts c ON c.id = p.contract_id JOIN company_cars cc ON cc.id = c.company_car_id" : "LEFT JOIN contracts c ON c.id = p.contract_id"}
        LEFT JOIN payment_types pt ON pt.id = p.payment_type_id
        LEFT JOIN currencies cur ON cur.code = p.currency
        LEFT JOIN users u ON u.id = p.created_by
        WHERE ${companyId ? "cc.company_id = ? AND " : ""}p.status = ?
        ${search ? "AND (CAST(p.id AS TEXT) LIKE ? OR CAST(c.id AS TEXT) LIKE ? OR COALESCE(pt.name,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR CAST(p.amount AS TEXT) LIKE ?)" : ""}
        ${getPaymentSortClause(sortBy, sortOrder)}
        LIMIT ? OFFSET ?
    `;

    const binds: unknown[] = companyId ? [companyId, status] : [status];
    if (search) {
        const q = `%${search}%`;
        binds.push(q, q, q, q, q, q);
    }
    binds.push(pageSize, offset);
    const result = await db.prepare(baseSql).bind(...binds).all();
    return (result.results || []) as PaymentListRow[];
}

export async function listPaymentStatusCounts(params: {
    db: D1DatabaseLike;
    companyId: number | null;
}) {
    const { db, companyId } = params;
    const result = companyId
        ? await db.prepare(`
            SELECT p.status AS status, COUNT(*) AS count
            FROM payments p
            JOIN contracts c ON c.id = p.contract_id
            JOIN company_cars cc ON cc.id = c.company_car_id
            WHERE cc.company_id = ?
            GROUP BY p.status
        `).bind(companyId).all()
        : await db.prepare(`
            SELECT status, COUNT(*) AS count
            FROM payments
            GROUP BY status
        `).all();

    return (result.results || []) as StatusCountRow[];
}

export async function countPaymentsPage(params: {
    db: D1DatabaseLike;
    companyId: number | null;
    status: string;
    search: string;
}) {
    const { db, companyId, status, search } = params;
    const q = `%${search}%`;
    const row = companyId
        ? await db.prepare(`
            SELECT COUNT(*) AS count
            FROM payments p
            JOIN contracts c ON c.id = p.contract_id
            JOIN company_cars cc ON cc.id = c.company_car_id
            LEFT JOIN payment_types pt ON pt.id = p.payment_type_id
            LEFT JOIN users u ON u.id = p.created_by
            WHERE cc.company_id = ? AND p.status = ?
            ${search ? "AND (CAST(p.id AS TEXT) LIKE ? OR CAST(c.id AS TEXT) LIKE ? OR COALESCE(pt.name,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR CAST(p.amount AS TEXT) LIKE ?)" : ""}
        `).bind(...(search ? [companyId, status, q, q, q, q, q, q] : [companyId, status])).first() as CountRow
        : await db.prepare(`
            SELECT COUNT(*) AS count
            FROM payments p
            LEFT JOIN contracts c ON c.id = p.contract_id
            LEFT JOIN payment_types pt ON pt.id = p.payment_type_id
            LEFT JOIN users u ON u.id = p.created_by
            WHERE p.status = ?
            ${search ? "AND (CAST(p.id AS TEXT) LIKE ? OR CAST(c.id AS TEXT) LIKE ? OR COALESCE(pt.name,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR CAST(p.amount AS TEXT) LIKE ?)" : ""}
        `).bind(...(search ? [status, q, q, q, q, q, q] : [status])).first() as CountRow;

    return Number(row?.count || 0);
}

export async function getPaymentById(params: {
    db: D1DatabaseLike;
    paymentId: number;
    companyId?: number | null;
}) {
    const { db, paymentId, companyId } = params;
    const binds: unknown[] = [paymentId];
    if (companyId) binds.push(companyId);

    return await db.prepare(`
        SELECT
            p.*,
            c.id AS contractId,
            pt.name AS paymentTypeName,
            pt.sign AS paymentTypeSign,
            cur.code AS currencyCode,
            cur.symbol AS currencySymbol,
            u.name AS creatorName,
            u.surname AS creatorSurname
        FROM payments p
        LEFT JOIN contracts c ON c.id = p.contract_id
        ${companyId ? "JOIN company_cars cc ON cc.id = c.company_car_id" : ""}
        LEFT JOIN payment_types pt ON pt.id = p.payment_type_id
        LEFT JOIN currencies cur ON cur.code = p.currency
        LEFT JOIN users u ON u.id = p.created_by
        WHERE p.id = ?
        ${companyId ? "AND cc.company_id = ?" : ""}
        LIMIT 1
    `).bind(...binds).first() as PaymentListRow | null;
}
