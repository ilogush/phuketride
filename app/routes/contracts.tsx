import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams, Outlet } from "react-router";
import { requireScopedDashboardAccess } from "~/lib/access-policy.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { ClipboardDocumentListIcon, PlusIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { useUrlToast } from "~/lib/useUrlToast";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { parseListFilters } from "~/lib/query-filters.server";
import { countContractsPage, listContractsPage, listContractStatusCounts } from "~/lib/contracts-repo.server";
import type { ContractListRow } from "~/lib/db-types";
import { trackServerOperation } from "~/lib/telemetry.server";
const CONTRACT_TABS = ["active", "closed"] as const;
type ContractTab = typeof CONTRACT_TABS[number];

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId: effectiveCompanyId } = await requireScopedDashboardAccess(request, { allowAdminGlobal: true });
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
        companyId: effectiveCompanyId,
        details: { route: "contracts", tab: activeTab, sortBy: sortBy || "createdAt" },
        run: async () => {
            let contractsList: ContractListRow[] = [];
            let statusCounts = { all: 0, active: 0, closed: 0 };
            let totalCount = 0;

            try {
                const [rows, countsResult, countResult] = await Promise.all([
                    listContractsPage({
                        db: context.cloudflare.env.DB,
                        companyId: effectiveCompanyId,
                        status: activeTab,
                        pageSize,
                        offset,
                        search,
                        sortBy: sortBy || "createdAt",
                        sortOrder,
                    }),
                    listContractStatusCounts({
                        db: context.cloudflare.env.DB,
                        companyId: effectiveCompanyId,
                    }),
                    countContractsPage({
                        db: context.cloudflare.env.DB,
                        companyId: effectiveCompanyId,
                        status: activeTab,
                        search,
                    }),
                ]);
                contractsList = rows;

                for (const row of countsResult) {
                    const count = Number(row.count || 0);
                    statusCounts.all += count;
                    if (row.status === "active") statusCounts.active = count;
                    if (row.status === "closed") statusCounts.closed = count;
                }
                totalCount = countResult;
            } catch {
                contractsList = [];
            }

            return { user, contracts: contractsList, statusCounts, activeTab, totalCount, search };
        },
    });
}

export default function ContractsPage() {
    const { contracts: contractsList, statusCounts, activeTab, totalCount } = useLoaderData<typeof loader>();
    useUrlToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const tabs = [
        { id: "active", label: "Active", count: statusCounts.active },
        { id: "closed", label: "Closed", count: statusCounts.closed },
    ];

    const columns: Column<typeof contractsList[0]>[] = [
        { key: "id", label: "ID", sortable: true },
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
            render: (contract) => contract.totalAmount ? `${contract.totalAmount} ฿` : "-"
        },
        {
            key: "status",
            label: "Status",
            sortable: true,
            render: (contract) => <StatusBadge variant={contract.status === "active" ? "success" : "neutral"}>{contract.status}</StatusBadge>
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
                    <Link to={`/contracts/${contract.id}/edit`}>
                        <Button variant="outline" size="sm">{contract.status === "closed" ? "View/Edit" : "Edit"}</Button>
                    </Link>
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
                emptyTitle="No contracts found"
                emptyDescription={`No contracts with status "${activeTab}"`}
                emptyIcon={<ClipboardDocumentListIcon className="w-10 h-10" />}
            />

            <Outlet />
        </div>
    );
}
