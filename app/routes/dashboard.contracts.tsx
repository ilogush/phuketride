import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams, Outlet } from "react-router";
import { useState, useEffect } from "react";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { ClipboardDocumentListIcon, PlusIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { useToast } from "~/lib/toast";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const effectiveCompanyId = getEffectiveCompanyId(request, user);

    let contractsList: any[] = [];
    let statusCounts = { all: 0, active: 0, closed: 0 };

    try {
        if (effectiveCompanyId) {
            const result = await context.cloudflare.env.DB
                .prepare(`
                    SELECT c.*
                    FROM contracts c
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ?
                    ORDER BY c.created_at DESC
                    LIMIT 100
                `)
                .bind(effectiveCompanyId)
                .all() as { results?: any[] };
            contractsList = result.results || [];
        } else {
            const result = await context.cloudflare.env.DB
                .prepare("SELECT * FROM contracts ORDER BY created_at DESC LIMIT 50")
                .all() as { results?: any[] };
            contractsList = result.results || [];
        }

        statusCounts.all = contractsList.length;
        statusCounts.active = contractsList.filter(c => c.status === "active").length;
        statusCounts.closed = contractsList.filter(c => c.status === "closed").length;
    } catch {
        contractsList = [];
    }

    return { user, contracts: contractsList, statusCounts };
}

export default function ContractsPage() {
    const { contracts: contractsList, statusCounts } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<string>("active");

    // Toast notifications
    useEffect(() => {
        const success = searchParams.get("success");
        const error = searchParams.get("error");
        if (success) {
            toast.success(success);
        }
        if (error) {
            toast.error(error);
        }
    }, [searchParams, toast]);

    const tabs = [
        { id: "active", label: "Active", count: statusCounts.active },
        { id: "closed", label: "Closed", count: statusCounts.closed },
    ];

    const filteredContracts = contractsList.filter(contract => contract.status === activeTab);

    const columns: Column<typeof contractsList[0]>[] = [
        { key: "id", label: "ID" },
        {
            key: "startDate",
            label: "Start Date",
            render: (contract) => {
                if (!contract.startDate) return "-";
                const date = new Date(contract.startDate);
                return isNaN(date.getTime()) ? "-" : format(date, "dd MMM yyyy");
            }
        },
        {
            key: "endDate",
            label: "End Date",
            render: (contract) => {
                if (!contract.endDate) return "-";
                const date = new Date(contract.endDate);
                return isNaN(date.getTime()) ? "-" : format(date, "dd MMM yyyy");
            }
        },
        {
            key: "totalAmount",
            label: "Total Amount",
            render: (contract) => contract.totalAmount ? `${contract.totalAmount} THB` : "-"
        },
        {
            key: "status",
            label: "Status",
            render: (contract) => <StatusBadge variant={contract.status === "active" ? "success" : "neutral"}>{contract.status}</StatusBadge>
        },
        {
            key: "actions",
            label: "Actions",
            render: (contract) => (
                <div className="flex gap-2">
                    <Link to={`/contracts/${contract.id}`}>
                        <Button variant="secondary" size="sm">View</Button>
                    </Link>
                    {contract.status === "active" && (
                        <Link to={`/contracts/${contract.id}/close`}>
                            <Button variant="primary" size="sm">Close</Button>
                        </Link>
                    )}
                    {contract.status !== "closed" && (
                        <Link to={`/contracts/${contract.id}/edit`}>
                            <Button variant="secondary" size="sm">Edit</Button>
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
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                            New Contract
                        </Button>
                    </Link>
                }
            />

            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(tabId) => setActiveTab(String(tabId))} />

            <DataTable
                data={filteredContracts}
                columns={columns}
                totalCount={filteredContracts.length}
                emptyTitle="No contracts found"
                emptyDescription={`No contracts with status "${activeTab}"`}
                emptyIcon={<ClipboardDocumentListIcon className="w-10 h-10" />}
            />

            <Outlet />
        </div>
    );
}
