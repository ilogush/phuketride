import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { payments, contracts, companyCars } from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
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
    const [activeTab, setActiveTab] = useState<string>("completed");

    const tabs = [
        { id: "completed", label: "Completed", count: statusCounts.completed },
        { id: "pending", label: "Pending", count: statusCounts.pending },
        { id: "cancelled", label: "Cancelled", count: statusCounts.cancelled },
    ];

    const filteredPayments = paymentsList.filter(payment => payment.status === activeTab);

    const columns: Column<typeof paymentsList[0]>[] = [
        { 
            key: "id", 
            label: "ID",
            render: (payment) => (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none">
                    {String(payment.id).padStart(4, '0')}
                </span>
            )
        },
        {
            key: "createdAt",
            label: "Date",
            render: (payment) => payment.createdAt ? format(new Date(payment.createdAt), "dd MMM yyyy") : "-"
        },
        {
            key: "contract",
            label: "Contract",
            render: (payment) => `#${payment.id}` // TODO: add actual contract ID
        },
        {
            key: "type",
            label: "Type",
            render: (payment) => "-" // TODO: add payment type name
        },
        {
            key: "paymentMethod",
            label: "Method",
            render: (payment) => {
                const methodMap: Record<string, string> = {
                    cash: "Cash",
                    card: "Card",
                    bank_transfer: "Bank Transfer",
                    online: "Online"
                };
                return methodMap[payment.paymentMethod || ""] || payment.paymentMethod || "-";
            }
        },
        {
            key: "status",
            label: "Status",
            render: (payment) => <StatusBadge variant={payment.status === "completed" ? "success" : "warning"}>{payment.status}</StatusBadge>
        },
        {
            key: "createdBy",
            label: "Created By",
            render: (payment) => "-" // TODO: add user name
        },
        {
            key: "amount",
            label: "Amount",
            render: (payment) => (
                <span className="font-medium text-gray-900">
                    {payment.amount} {payment.currency || "THB"}
                </span>
            )
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Payments"
                rightActions={
                    <Link to="/payments/create">
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                            Record
                        </Button>
                    </Link>
                }
            />

            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as string)} />

            <DataTable
                data={filteredPayments}
                columns={columns}
                totalCount={filteredPayments.length}
                emptyTitle="No payments found"
                emptyDescription={`No payments with status "${activeTab}"`}
                emptyIcon={<BanknotesIcon className="w-16 h-16" />}
            />
        </div>
    );
}
