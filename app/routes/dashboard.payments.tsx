import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { BanknotesIcon, PlusIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { useToast } from "~/lib/toast";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const effectiveCompanyId = getEffectiveCompanyId(request, user);

    let paymentsList: any[] = [];
    let statusCounts = { all: 0, pending: 0, completed: 0, cancelled: 0 };

    try {
        const sql = effectiveCompanyId
            ? `
                SELECT
                    p.*,
                    c.id AS contractId,
                    pt.name AS paymentTypeName,
                    pt.sign AS paymentTypeSign,
                    cur.code AS currencyCode,
                    cur.symbol AS currencySymbol,
                    u.name AS creatorName,
                    u.surname AS creatorSurname
                FROM payments p
                JOIN contracts c ON c.id = p.contract_id
                JOIN company_cars cc ON cc.id = c.company_car_id
                LEFT JOIN payment_types pt ON pt.id = p.payment_type_id
                LEFT JOIN currencies cur ON cur.code = p.currency
                LEFT JOIN users u ON u.id = p.created_by
                WHERE cc.company_id = ?
                ORDER BY p.created_at DESC
                LIMIT 50
            `
            : `
                SELECT
                    p.*,
                    c.id AS contractId,
                    pt.name AS paymentTypeName,
                    pt.sign AS paymentTypeSign,
                    cur.code AS currencyCode,
                    cur.symbol AS currencySymbol,
                    u.name AS creatorName,
                    u.surname AS creatorSurname
                FROM payments p
                LEFT JOIN contracts c ON c.id = p.contract_id
                LEFT JOIN payment_types pt ON pt.id = p.payment_type_id
                LEFT JOIN currencies cur ON cur.code = p.currency
                LEFT JOIN users u ON u.id = p.created_by
                ORDER BY p.created_at DESC
                LIMIT 50
            `;

        const query = context.cloudflare.env.DB.prepare(sql);
        const result = effectiveCompanyId
            ? await query.bind(effectiveCompanyId).all()
            : await query.all();
        paymentsList = ((result as any).results || []).map((p: any) => ({
            ...p,
            createdAt: p.created_at ?? p.createdAt,
            paymentMethod: p.payment_method ?? p.paymentMethod,
            contract: p.contractId ? { id: p.contractId } : null,
            paymentType: p.paymentTypeName ? { name: p.paymentTypeName, sign: p.paymentTypeSign } : null,
            currency: p.currencyCode ? { code: p.currencyCode, symbol: p.currencySymbol } : null,
            creator: p.creatorName || p.creatorSurname ? { name: p.creatorName, surname: p.creatorSurname } : null,
        }));

        statusCounts.all = paymentsList.length;
        statusCounts.pending = paymentsList.filter(p => p.status === "pending").length;
        statusCounts.completed = paymentsList.filter(p => p.status === "completed").length;
        statusCounts.cancelled = paymentsList.filter(p => p.status === "cancelled").length;
    } catch {
        paymentsList = [];
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
