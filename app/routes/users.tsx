import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { requireUserDirectoryAccess } from "~/lib/access-policy.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { UserGroupIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { formatContactPhone } from "~/lib/phone";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { parseListFilters } from "~/lib/query-filters.server";
import {
    countCompanyClients,
    countCompanyClientsPage,
    countCompanyManagers,
    countCompanyManagersPage,
    countUsersPage,
    listCompanyClientsPage,
    listCompanyManagersPage,
    listUserRoleCounts,
    listUsersPage,
} from "~/lib/users-repo.server";
import type { UserListRow } from "~/lib/db-types";
import { trackServerOperation } from "~/lib/telemetry.server";
const USER_TABS = ["admin", "partner", "manager", "user"] as const;
type UserTab = typeof USER_TABS[number];

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId: effectiveCompanyId, isModMode } = await requireUserDirectoryAccess(request);
    const url = new URL(request.url);
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

    return trackServerOperation({
        event: "users.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: effectiveCompanyId,
        details: { route: "users", tab: activeTab, sortBy: sortBy || "createdAt", isModMode },
        run: async () => {
            let usersList: UserListRow[] = [];
            let roleCounts = { all: 0, admin: 0, partner: 0, manager: 0, user: 0 };
            let totalCount = 0;

            try {
                if (user.role === "partner" || isModMode) {
                    if (!effectiveCompanyId) {
                        return { user, users: [], roleCounts, isModMode, activeTab, totalCount, page, pageSize };
                    }

                    const [managerCount, userCount] = await Promise.all([
                        countCompanyManagers({
                            db: context.cloudflare.env.DB,
                            companyId: effectiveCompanyId,
                        }),
                        countCompanyClients({
                            db: context.cloudflare.env.DB,
                            companyId: effectiveCompanyId,
                        }),
                    ]);
                    roleCounts.manager = managerCount;
                    roleCounts.user = userCount;
                    roleCounts.all = roleCounts.manager + roleCounts.user;

                    if (activeTab === "manager") {
                        const [rows, count] = await Promise.all([
                            listCompanyManagersPage({
                                db: context.cloudflare.env.DB,
                                companyId: effectiveCompanyId,
                                pageSize,
                                offset,
                                search,
                                sortBy: sortBy || "createdAt",
                                sortOrder,
                            }),
                            countCompanyManagersPage({
                                db: context.cloudflare.env.DB,
                                companyId: effectiveCompanyId,
                                search,
                            }),
                        ]);
                        usersList = rows;
                        totalCount = count;
                    } else {
                        const [rows, count] = await Promise.all([
                            listCompanyClientsPage({
                                db: context.cloudflare.env.DB,
                                companyId: effectiveCompanyId,
                                pageSize,
                                offset,
                                search,
                                sortBy: sortBy || "createdAt",
                                sortOrder,
                            }),
                            countCompanyClientsPage({
                                db: context.cloudflare.env.DB,
                                companyId: effectiveCompanyId,
                                search,
                            }),
                        ]);
                        usersList = rows;
                        totalCount = count;
                    }
                } else {
                    const groupedResult = await listUserRoleCounts({
                        db: context.cloudflare.env.DB,
                    });

                    groupedResult.forEach((row) => {
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
                    totalCount = await countUsersPage({
                        db: context.cloudflare.env.DB,
                        role: activeTab,
                        search,
                    });
                }
            } catch {
                return { user, users: [], roleCounts, isModMode, activeTab, totalCount: 0, page, pageSize };
            }

            return { user, users: usersList, roleCounts, isModMode, activeTab, totalCount, page, pageSize, search };
        },
    });
}

export default function UsersPage() {
    const { user, users: usersList, roleCounts, isModMode, activeTab, totalCount } = useLoaderData<typeof loader>();
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
