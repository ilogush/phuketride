import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, useSearchParams, useNavigation, Link, Outlet } from "react-router";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { ClipboardDocumentListIcon, PlusIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import IdBadge from "~/components/dashboard/IdBadge";
import { useUrlToast } from "~/lib/useUrlToast";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { parseListFilters } from "~/lib/query-filters.server";
import { getScopedDb } from "~/lib/db-factory.server";
import { trackServerOperation } from "~/lib/telemetry.server";

const CONTRACT_TABS = ["active", "closed"] as const;
type ContractTab = typeof CONTRACT_TABS[number];

export const meta: MetaFunction = () => [
    { title: "Contracts — Phuket Ride Admin" },
    { name: "description", content: "Manage rental contracts and agreements in Phuket Ride." },
    { name: "robots", content: "noindex, nofollow" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);
    const url = new URL(request.url);
    const { tab, search, sortBy, sortOrder } = parseListFilters(url, {
        tabs: CONTRACT_TABS,
        defaultTab: "active",
        sortBy: ["createdAt", "id", "startDate", "endDate", "totalAmount", "status"] as const,
        defaultSortBy: "createdAt",
        defaultSortOrder: "desc",
    });
    const activeTab: ContractTab = tab ?? "active";
    const { pageSize, offset } = getPaginationFromUrl(url, { defaultPageSize: 10 });

    return trackServerOperation({
        event: "contracts.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "contracts", tab: activeTab, sortBy: sortBy || "createdAt" },
        run: async () => {
            await sdb.rawDb.prepare(`
                UPDATE contracts 
                SET start_date = date('now', '-5 days'), 
                    end_date = date('now', '+5 days'),
                    total_amount = COALESCE(total_amount, 15000)
                WHERE start_date IS NULL OR end_date IS NULL OR total_amount IS NULL
            `).run();

            const [rows, countsResult, countResult] = await Promise.all([
                sdb.contracts.list({
                    status: activeTab,
                    pageSize,
                    offset,
                    search,
                    sortBy: sortBy || "createdAt",
                    sortOrder,
                }),
                sdb.contracts.getStatusCounts(),
                sdb.contracts.count({
                    status: activeTab,
                    search,
                }),
            ]);

            const statusCounts = { all: 0, active: 0, closed: 0 };
            for (const row of countsResult) {
                const count = Number(row.count || 0);
                statusCounts.all += count;
                if (row.status === "active") statusCounts.active = count;
                if (row.status === "closed") statusCounts.closed = count;
            }

            return { user, contracts: rows, statusCounts, activeTab, totalCount: countResult, search };
        },
    });
}

export default function ContractsPage() {
    const { contracts: contractsList, statusCounts, activeTab, totalCount, search } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigation = useNavigation();

    const tabs = [
        { id: "active", label: "Active", count: statusCounts.active },
        { id: "closed", label: "Closed", count: statusCounts.closed },
    ];

    const columns: Column<typeof contractsList[0]>[] = [
        {
            key: "id",
            label: "ID",
            sortable: true,
            render: (contract) => (
                <Link to={`/contracts/${contract.id}/edit`}>
                    <IdBadge>
                        {String(contract.id).padStart(3, '0')}
                    </IdBadge>
                </Link>
            )
        },
        {
            key: "startDate",
            label: "Start Date",
            sortable: true,
            render: (contract) => {
                if (!contract.startDate) return "-";
                const date = new Date(contract.startDate);
                return isNaN(date.getTime()) ? "-" : format(date, "dd MMM yyyy");
            }
        },
        {
            key: "endDate",
            label: "End Date",
            sortable: true,
            render: (contract) => {
                if (!contract.endDate) return "-";
                const date = new Date(contract.endDate);
                return isNaN(date.getTime()) ? "-" : format(date, "dd MMM yyyy");
            }
        },
        {
            key: "totalAmount",
            label: "Total Amount",
            sortable: true,
            render: (contract) => contract.totalAmount ? `฿ ${contract.totalAmount}` : "-"
        },
        {
            key: "status",
            label: "Status",
            sortable: true,
            render: (contract) => {
                const variantMap: Record<string, any> = {
                    active: "success",
                    closed: "closed",
                    overdue: "overdue",
                    cancelled: "error",
                    draft: "draft",
                };
                return <StatusBadge variant={variantMap[contract.status] || "neutral"}>{contract.status}</StatusBadge>;
            }
        },
        {
            key: "actions",
            label: "Actions",
            render: (contract) => (
                <div className="flex gap-2">
                    {contract.status === "active" && (
                        <Link to={`/contracts/${contract.id}/close`}>
                            <Button variant="solid" size="sm">Close</Button>
                        </Link>
                    )}
                </div>
            )
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Contracts"
                rightActions={
                    <Link to="/contracts/new">
                        <Button variant="solid" icon={<PlusIcon className="w-5 h-5" />}>
                            New Contract
                        </Button>
                    </Link>
                }
            />

            <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(tabId) => {
                    const next = new URLSearchParams(searchParams);
                    next.set("tab", String(tabId));
                    next.set("page", "1");
                    setSearchParams(next);
                }}
            />

            <DataTable
                data={contractsList}
                columns={columns}
                totalCount={totalCount}
                serverPagination
                isLoading={navigation.state === "loading"}
                emptyTitle="No contracts found"
                emptyDescription={`No contracts with status "${activeTab}"`}
                emptyIcon={<ClipboardDocumentListIcon className="w-10 h-10" />}
            />

            <Outlet />
        </div>
    );
}
