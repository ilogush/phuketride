import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { CurrencyDollarIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import SimplePagination from "~/components/dashboard/SimplePagination";
import PageHeader from "~/components/dashboard/PageHeader";
import Card from "~/components/dashboard/Card";
import EmptyState from "~/components/dashboard/EmptyState";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";

const ITEMS_PER_PAGE = 20;

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const status = url.searchParams.get("status") || "all";
    
    const offset = (page - 1) * ITEMS_PER_PAGE;

    const whereSql = status === "all"
        ? "WHERE c.client_id = ?"
        : "WHERE c.client_id = ? AND p.status = ?";
    const countSql = `
        SELECT COUNT(*) AS count
        FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        ${whereSql}
    `;
    const countResult = status === "all"
        ? await context.cloudflare.env.DB.prepare(countSql).bind(user.id).first<any>()
        : await context.cloudflare.env.DB.prepare(countSql).bind(user.id, status).first<any>();

    const totalItems = Number(countResult?.count || 0);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    const paymentsSql = `
        SELECT
            p.id,
            p.amount,
            p.currency,
            p.payment_method AS paymentMethod,
            p.status,
            p.notes,
            p.created_at AS createdAt,
            c.id AS contractId,
            pt.name AS paymentTypeName,
            pt.sign AS paymentTypeSign,
            cc.license_plate AS carLicensePlate,
            cb.name AS brandName,
            cm.name AS modelName
        FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        JOIN payment_types pt ON pt.id = p.payment_type_id
        JOIN company_cars cc ON cc.id = c.company_car_id
        LEFT JOIN car_templates ct ON ct.id = cc.template_id
        LEFT JOIN car_brands cb ON cb.id = ct.brand_id
        LEFT JOIN car_models cm ON cm.id = ct.model_id
        ${whereSql}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    `;
    const paymentsResult = status === "all"
        ? await context.cloudflare.env.DB.prepare(paymentsSql).bind(user.id, ITEMS_PER_PAGE, offset).all()
        : await context.cloudflare.env.DB.prepare(paymentsSql).bind(user.id, status, ITEMS_PER_PAGE, offset).all();
    const payments = (paymentsResult as any).results || [];

    return { payments, totalPages, currentPage: page, status };
}

export default function MyPayments() {
    const { payments, totalPages, currentPage, status } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();

    const handleStatusChange = (newStatus: string) => {
        setSearchParams({ status: newStatus, page: "1" });
    };

    const getStatusVariant = (status: string | null) => {
        switch (status) {
            case "completed": return "success";
            case "pending": return "warning";
            case "cancelled": return "error";
            default: return "neutral";
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Payment History" subtitle="View all your rental payments" />

            {/* Filters */}
            <Card padding="md" className="shadow-sm">
                <div className="flex items-center gap-4">
                    <FunnelIcon className="h-5 w-5 text-gray-400" />
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="unstyled"
                            onClick={() => handleStatusChange("all")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            All
                        </Button>
                        <Button
                            type="button"
                            variant="unstyled"
                            onClick={() => handleStatusChange("completed")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === "completed" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            Completed
                        </Button>
                        <Button
                            type="button"
                            variant="unstyled"
                            onClick={() => handleStatusChange("pending")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === "pending" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            Pending
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Payments List */}
            <Card className="shadow-sm overflow-hidden">
                {payments.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                        {payments.map((payment) => (
                            <div key={payment.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                                            <h3 className="font-semibold text-gray-900">
                                                {payment.paymentTypeName}
                                            </h3>
                                            <StatusBadge variant={getStatusVariant(payment.status)}>
                                                {payment.status}
                                            </StatusBadge>
                                        </div>
                                        <div className="ml-8 space-y-1">
                                            <p className="text-sm text-gray-600">
                                                {payment.brandName} {payment.modelName} ({payment.carLicensePlate})
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {format(new Date(payment.createdAt), "MMM dd, yyyy HH:mm")}
                                            </p>
                                            {payment.paymentMethod && (
                                                <p className="text-sm text-gray-500">
                                                    Method: {payment.paymentMethod}
                                                </p>
                                            )}
                                            <Link
                                                to={`/dashboard/my-bookings`}
                                                className="text-sm text-blue-600 hover:text-blue-700"
                                            >
                                                View Booking →
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-2xl font-bold ${payment.paymentTypeSign === '+' ? 'text-green-600' : 'text-red-600'}`}>
                                            {payment.paymentTypeSign}{payment.currency} {payment.amount}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={<CurrencyDollarIcon className="h-12 w-12" />}
                        title="No payments found"
                    />
                )}
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <SimplePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setSearchParams({ status, page: page.toString() })}
                />
            )}
        </div>
    );
}
