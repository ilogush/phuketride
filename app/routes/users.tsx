import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { UserGroupIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";
import { formatContactPhone } from "~/lib/phone";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { parseListFilters } from "~/lib/query-filters.server";
import { listUsersPage } from "~/lib/users-repo.server";
import type { UserListRow } from "~/lib/db-types";
const USER_TABS = ["admin", "partner", "manager", "user"] as const;
type UserTab = typeof USER_TABS[number];

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const url = new URL(request.url);
    const effectiveCompanyId = getEffectiveCompanyId(request, user);
    const isModMode = user.role === "admin" && effectiveCompanyId !== null;
    const defaultTab = user.role === "partner" || isModMode ? "manager" : "admin";
    const { tab, search, sortBy, sortOrder } = parseListFilters(url, {
        tabs: USER_TABS,
        defaultTab: defaultTab as UserTab,
        sortBy: ["createdAt", "id", "email", "name", "role"] as const,
        defaultSortBy: "createdAt",
        defaultSortOrder: "desc",
    });
    const activeTab: UserTab = tab ?? (defaultTab as UserTab);
    const { page, pageSize, offset } = getPaginationFromUrl(url);
    const partnerSortSql: Record<string, string> = {
        createdAt: "u.created_at",
        id: "u.id",
        email: "u.email",
        name: "u.name",
        role: "u.role",
    };
    const partnerSortColumn = partnerSortSql[sortBy || "createdAt"] || partnerSortSql.createdAt;
    const partnerSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

    let usersList: UserListRow[] = [];
    let roleCounts = { all: 0, admin: 0, partner: 0, manager: 0, user: 0 };
    let totalCount = 0;

    try {
        if (user.role === "partner" || isModMode) {
            // Partner can only see managers and users from their company
            if (!effectiveCompanyId) {
                return { user, users: [], roleCounts, isModMode, activeTab, totalCount, page, pageSize };
            }

            const [managerCountResult, userCountResult] = await Promise.all([
                context.cloudflare.env.DB
                    .prepare(`
                        SELECT COUNT(*) AS count
                        FROM managers m
                        INNER JOIN users u ON u.id = m.user_id
                        WHERE m.company_id = ? AND m.is_active = 1 AND u.role = 'manager'
                    `)
                    .bind(effectiveCompanyId)
                    .first() as { count?: number } | null,
                context.cloudflare.env.DB
                    .prepare(`
                        SELECT COUNT(DISTINCT u.id) AS count
                        FROM users u
                        INNER JOIN contracts c ON u.id = c.client_id
                        INNER JOIN company_cars cc ON c.company_car_id = cc.id
                        WHERE cc.company_id = ? AND u.role = 'user'
                    `)
                    .bind(effectiveCompanyId)
                    .first() as { count?: number } | null,
            ]);
            roleCounts.manager = Number(managerCountResult?.count || 0);
            roleCounts.user = Number(userCountResult?.count || 0);
            roleCounts.all = roleCounts.manager + roleCounts.user;

            if (activeTab === "manager") {
                const managersResult = await context.cloudflare.env.DB
                    .prepare(`
                        SELECT u.id, u.email, u.name, u.surname, u.role, u.phone, u.avatar_url AS avatarUrl
                        FROM users u
                        INNER JOIN managers m ON u.id = m.user_id
                        WHERE m.company_id = ? AND m.is_active = 1 AND u.role = 'manager'
                        ${search ? "AND (COALESCE(u.email,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(u.phone,'') LIKE ?)" : ""}
                        ORDER BY ${partnerSortColumn} ${partnerSortOrder}, u.id DESC
                        LIMIT ? OFFSET ?
                    `)
                    .bind(
                        ...(
                            search
                                ? [effectiveCompanyId, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, pageSize, offset]
                                : [effectiveCompanyId, pageSize, offset]
                        )
                    )
                    .all() as { results?: UserListRow[] };
                usersList = managersResult.results || [];
                if (search) {
                    const countResult = await context.cloudflare.env.DB.prepare(`
                        SELECT COUNT(*) AS count
                        FROM users u
                        INNER JOIN managers m ON u.id = m.user_id
                        WHERE m.company_id = ? AND m.is_active = 1 AND u.role = 'manager'
                        AND (COALESCE(u.email,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(u.phone,'') LIKE ?)
                    `).bind(effectiveCompanyId, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`).first() as { count?: number | string } | null;
                    totalCount = Number(countResult?.count || 0);
                } else {
                    totalCount = roleCounts.manager;
                }
            } else {
                const clientsResult = await context.cloudflare.env.DB
                    .prepare(`
                        SELECT DISTINCT u.id, u.email, u.name, u.surname, u.role, u.phone, u.avatar_url AS avatarUrl
                        FROM users u
                        INNER JOIN contracts c ON u.id = c.client_id
                        INNER JOIN company_cars cc ON c.company_car_id = cc.id
                        WHERE cc.company_id = ? AND u.role = 'user'
                        ${search ? "AND (COALESCE(u.email,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(u.phone,'') LIKE ?)" : ""}
                        ORDER BY ${partnerSortColumn} ${partnerSortOrder}, u.id DESC
                        LIMIT ? OFFSET ?
                    `)
                    .bind(
                        ...(
                            search
                                ? [effectiveCompanyId, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, pageSize, offset]
                                : [effectiveCompanyId, pageSize, offset]
                        )
                    )
                    .all() as { results?: UserListRow[] };
                usersList = clientsResult.results || [];
                if (search) {
                    const countResult = await context.cloudflare.env.DB.prepare(`
                        SELECT COUNT(DISTINCT u.id) AS count
                        FROM users u
                        INNER JOIN contracts c ON u.id = c.client_id
                        INNER JOIN company_cars cc ON c.company_car_id = cc.id
                        WHERE cc.company_id = ? AND u.role = 'user'
                        AND (COALESCE(u.email,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(u.phone,'') LIKE ?)
                    `).bind(effectiveCompanyId, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`).first() as { count?: number | string } | null;
                    totalCount = Number(countResult?.count || 0);
                } else {
                    totalCount = roleCounts.user;
                }
            }
        } else {
            const groupedResult = await context.cloudflare.env.DB
                .prepare(`
                    SELECT role, COUNT(*) AS count
                    FROM users
                    GROUP BY role
                `)
                .all() as { results?: Array<{ role: string; count: number }> };

            (groupedResult.results || []).forEach((row) => {
                const count = Number(row.count || 0);
                if (row.role === "admin") roleCounts.admin = count;
                if (row.role === "partner") roleCounts.partner = count;
                if (row.role === "manager") roleCounts.manager = count;
                if (row.role === "user") roleCounts.user = count;
            });
            roleCounts.all = roleCounts.admin + roleCounts.partner + roleCounts.manager + roleCounts.user;

            usersList = await listUsersPage({
                db: context.cloudflare.env.DB,
                role: activeTab,
                pageSize,
                offset,
                search,
                sortBy: sortBy || "createdAt",
                sortOrder,
            });
            if (search) {
                const countResult = await context.cloudflare.env.DB.prepare(`
                    SELECT COUNT(*) AS count
                    FROM users u
                    WHERE u.role = ?
                    AND (COALESCE(u.email,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR COALESCE(u.surname,'') LIKE ? OR COALESCE(u.phone,'') LIKE ?)
                `).bind(activeTab, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`).first() as { count?: number | string } | null;
                totalCount = Number(countResult?.count || 0);
            } else {
                totalCount = activeTab === "admin" ? roleCounts.admin
                    : activeTab === "partner" ? roleCounts.partner
                        : activeTab === "manager" ? roleCounts.manager
                            : roleCounts.user;
            }
        }
    } catch {
        return { user, users: [], roleCounts, isModMode, activeTab, totalCount: 0, page, pageSize };
    }

    return { user, users: usersList, roleCounts, isModMode, activeTab, totalCount, page, pageSize, search };
}

export default function UsersPage() {
    const { user, users: usersList, roleCounts, isModMode, activeTab, totalCount, search } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    useUrlToast();
    const isPartner = user.role === "partner" || isModMode;

    const tabs = isPartner
        ? [
            { id: "manager", label: "Manager", count: roleCounts.manager },
            { id: "user", label: "User", count: roleCounts.user },
        ]
        : [
            { id: "admin", label: "Admin", count: roleCounts.admin },
            { id: "partner", label: "Partner", count: roleCounts.partner },
            { id: "manager", label: "Manager", count: roleCounts.manager },
            { id: "user", label: "User", count: roleCounts.user },
        ];

    const currentTab = String(activeTab);

    const columns: Column<typeof usersList[0]>[] = [
        {
            key: "name",
            label: "Name",
            sortable: true,
            render: (user) => {
                const initials = `${user.name?.[0] || ''}${user.surname?.[0] || ''}`.toUpperCase();
                const fullName = user.name || "-";
                const surname = user.surname || "";

                return (
                    <Link to={`/users/${user.id}/edit`} className="flex items-start gap-3 hover:opacity-80 transition-opacity">
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={`${fullName} ${surname}`.trim() || user.email}
                                className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0 cursor-pointer">
                                {initials || "?"}
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="font-medium">{fullName}</span>
                            {surname && <span className="text-sm text-gray-500">{surname}</span>}
                        </div>
                    </Link>
                );
            }
        },
        { key: "email", label: "Email", sortable: true },
        {
            key: "phone",
            label: "Phone",
            render: (user) => formatContactPhone(user.phone)
        },
        {
            key: "role",
            label: "Role",
            sortable: true,
            render: (user) => <StatusBadge variant="info">{user.role}</StatusBadge>
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Users Management"
                withSearch
                searchValue={search}
                searchPlaceholder="Search users"
                onSearchChange={(value) => {
                    const next = new URLSearchParams(searchParams);
                    if (value.trim()) next.set("search", value.trim());
                    else next.delete("search");
                    next.set("page", "1");
                    setSearchParams(next);
                }}
                rightActions={
                    <Link to="/users/create">
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                            Add
                        </Button>
                    </Link>
                }
            />

            <Tabs
                tabs={tabs}
                activeTab={currentTab}
                onTabChange={(nextTab) => {
                    const next = new URLSearchParams(searchParams);
                    next.set("tab", String(nextTab));
                    next.set("page", "1");
                    setSearchParams(next);
                }}
            />

            <DataTable
                data={usersList}
                columns={columns}
                totalCount={totalCount}
                serverPagination
                emptyTitle="No users found"
                emptyDescription={`No users with role "${currentTab}"`}
                emptyIcon={<UserGroupIcon className="w-10 h-10" />}
            />
        </div>
    );
}
