import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { payments, contracts, companyCars } from "~/db/schema";
import PageHeader from "~/components/ui/PageHeader";
import Tabs from "~/components/ui/Tabs";
import DataTable, { type Column } from "~/components/ui/DataTable";
import StatusBadge from "~/components/ui/StatusBadge";
import Button from "~/components/ui/Button";
import { BanknotesIcon, PlusIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);

    let paymentsList: any[] = [];
    let statusCounts = { all: 0, pending: 0, completed: 0, cancelled: 0 };

    try {
        const paymentsQuery = user.role === "admin"
            ? db.select({
                id: payments.id,
                amount: payments.amount,
                currency: payments.currency,
                paymentMethod: payments.paymentMethod,
                status: payments.status,
                createdAt: payments.createdAt,
            }).from(payments).limit(50)
            : db.select({
                id: payments.id,
                amount: payments.amount,
                currency: payments.currency,
                paymentMethod: payments.paymentMethod,
                status: payments.status,
                createdAt: payments.createdAt,
            }).from(payments)
                .innerJoin(contracts, eq(payments.contractId, contracts.id))
                .innerJoin(companyCars, eq(contracts.companyCarId, companyCars.id))
                .where(eq(companyCars.companyId, user.companyId!))
                .limit(50);

        paymentsList = await paymentsQuery;

        statusCounts.all = paymentsList.length;
        statusCounts.pending = paymentsList.filter(p => p.status === "pending").length;
        statusCounts.completed = paymentsList.filter(p => p.status === "completed").length;
        statusCounts.cancelled = paymentsList.filter(p => p.status === "cancelled").length;
    } catch (error) {
        console.error("Error loading payments:", error);
    }

    return { user, payments: paymentsList, statusCounts };
}

export default function PaymentsPage() {
    const { payments: paymentsList, statusCounts } = useLoaderData<typeof loader>();
    const [activeTab, setActiveTab] = useState<string>("all");

    const tabs = [
        { id: "all", label: "All", count: statusCounts.all },
        { id: "pending", label: "Pending", count: statusCounts.pending },
        { id: "completed", label: "Completed", count: statusCounts.completed },
        { id: "cancelled", label: "Cancelled", count: statusCounts.cancelled },
    ];

    const filteredPayments = activeTab === "all"
        ? paymentsList
        : paymentsList.filter(payment => payment.status === activeTab);

    const columns: Column<typeof paymentsList[0]>[] = [
        { key: "id", label: "ID" },
        {
            key: "amount",
            label: "Amount",
            render: (payment) => `${payment.amount} ${payment.currency || "THB"}`
        },
        {
            key: "paymentMethod",
            label: "Method",
            render: (payment) => payment.paymentMethod || "-"
        },
        {
            key: "createdAt",
            label: "Date",
            render: (payment) => payment.createdAt ? format(new Date(payment.createdAt), "dd MMM yyyy") : "-"
        },
        {
            key: "status",
            label: "Status",
            render: (payment) => <StatusBadge variant={payment.status === "completed" ? "success" : "warning"}>{payment.status}</StatusBadge>
        },
        {
            key: "actions",
            label: "Actions",
            render: (payment) => (
                <div className="flex gap-2">
                    <Link to={`/dashboard/payments/${payment.id}`}>
                        <Button variant="secondary" size="sm">View</Button>
                    </Link>
                    <Link to={`/dashboard/payments/${payment.id}/edit`}>
                        <Button variant="secondary" size="sm">Edit</Button>
                    </Link>
                </div>
            )
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Payments"
                rightActions={
                    <>
                        <Button variant="secondary">Export</Button>
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                            Record Payment
                        </Button>
                    </>
                }
            />

            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            <DataTable
                data={filteredPayments}
                columns={columns}
                totalCount={filteredPayments.length}
                emptyTitle="No payments found"
                emptyDescription={activeTab === "all" ? "Payment records will appear here" : `No payments with status "${activeTab}"`}
                emptyIcon={<BanknotesIcon className="w-16 h-16" />}
            />
        </div>
    );
}
