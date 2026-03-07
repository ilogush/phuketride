import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { requireScopedDashboardAccess } from "~/lib/access-policy.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { BanknotesIcon, PlusIcon } from "@heroicons/react/24/outline";
import { format, isValid } from "date-fns";
import { useUrlToast } from "~/lib/useUrlToast";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { parseListFilters } from "~/lib/query-filters.server";
import { countPaymentsPage, listPaymentsPage, listPaymentStatusCounts } from "~/lib/payments-repo.server";
import type { PaymentListRow } from "~/lib/db-types";
import { trackServerOperation } from "~/lib/telemetry.server";
const PAYMENT_TABS = ["completed", "pending", "cancelled"] as const;
type PaymentTab = typeof PAYMENT_TABS[number];

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId: effectiveCompanyId } = await requireScopedDashboardAccess(request, { allowAdminGlobal: true });
    const url = new URL(request.url);
    const { tab, search, sortBy, sortOrder } = parseListFilters(url, {
        tabs: PAYMENT_TABS,
        defaultTab: "completed",
        sortBy: ["createdAt", "id", "amount", "status"] as const,
        defaultSortBy: "createdAt",
        defaultSortOrder: "desc",
    });
    const activeTab: PaymentTab = tab ?? "completed";
    const { pageSize, offset } = getPaginationFromUrl(url, { defaultPageSize: 10 });

    return trackServerOperation({
        event: "payments.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: effectiveCompanyId,
        details: { route: "payments", tab: activeTab },
        run: async () => {
            let paymentsList: Array<PaymentListRow & {
        createdAt: string | null;
        paymentMethod: string | null;
        contract: { id: number } | null;
        paymentType: { name: string | null; sign: string | null } | null;
        currency: { code: string | null; symbol: string | null } | null;
        creator: { name: string | null; surname: string | null } | null;
    }> = [];
            let statusCounts = { all: 0, pending: 0, completed: 0, cancelled: 0 };
            let totalCount = 0;

            try {
                const [rawPayments, countsResult, countResult] = await Promise.all([
                    listPaymentsPage({
                        db: context.cloudflare.env.DB,
                        companyId: effectiveCompanyId,
                        status: activeTab,
                        pageSize,
                        offset,
                        search,
                        sortBy: sortBy || "createdAt",
                        sortOrder,
                    }),
                    listPaymentStatusCounts({
                        db: context.cloudflare.env.DB,
                        companyId: effectiveCompanyId,
                    }),
                    countPaymentsPage({
                        db: context.cloudflare.env.DB,
                        companyId: effectiveCompanyId,
                        status: activeTab,
                        search,
                    }),
                ]);
                paymentsList = rawPayments.map((p: PaymentListRow) => ({
            ...p,
            createdAt: p.created_at ?? p.createdAt ?? null,
            paymentMethod: p.payment_method ?? p.paymentMethod ?? null,
            contract: p.contractId ? { id: p.contractId } : null,
            paymentType: p.paymentTypeName ? { name: p.paymentTypeName, sign: p.paymentTypeSign ?? null } : null,
            currency: p.currencyCode ? { code: p.currencyCode, symbol: p.currencySymbol ?? null } : null,
            creator: p.creatorName || p.creatorSurname ? { name: p.creatorName ?? null, surname: p.creatorSurname ?? null } : null,
        }));

                for (const row of countsResult) {
                    const count = Number(row.count || 0);
                    statusCounts.all += count;
                    if (row.status === "pending") statusCounts.pending = count;
                    if (row.status === "completed") statusCounts.completed = count;
                    if (row.status === "cancelled") statusCounts.cancelled = count;
                }
                totalCount = countResult;
            } catch {
                paymentsList = [];
            }

            return { user, payments: paymentsList, statusCounts, activeTab, totalCount, search };
        },
    });
}

export default function PaymentsPage() {
    const { payments: paymentsList, statusCounts, activeTab, totalCount } = useLoaderData<typeof loader>();
    useUrlToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const tabs = [
        { id: "completed", label: "Completed", count: statusCounts.completed },
        { id: "pending", label: "Pending", count: statusCounts.pending },
        { id: "cancelled", label: "Cancelled", count: statusCounts.cancelled },
    ];

    const columns: Column<typeof paymentsList[0]>[] = [
        {
            key: "id",
            label: "ID",
            sortable: true,
            render: (payment) => (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none">
                    {String(payment.id).padStart(3, '0')}
                </span>
            )
        },
        {
            key: "createdAt",
            label: "Date",
            sortable: true,
            render: (payment) => {
                if (!payment.createdAt) return "-";
                const createdAt = new Date(payment.createdAt);
                return isValid(createdAt) ? format(createdAt, "dd MMM yyyy") : "-";
            }
        },
        {
            key: "contract",
            label: "Contract",
            render: (payment) => payment.contract ? `#${String(payment.contract.id).padStart(3, '0')}` : "-"
        },
        {
            key: "type",
            label: "Type",
            render: (payment) => {
                if (!payment.paymentType) return "-";
                const sign = payment.paymentType.sign === "+" ? "+" : "-";
                return (
                    <span className="text-gray-500">
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
            sortable: true,
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
            sortable: true,
            render: (payment) => {
                const currencySymbol = payment.currency?.symbol || "฿";
                const currencyCode = payment.currency?.code || "THB";
                const isThb = currencyCode.toUpperCase() === "THB";
                return (
                    <span className="font-medium text-gray-900">
                        {isThb ? `${currencySymbol}${payment.amount}` : `${payment.amount} ${currencyCode}`}
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

            <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(id) => {
                    const next = new URLSearchParams(searchParams);
                    next.set("tab", String(id));
                    next.set("page", "1");
                    setSearchParams(next);
                }}
            />

            <DataTable
                data={paymentsList}
                columns={columns}
                totalCount={totalCount}
                serverPagination
                emptyTitle="No payments found"
                emptyDescription={`No payments with status "${activeTab}"`}
                emptyIcon={<BanknotesIcon className="w-10 h-10" />}
            />
        </div>
    );
}
