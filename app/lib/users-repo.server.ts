import type { SortOrder } from "~/lib/query-filters.server";
import type { UserListRow } from "~/lib/db-types";

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

type CountRow = { count?: number | string } | null;
type RoleCountRow = { role: string; count: number | string };

const USER_SORT_SQL: Record<string, string> = {
    id: "u.id",
    createdAt: "u.created_at",
    email: "u.email",
    name: "u.name",
    role: "u.role",
};

function getUserSortClause(sortBy: string, sortOrder: SortOrder): string {
    const sortColumn = USER_SORT_SQL[sortBy] || USER_SORT_SQL.createdAt;
    const direction = sortOrder === "asc" ? "ASC" : "DESC";
    return `ORDER BY ${sortColumn} ${direction}, u.id DESC`;
}

function getUserSearchBinds(search: string) {
    const q = `%${search}%`;
    return [q, q, q, q];
}

export async function listUsersPage(params: {
    db: D1DatabaseLike;
    role: string;
    pageSize: number;
    offset: number;
    search: string;
    sortBy: string;
    sortOrder: SortOrder;
}): Promise<UserListRow[]> {
    const { db, role, pageSize, offset, search, sortBy, sortOrder } = params;
    const sql = `
        SELECT u.id, u.email, u.name, u.surname, u.role, u.phone, u.avatar_url AS avatarUrl
        FROM users u
        WHERE u.role = ?
        ${search ? "AND (COALESCE(u.email,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(u.phone,'') LIKE ?)" : ""}
        ${getUserSortClause(sortBy, sortOrder)}
        LIMIT ? OFFSET ?
    `;
    const binds: unknown[] = [role];
    if (search) {
        const q = `%${search}%`;
        binds.push(q, q, q, q);
    }
    binds.push(pageSize, offset);
    const result = await db.prepare(sql).bind(...binds).all();
    return (result.results || []) as UserListRow[];
}

export async function countUsersPage(params: {
    db: D1DatabaseLike;
    role: string;
    search: string;
}) {
    const { db, role, search } = params;
    const binds: unknown[] = [role];
    if (search) {
        binds.push(...getUserSearchBinds(search));
    }

    const row = await db.prepare(`
        SELECT COUNT(*) AS count
        FROM users u
        WHERE u.role = ?
        ${search ? "AND (COALESCE(u.email,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(u.phone,'') LIKE ?)" : ""}
    `).bind(...binds).first() as CountRow;

    return Number(row?.count || 0);
}

export async function listUserRoleCounts(params: {
    db: D1DatabaseLike;
}) {
    const result = await params.db.prepare(`
        SELECT role, COUNT(*) AS count
        FROM users
        GROUP BY role
    `).all();
    return (result.results || []) as RoleCountRow[];
}

export async function countCompanyManagers(params: {
    db: D1DatabaseLike;
    companyId: number;
}) {
    const row = await params.db.prepare(`
        SELECT COUNT(*) AS count
        FROM managers m
        INNER JOIN users u ON u.id = m.user_id
        WHERE m.company_id = ? AND m.is_active = 1 AND u.role = 'manager'
    `).bind(params.companyId).first() as CountRow;
    return Number(row?.count || 0);
}

export async function countCompanyClients(params: {
    db: D1DatabaseLike;
    companyId: number;
}) {
    const row = await params.db.prepare(`
        SELECT COUNT(DISTINCT u.id) AS count
        FROM users u
        INNER JOIN contracts c ON u.id = c.client_id
        INNER JOIN company_cars cc ON c.company_car_id = cc.id
        WHERE cc.company_id = ? AND u.role = 'user'
    `).bind(params.companyId).first() as CountRow;
    return Number(row?.count || 0);
}

export async function listCompanyManagersPage(params: {
    db: D1DatabaseLike;
    companyId: number;
    pageSize: number;
    offset: number;
    search: string;
    sortBy: string;
    sortOrder: SortOrder;
}) {
    const { db, companyId, pageSize, offset, search, sortBy, sortOrder } = params;
    const binds: unknown[] = [companyId];
    if (search) {
        binds.push(...getUserSearchBinds(search));
    }
    binds.push(pageSize, offset);

    const result = await db.prepare(`
        SELECT u.id, u.email, u.name, u.surname, u.role, u.phone, u.avatar_url AS avatarUrl
        FROM users u
        INNER JOIN managers m ON u.id = m.user_id
        WHERE m.company_id = ? AND m.is_active = 1 AND u.role = 'manager'
        ${search ? "AND (COALESCE(u.email,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(u.phone,'') LIKE ?)" : ""}
        ${getUserSortClause(sortBy, sortOrder)}
        LIMIT ? OFFSET ?
    `).bind(...binds).all();

    return (result.results || []) as UserListRow[];
}

export async function countCompanyManagersPage(params: {
    db: D1DatabaseLike;
    companyId: number;
    search: string;
}) {
    const binds: unknown[] = [params.companyId];
    if (params.search) {
        binds.push(...getUserSearchBinds(params.search));
    }

    const row = await params.db.prepare(`
        SELECT COUNT(*) AS count
        FROM users u
        INNER JOIN managers m ON u.id = m.user_id
        WHERE m.company_id = ? AND m.is_active = 1 AND u.role = 'manager'
        ${params.search ? "AND (COALESCE(u.email,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(u.phone,'') LIKE ?)" : ""}
    `).bind(...binds).first() as CountRow;

    return Number(row?.count || 0);
}

export async function listCompanyClientsPage(params: {
    db: D1DatabaseLike;
    companyId: number;
    pageSize: number;
    offset: number;
    search: string;
    sortBy: string;
    sortOrder: SortOrder;
}) {
    const { db, companyId, pageSize, offset, search, sortBy, sortOrder } = params;
    const binds: unknown[] = [companyId];
    if (search) {
        binds.push(...getUserSearchBinds(search));
    }
    binds.push(pageSize, offset);

    const result = await db.prepare(`
        SELECT DISTINCT u.id, u.email, u.name, u.surname, u.role, u.phone, u.avatar_url AS avatarUrl
        FROM users u
        INNER JOIN contracts c ON u.id = c.client_id
        INNER JOIN company_cars cc ON c.company_car_id = cc.id
        WHERE cc.company_id = ? AND u.role = 'user'
        ${search ? "AND (COALESCE(u.email,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(u.phone,'') LIKE ?)" : ""}
        ${getUserSortClause(sortBy, sortOrder)}
        LIMIT ? OFFSET ?
    `).bind(...binds).all();

    return (result.results || []) as UserListRow[];
}

export async function countCompanyClientsPage(params: {
    db: D1DatabaseLike;
    companyId: number;
    search: string;
}) {
    const binds: unknown[] = [params.companyId];
    if (params.search) {
        binds.push(...getUserSearchBinds(params.search));
    }

    const row = await params.db.prepare(`
        SELECT COUNT(DISTINCT u.id) AS count
        FROM users u
        INNER JOIN contracts c ON u.id = c.client_id
        INNER JOIN company_cars cc ON c.company_car_id = cc.id
        WHERE cc.company_id = ? AND u.role = 'user'
        ${params.search ? "AND (COALESCE(u.email,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(u.phone,'') LIKE ?)" : ""}
    `).bind(...binds).first() as CountRow;

    return Number(row?.count || 0);
}
