import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, Link, useSearchParams, useNavigation, Outlet } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Users — Phuket Ride Admin" },
    { name: "robots", content: "noindex, nofollow" },
];
import PageHeader from '~/components/shared/ui/PageHeader';
import Tabs from '~/components/shared/ui/Tabs';
import DataTable, { type Column } from '~/components/dashboard/data-table/DataTable';
import StatusBadge from '~/components/shared/ui/StatusBadge';
import Button from '~/components/shared/ui/Button';
import { UserGroupIcon, PlusIcon } from "@heroicons/react/24/outline";
import IdBadge from '~/components/shared/ui/IdBadge';
import { formatContactPhone } from "~/lib/phone";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { parseListFilters } from "~/lib/query-filters.server";
import type { UserListRow } from "~/lib/db-types";
import { trackServerOperation } from "~/lib/telemetry.server";
const USER_TABS = ["admin", "partner", "manager", "user"] as const;
type UserTab = typeof USER_TABS[number];

import { getScopedDb } from "~/lib/db-factory.server";
import { requireUserDirectoryAccess } from "~/lib/access-policy.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, isModMode, sdb } = await getScopedDb(request, context, requireUserDirectoryAccess);
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
        companyId,
        details: { route: "users", tab: activeTab, sortBy: sortBy || "createdAt", isModMode },
        run: async () => {
            let usersList: UserListRow[] = [];
            let roleCounts = { all: 0, admin: 0, partner: 0, manager: 0, user: 0 };
            let totalCount = 0;

            const isPartner = user.role === "partner" || isModMode;

            try {
                if (isPartner) {
                    if (!companyId) {
                        return { user, users: [], roleCounts, isModMode, activeTab, totalCount, page, pageSize };
                    }

                    const [managerCount, clientCount] = await Promise.all([
                        sdb.users.countByRole({ role: "manager" }),
                        sdb.users.countByRole({ role: "user" }),
                    ]);
                    roleCounts.manager = managerCount;
                    roleCounts.user = clientCount;
                    roleCounts.all = roleCounts.manager + roleCounts.user;

                    const [rows, count] = await Promise.all([
                        sdb.users.list({
                            role: activeTab,
                            pageSize,
                            offset,
                            search,
                            sortBy: sortBy || "createdAt",
                            sortOrder,
                        }),
                        sdb.users.count({
                            role: activeTab,
                            search,
                        }),
                    ]);
                    usersList = rows;
                    totalCount = count;
                } else {
                    const groupedResult = await sdb.users.getRoleCounts();
                    groupedResult.forEach((row) => {
                        const count = Number(row.count || 0);
                        if (row.role === "admin") roleCounts.admin = count;
                        if (row.role === "partner") roleCounts.partner = count;
                        if (row.role === "manager") roleCounts.manager = count;
                        if (row.role === "user") roleCounts.user = count;
                    });
                    roleCounts.all = roleCounts.admin + roleCounts.partner + roleCounts.manager + roleCounts.user;

                    const [rows, count] = await Promise.all([
                        sdb.users.list({
                            role: activeTab,
                            pageSize,
                            offset,
                            search,
                            sortBy: sortBy || "createdAt",
                            sortOrder,
                        }),
                        sdb.users.count({
                            role: activeTab,
                            search,
                        }),
                    ]);
                    usersList = rows;
                    totalCount = count;
                }
            } catch {
                return { user, users: [], roleCounts, isModMode, activeTab, totalCount: 0, page, pageSize };
            }

            return { user, users: usersList, roleCounts, isModMode, activeTab, totalCount, page, pageSize, search };
        },
    });
}

export default function UsersPage() {
    const { user, users: usersList, roleCounts, isModMode, activeTab, totalCount, search } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigation = useNavigation();
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
                    <div className="flex items-start gap-3">
                        <Link to={`/users/${user.id}/edit`} className="hover:opacity-80 transition-opacity flex-shrink-0">
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt={`${fullName} ${surname}`.trim() || user.email}
                                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium cursor-pointer">
                                    {initials || "?"}
                                </div>
                            )}
                        </Link>
                        <div className="flex flex-col">
                            <span className="font-medium">{fullName}</span>
                            {surname && <span className="text-sm text-gray-500">{surname}</span>}
                        </div>
                    </div>
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
            render: (user) => <span className="capitalize text-gray-700">{user.role}</span>
        },
    ];



    return (
        <div className="space-y-4">
            <PageHeader
                title="Users"
                rightActions={
                    <Link to="/users/create">
                        <Button variant="solid" icon={<PlusIcon className="w-5 h-5" />}>
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
                isLoading={navigation.state === "loading"}
                emptyTitle="No users found"
                emptyDescription={`No users with role "${currentTab}"`}
                emptyIcon={<UserGroupIcon className="w-10 h-10" />}
            />
        </div>
    );
}
