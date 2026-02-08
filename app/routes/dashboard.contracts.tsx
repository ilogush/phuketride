import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { contracts, companyCars } from "~/db/schema";
import PageHeader from "~/components/ui/PageHeader";
import Tabs from "~/components/ui/Tabs";
import DataTable, { type Column } from "~/components/ui/DataTable";
import StatusBadge from "~/components/ui/StatusBadge";
import Button from "~/components/ui/Button";
import { ClipboardDocumentListIcon, PlusIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);

    let contractsList: any[] = [];
    let statusCounts = { all: 0, draft: 0, active: 0, completed: 0, cancelled: 0 };

    try {
        const contractsQuery = user.role === "admin"
            ? db.select({
                id: contracts.id,
                startDate: contracts.startDate,
                endDate: contracts.endDate,
                totalAmount: contracts.totalAmount,
                status: contracts.status,
            }).from(contracts).limit(50)
            : db.select({
                id: contracts.id,
                startDate: contracts.startDate,
                endDate: contracts.endDate,
                totalAmount: contracts.totalAmount,
                status: contracts.status,
            }).from(contracts)
                .innerJoin(companyCars, eq(contracts.companyCarId, companyCars.id))
                .where(eq(companyCars.companyId, user.companyId!))
                .limit(50);

        contractsList = await contractsQuery;

        statusCounts.all = contractsList.length;
        statusCounts.draft = contractsList.filter(c => c.status === "draft").length;
        statusCounts.active = contractsList.filter(c => c.status === "active").length;
        statusCounts.completed = contractsList.filter(c => c.status === "completed").length;
        statusCounts.cancelled = contractsList.filter(c => c.status === "cancelled").length;
    } catch (error) {
        console.error("Error loading contracts:", error);
    }

    return { user, contracts: contractsList, statusCounts };
}

export default function ContractsPage() {
    const { contracts: contractsList, statusCounts } = useLoaderData<typeof loader>();
    const [activeTab, setActiveTab] = useState<string>("draft");

    const tabs = [
        { id: "draft", label: "Draft", count: statusCounts.draft },
        { id: "active", label: "Active", count: statusCounts.active },
        { id: "completed", label: "Completed", count: statusCounts.completed },
        { id: "cancelled", label: "Cancelled", count: statusCounts.cancelled },
    ];

    const filteredContracts = contractsList.filter(contract => contract.status === activeTab);

    const columns: Column<typeof contractsList[0]>[] = [
        { key: "id", label: "ID" },
        {
            key: "startDate",
            label: "Start Date",
            render: (contract) => contract.startDate ? format(new Date(contract.startDate), "dd MMM yyyy") : "-"
        },
        {
            key: "endDate",
            label: "End Date",
            render: (contract) => contract.endDate ? format(new Date(contract.endDate), "dd MMM yyyy") : "-"
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
                    <Link to={`/contracts/${contract.id}/edit`}>
                        <Button variant="secondary" size="sm">Edit</Button>
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
                    <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                        New Contract
                    </Button>
                }
            />

            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            <DataTable
                data={filteredContracts}
                columns={columns}
                totalCount={filteredContracts.length}
                emptyTitle="No contracts found"
                emptyDescription={`No contracts with status "${activeTab}"`}
                emptyIcon={<ClipboardDocumentListIcon className="w-16 h-16" />}
            />
        </div>
    );
}
