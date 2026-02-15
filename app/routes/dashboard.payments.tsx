import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { payments, contracts, companyCars } from "~/db/schema";
import { eq } from "drizzle-orm";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { BanknotesIcon, PlusIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { useToast } from "~/lib/toast";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    let paymentsList: any[] = [];
    let statusCounts = { all: 0, pending: 0, completed: 0, cancelled: 0 };

    try {
        if (user.role === "admin") {
            // Admin sees all payments with relations
            paymentsList = await db.query.payments.findMany({
                with: {
                    contract: {
                        columns: { id: true }
                    },
                    paymentType: {
                        columns: { name: true, sign: true }
                    },
                    currency: {
                        columns: { code: true, symbol: true }
                    },
                    creator: {
                        columns: { name: true, surname: true }
                    }
                },
                limit: 50,
                orderBy: (p, { desc }) => [desc(p.createdAt)]
            });
        } else {
            // Partner/Manager sees only their company's payments
            const allContracts = await db.query.contracts.findMany({
                with: {
                    companyCar: true,
                    payments: {
                        with: {
                            paymentType: true,
                            currency: true,
                            creator: true
                        }
                    }
                },
                limit: 100
            });

            // Filter contracts by company and flatten payments
            const companyContracts = allContracts.filter(
                c => c.companyCar.companyId === user.companyId
            );

            paymentsList = companyContracts.flatMap(c => 
                c.payments.map(p => ({
                    ...p,
                    contract: { id: c.id },
                    paymentType: p.paymentType,
                    currency: p.currency,
                    creator: p.creator
                }))
            ).slice(0, 50);
        }

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
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<string>("completed");

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
            render: (payment) => payment.contract ? `#${String(payment.contract.id).padStart(4, '0')}` : "-"
        },
        {
            key: "type",
            label: "Type",
            render: (payment) => {
                if (!payment.paymentType) return "-";
                const sign = payment.paymentType.sign === "+" ? "+" : "-";
                return (
                    <span className={payment.paymentType.sign === "+" ? "text-green-600" : "text-red-600"}>
                        {sign} {payment.paymentType.name}
                    </span>
                );
            }
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
            render: (payment) => {
                if (!payment.creator) return "-";
                return `${payment.creator.name || ""} ${payment.creator.surname || ""}`.trim() || "-";
            }
        },
        {
            key: "amount",
            label: "Amount",
            render: (payment) => {
                const currencySymbol = payment.currency?.symbol || "฿";
                const currencyCode = payment.currency?.code || payment.currency || "THB";
                return (
                    <span className="font-medium text-gray-900">
                        {currencySymbol}{payment.amount} {currencyCode}
                    </span>
                );
            }
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
                emptyIcon={<BanknotesIcon className="w-10 h-10" />}
            />
        </div>
    );
}
