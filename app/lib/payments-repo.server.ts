import type { SortOrder } from "~/lib/query-filters.server";
import type { PaymentListRow } from "~/lib/db-types";

type D1DatabaseLike = {
    prepare: (query: string) => {
        bind: (...values: unknown[]) => {
            all: () => Promise<{ results?: unknown[] }>;
        };
    };
};

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
