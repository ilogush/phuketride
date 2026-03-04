import type { SortOrder } from "~/lib/query-filters.server";
import type { CompanyListRow } from "~/lib/db-types";

type D1DatabaseLike = {
    prepare: (query: string) => {
        bind: (...values: unknown[]) => {
            all: () => Promise<{ results?: unknown[] }>;
            first: () => Promise<unknown>;
        };
        all: () => Promise<{ results?: unknown[] }>;
        first: () => Promise<unknown>;
    };
};

const COMPANY_SORT_SQL: Record<string, string> = {
    id: "c.id",
    createdAt: "c.created_at",
    name: "c.name",
    carCount: "carCount",
};

function getCompanySortClause(sortBy: string, sortOrder: SortOrder): string {
    const sortColumn = COMPANY_SORT_SQL[sortBy] || COMPANY_SORT_SQL.createdAt;
    const direction = sortOrder === "asc" ? "ASC" : "DESC";
    return `ORDER BY ${sortColumn} ${direction}, c.id DESC`;
}

export async function countCompanies(params: {
    db: D1DatabaseLike;
    showArchived: boolean;
    search: string;
}): Promise<number> {
    const { db, showArchived, search } = params;
    const sql = `
        SELECT COUNT(*) AS count
        FROM companies c
        LEFT JOIN users u ON u.id = c.owner_id
        LEFT JOIN districts d ON d.id = c.district_id
        WHERE ${showArchived ? "1=1" : "c.archived_at IS NULL"}
        ${search ? "AND (COALESCE(c.name,'') LIKE ? OR COALESCE(c.email,'') LIKE ? OR COALESCE(c.phone,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(d.name,'') LIKE ?)" : ""}
    `;
    const query = db.prepare(sql);
    const q = `%${search}%`;
    const row = search ? await query.bind(q, q, q, q, q, q).first() as { count?: number | string } | null : await query.first() as { count?: number | string } | null;
    return Number(row?.count ?? 0);
}

export async function listCompaniesPage(params: {
    db: D1DatabaseLike;
    showArchived: boolean;
    pageSize: number;
    offset: number;
    search: string;
    sortBy: string;
    sortOrder: SortOrder;
}): Promise<CompanyListRow[]> {
    const { db, showArchived, pageSize, offset, search, sortBy, sortOrder } = params;
    const sql = `
        SELECT
            c.id,
            c.name,
            c.email,
            c.phone,
            c.location_id AS locationId,
            c.district_id AS districtId,
            c.owner_id AS ownerId,
            c.archived_at AS archivedAt,
            u.name AS ownerName,
            u.surname AS ownerSurname,
            u.archived_at AS ownerArchivedAt,
            d.name AS districtName,
            COUNT(cc.id) AS carCount
        FROM companies c
        LEFT JOIN users u ON u.id = c.owner_id
        LEFT JOIN districts d ON d.id = c.district_id
        LEFT JOIN company_cars cc ON cc.company_id = c.id
        WHERE ${showArchived ? "1=1" : "c.archived_at IS NULL"}
        ${search ? "AND (COALESCE(c.name,'') LIKE ? OR COALESCE(c.email,'') LIKE ? OR COALESCE(c.phone,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(d.name,'') LIKE ?)" : ""}
        GROUP BY c.id
        ${getCompanySortClause(sortBy, sortOrder)}
        LIMIT ? OFFSET ?
    `;
    const query = db.prepare(sql);
    const binds: unknown[] = [];
    if (search) {
        const q = `%${search}%`;
        binds.push(q, q, q, q, q, q);
    }
    binds.push(pageSize, offset);
    const result = await query.bind(...binds).all();
    return (result.results || []) as CompanyListRow[];
}
