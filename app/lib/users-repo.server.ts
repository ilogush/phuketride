import type { SortOrder } from "~/lib/query-filters.server";
import type { UserListRow } from "~/lib/db-types";

import { type D1DatabaseLike } from "~/lib/repo-types.server";

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
    companyId?: number | null;
}): Promise<UserListRow[]> {
    const { db, role, pageSize, offset, search, sortBy, sortOrder, companyId } = params;
    
    let fromSql = "FROM users u";
    let whereSql = "WHERE u.role = ? AND u.archived_at IS NULL";
    const binds: unknown[] = [role];

    if (companyId) {
        if (role === "manager") {
            fromSql = "FROM users u INNER JOIN managers m ON u.id = m.user_id";
            whereSql = "WHERE u.role = ? AND m.company_id = ? AND m.is_active = 1 AND u.archived_at IS NULL";
            binds.push(companyId);
        } else if (role === "user") {
            fromSql = "FROM users u INNER JOIN contracts c ON u.id = c.client_id INNER JOIN company_cars cc ON cc.id = c.company_car_id";
            whereSql = "WHERE u.role = ? AND cc.company_id = ? AND u.archived_at IS NULL";
            binds.push(companyId);
        }
    }

    const sql = `
        SELECT ${role === "user" ? "DISTINCT" : ""} u.id, u.email, u.name, u.surname, u.role, u.phone, u.avatar_url AS avatarUrl
        ${fromSql}
        ${whereSql}
        ${search ? "AND (COALESCE(u.email,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(u.phone,'') LIKE ?)" : ""}
        ${getUserSortClause(sortBy, sortOrder)}
        LIMIT ? OFFSET ?
    `;

    if (search) {
        binds.push(...getUserSearchBinds(search));
    }
    binds.push(pageSize, offset);

    const result = await db.prepare(sql).bind(...binds).all();
    return (result.results || []) as UserListRow[];
}

export async function countUsersPage(params: {
    db: D1DatabaseLike;
    role: string;
    search: string;
    companyId?: number | null;
}) {
    const { db, role, search, companyId } = params;
    let fromSql = "FROM users u";
    let whereSql = "WHERE u.role = ? AND u.archived_at IS NULL";
    const binds: unknown[] = [role];

    if (companyId) {
        if (role === "manager") {
            fromSql = "FROM users u INNER JOIN managers m ON u.id = m.user_id";
            whereSql = "WHERE u.role = ? AND m.company_id = ? AND m.is_active = 1 AND u.archived_at IS NULL";
            binds.push(companyId);
        } else if (role === "user") {
            fromSql = "FROM users u INNER JOIN contracts c ON u.id = c.client_id INNER JOIN company_cars cc ON cc.id = c.company_car_id";
            whereSql = "WHERE u.role = ? AND cc.company_id = ? AND u.archived_at IS NULL";
            binds.push(companyId);
        }
    }

    if (search) {
        binds.push(...getUserSearchBinds(search));
    }

    const row = await db.prepare(`
        SELECT COUNT(${role === "user" ? "DISTINCT u.id" : "*"}) AS count
        ${fromSql}
        ${whereSql}
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
        WHERE archived_at IS NULL
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
        WHERE m.company_id = ? AND m.is_active = 1 AND u.role = 'manager' AND u.archived_at IS NULL
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
        WHERE cc.company_id = ? AND u.role = 'user' AND u.archived_at IS NULL
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
        WHERE m.company_id = ? AND m.is_active = 1 AND u.role = 'manager' AND u.archived_at IS NULL
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
        WHERE m.company_id = ? AND m.is_active = 1 AND u.role = 'manager' AND u.archived_at IS NULL
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
        WHERE cc.company_id = ? AND u.role = 'user' AND u.archived_at IS NULL
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
        WHERE cc.company_id = ? AND u.role = 'user' AND u.archived_at IS NULL
        ${params.search ? "AND (COALESCE(u.email,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(u.phone,'') LIKE ?)" : ""}
    `).bind(...binds).first() as CountRow;

    return Number(row?.count || 0);
}

export async function getUserById(params: {
    db: D1DatabaseLike;
    userId: string;
    companyId?: number | null;
}) {
    const { db, userId, companyId } = params;
    if (companyId) {
        // Multi-tenant check: User must be a manager of this company or a client of this company
        return await db.prepare(`
            SELECT DISTINCT u.id, u.email, u.name, u.surname, u.role, u.phone, u.avatar_url AS avatarUrl
            FROM users u
            LEFT JOIN managers m ON u.id = m.user_id AND m.company_id = ?
            LEFT JOIN contracts c ON u.id = c.client_id
            LEFT JOIN company_cars cc ON c.company_car_id = cc.id AND cc.company_id = ?
            WHERE u.id = ? AND (m.id IS NOT NULL OR cc.id IS NOT NULL) AND u.archived_at IS NULL
            LIMIT 1
        `).bind(companyId, companyId, userId).first() as UserListRow | null;
    }

    return await db.prepare(`
        SELECT id, email, name, surname, role, phone, avatar_url AS avatarUrl
        FROM users
        WHERE id = ? AND archived_at IS NULL
        LIMIT 1
    `).bind(userId).first() as UserListRow | null;
}
