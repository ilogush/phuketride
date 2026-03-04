import type { SortOrder } from "~/lib/query-filters.server";
import type { ContractListRow } from "~/lib/db-types";

type D1DatabaseLike = {
    prepare: (query: string) => {
        bind: (...values: unknown[]) => {
            all: () => Promise<{ results?: unknown[] }>;
        };
    };
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
    const sortColumn = CONTRACT_SORT_SQL[sortBy] || CONTRACT_SORT_SQL.createdAt;
    const direction = sortOrder === "asc" ? "ASC" : "DESC";
    return `ORDER BY ${sortColumn} ${direction}, c.id DESC`;
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
