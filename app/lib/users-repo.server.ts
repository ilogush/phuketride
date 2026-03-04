import type { SortOrder } from "~/lib/query-filters.server";
import type { UserListRow } from "~/lib/db-types";

type D1DatabaseLike = {
    prepare: (query: string) => {
        bind: (...values: unknown[]) => {
            all: () => Promise<{ results?: unknown[] }>;
        };
    };
};

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
