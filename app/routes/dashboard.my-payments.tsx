import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "~/db/schema";
import { CurrencyDollarIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import SimplePagination from "~/components/dashboard/SimplePagination";
import PageHeader from "~/components/dashboard/PageHeader";
import Card from "~/components/dashboard/Card";
import EmptyState from "~/components/dashboard/EmptyState";
import StatusBadge from "~/components/dashboard/StatusBadge";

const ITEMS_PER_PAGE = 20;

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const status = url.searchParams.get("status") || "all";
    
    const offset = (page - 1) * ITEMS_PER_PAGE;

    // Build where conditions
    const conditions = [
        sql`${schema.contracts.clientId} = ${user.id}`
    ];

    if (status !== "all") {
        conditions.push(sql`${schema.payments.status} = ${status}`);
    }

    // Get total count
    const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.payments)
        .innerJoin(schema.contracts, eq(schema.payments.contractId, schema.contracts.id))
        .where(and(...conditions));

    const totalItems = countResult?.count || 0;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // Get payments
    const payments = await db
        .select({
            id: schema.payments.id,
            amount: schema.payments.amount,
            currency: schema.payments.currency,
            paymentMethod: schema.payments.paymentMethod,
            status: schema.payments.status,
            notes: schema.payments.notes,
            createdAt: schema.payments.createdAt,
            contractId: schema.contracts.id,
            paymentTypeName: schema.paymentTypes.name,
            paymentTypeSign: schema.paymentTypes.sign,
            carLicensePlate: schema.companyCars.licensePlate,
            brandName: schema.carBrands.name,
            modelName: schema.carModels.name,
        })
        .from(schema.payments)
        .innerJoin(schema.contracts, eq(schema.payments.contractId, schema.contracts.id))
        .innerJoin(schema.paymentTypes, eq(schema.payments.paymentTypeId, schema.paymentTypes.id))
        .innerJoin(schema.companyCars, eq(schema.contracts.companyCarId, schema.companyCars.id))
        .leftJoin(schema.carTemplates, eq(schema.companyCars.templateId, schema.carTemplates.id))
        .leftJoin(schema.carBrands, eq(schema.carTemplates.brandId, schema.carBrands.id))
        .leftJoin(schema.carModels, eq(schema.carTemplates.modelId, schema.carModels.id))
        .where(and(...conditions))
        .orderBy(desc(schema.payments.createdAt))
        .limit(ITEMS_PER_PAGE)
        .offset(offset);

    return { payments, totalPages, currentPage: page, status };
}

export default function MyPayments() {
    const { payments, totalPages, currentPage, status } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();

    const handleStatusChange = (newStatus: string) => {
        setSearchParams({ status: newStatus, page: "1" });
    };

    const getStatusVariant = (status: string) => {
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
                        <button
                            onClick={() => handleStatusChange("all")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                status === "all"
                                    ? "bg-gray-800 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => handleStatusChange("completed")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                status === "completed"
                                    ? "bg-gray-800 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            Completed
                        </button>
                        <button
                            onClick={() => handleStatusChange("pending")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                status === "pending"
                                    ? "bg-gray-800 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            Pending
                        </button>
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
