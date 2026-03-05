import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams, Outlet } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { ClipboardDocumentListIcon, PlusIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { useUrlToast } from "~/lib/useUrlToast";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { parseListFilters } from "~/lib/query-filters.server";
import { listContractsPage } from "~/lib/contracts-repo.server";
import type { ContractListRow } from "~/lib/db-types";
const CONTRACT_TABS = ["active", "closed"] as const;
type ContractTab = typeof CONTRACT_TABS[number];

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const effectiveCompanyId = getEffectiveCompanyId(request, user);
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

    let contractsList: ContractListRow[] = [];
    let statusCounts = { all: 0, active: 0, closed: 0 };
    let totalCount = 0;

    try {
        contractsList = await listContractsPage({
            db: context.cloudflare.env.DB,
            companyId: effectiveCompanyId,
            status: activeTab,
            pageSize,
            offset,
            search,
            sortBy: sortBy || "createdAt",
            sortOrder,
        });

        const countsResult = effectiveCompanyId
            ? await context.cloudflare.env.DB
                .prepare(`
                    SELECT c.status AS status, COUNT(*) AS count
                    FROM contracts c
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ?
                    GROUP BY c.status
                `)
                .bind(effectiveCompanyId)
                .all() as { results?: Array<{ status: string; count: number | string }> }
            : await context.cloudflare.env.DB
                .prepare(`
                    SELECT status, COUNT(*) AS count
                    FROM contracts
                    GROUP BY status
                `)
                .all() as { results?: Array<{ status: string; count: number | string }> };

        for (const row of countsResult.results || []) {
            const count = Number(row.count || 0);
            statusCounts.all += count;
            if (row.status === "active") statusCounts.active = count;
            if (row.status === "closed") statusCounts.closed = count;
        }
        if (search) {
            const countSql = effectiveCompanyId
                ? `
                    SELECT COUNT(*) AS count
                    FROM contracts c
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ? AND c.status = ?
                    AND (CAST(c.id AS TEXT) LIKE ? OR CAST(c.start_date AS TEXT) LIKE ? OR CAST(c.end_date AS TEXT) LIKE ? OR CAST(c.total_amount AS TEXT) LIKE ?)
                `
                : `
                    SELECT COUNT(*) AS count
                    FROM contracts c
                    WHERE c.status = ?
                    AND (CAST(c.id AS TEXT) LIKE ? OR CAST(c.start_date AS TEXT) LIKE ? OR CAST(c.end_date AS TEXT) LIKE ? OR CAST(c.total_amount AS TEXT) LIKE ?)
                `;
            const q = `%${search}%`;
            const countResult = effectiveCompanyId
                ? await context.cloudflare.env.DB.prepare(countSql).bind(effectiveCompanyId, activeTab, q, q, q, q).first() as { count?: number | string } | null
                : await context.cloudflare.env.DB.prepare(countSql).bind(activeTab, q, q, q, q).first() as { count?: number | string } | null;
            totalCount = Number(countResult?.count || 0);
        } else {
            totalCount = activeTab === "closed" ? statusCounts.closed : statusCounts.active;
        }
    } catch {
        contractsList = [];
    }

    return { user, contracts: contractsList, statusCounts, activeTab, totalCount, search };
}

export default function ContractsPage() {
    const { contracts: contractsList, statusCounts, activeTab, totalCount, search } = useLoaderData<typeof loader>();
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
                            <Button variant="primary" size="sm">Close</Button>
                        </Link>
                    )}
                    <Link to={`/contracts/${contract.id}/edit`}>
                        <Button variant="secondary" size="sm">{contract.status === "closed" ? "View/Edit" : "Edit"}</Button>
                    </Link>
                </div>
            )
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Contracts"
                withSearch
                searchValue={search}
                searchPlaceholder="Search contracts"
                onSearchChange={(value) => {
                    const next = new URLSearchParams(searchParams);
                    if (value.trim()) next.set("search", value.trim());
                    else next.delete("search");
                    next.set("page", "1");
                    setSearchParams(next);
                }}
                rightActions={
                    <Link to="/contracts/new">
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
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
