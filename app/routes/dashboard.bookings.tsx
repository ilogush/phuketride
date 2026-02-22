import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import { PlusIcon, BookmarkIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import SimplePagination from "~/components/dashboard/SimplePagination";

const ITEMS_PER_PAGE = 20;

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    
    if (!user.companyId) {
        throw new Response("Manager must be assigned to a company", { status: 403 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const status = url.searchParams.get("status") || "all";
    
    const offset = (page - 1) * ITEMS_PER_PAGE;

    const whereSql = status === "all"
        ? "WHERE cc.company_id = ?"
        : "WHERE cc.company_id = ? AND b.status = ?";
    const countSql = `
        SELECT COUNT(*) AS count
        FROM bookings b
        JOIN company_cars cc ON cc.id = b.company_car_id
        ${whereSql}
    `;
    const countResult = status === "all"
        ? await context.cloudflare.env.DB.prepare(countSql).bind(user.companyId).first<any>()
        : await context.cloudflare.env.DB.prepare(countSql).bind(user.companyId, status).first<any>();
    const totalItems = Number(countResult?.count || 0);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    const bookingsSql = `
        SELECT
            b.id,
            b.start_date AS startDate,
            b.end_date AS endDate,
            b.estimated_amount AS estimatedAmount,
            b.currency,
            b.deposit_amount AS depositAmount,
            b.deposit_paid AS depositPaid,
            b.status,
            b.created_at AS createdAt,
            b.client_name AS clientName,
            b.client_surname AS clientSurname,
            b.client_phone AS clientPhone,
            b.client_email AS clientEmail,
            cc.license_plate AS carLicensePlate,
            cc.year AS carYear,
            cb.name AS brandName,
            cm.name AS modelName
        FROM bookings b
        JOIN company_cars cc ON cc.id = b.company_car_id
        LEFT JOIN car_templates ct ON ct.id = cc.template_id
        LEFT JOIN car_brands cb ON cb.id = ct.brand_id
        LEFT JOIN car_models cm ON cm.id = ct.model_id
        ${whereSql}
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
    `;
    const bookingsResult = status === "all"
        ? await context.cloudflare.env.DB.prepare(bookingsSql).bind(user.companyId, ITEMS_PER_PAGE, offset).all()
        : await context.cloudflare.env.DB.prepare(bookingsSql).bind(user.companyId, status, ITEMS_PER_PAGE, offset).all();
    const bookings = (bookingsResult as any).results || [];

    return { bookings, totalPages, currentPage: page, status };
}

export default function BookingsPage() {
    const { bookings, totalPages, currentPage, status } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();

    const handleStatusChange = (newStatus: string) => {
        setSearchParams({ status: newStatus, page: "1" });
    };

    const statusColors = {
        pending: "bg-yellow-100 text-yellow-800",
        confirmed: "bg-blue-100 text-blue-800",
        converted: "bg-green-100 text-green-800",
        cancelled: "bg-red-100 text-red-800",
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bookings Management"
                rightActions={
                    <Link to="/dashboard/bookings/create">
                        <Button variant="primary">
                            <PlusIcon className="w-5 h-5 mr-2" />
                            New Booking
                        </Button>
                    </Link>
                }
            />

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
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
                            onClick={() => handleStatusChange("pending")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === "pending" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            Pending
                        </Button>
                        <Button
                            type="button"
                            variant="unstyled"
                            onClick={() => handleStatusChange("confirmed")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === "confirmed" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            Confirmed
                        </Button>
                        <Button
                            type="button"
                            variant="unstyled"
                            onClick={() => handleStatusChange("converted")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === "converted" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            Converted
                        </Button>
                    </div>
                </div>
            </div>

            {/* Bookings List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {bookings.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                        {bookings.map((booking) => (
                            <Link
                                key={booking.id}
                                to={`/dashboard/bookings/${booking.id}`}
                                className="block p-6 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-gray-900">
                                                {booking.brandName} {booking.modelName} {booking.carYear}
                                            </h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[booking.status as keyof typeof statusColors]}`}>
                                                {booking.status}
                                            </span>
                                            {booking.depositPaid && (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Deposit Paid
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-600">
                                                Client: {booking.clientName} {booking.clientSurname}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Phone: {booking.clientPhone} {booking.clientEmail && `• ${booking.clientEmail}`}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Car: {booking.carLicensePlate}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {format(new Date(booking.startDate), "MMM dd, yyyy")} -{" "}
                                                {format(new Date(booking.endDate), "MMM dd, yyyy")}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                Booked on {format(new Date(booking.createdAt), "MMM dd, yyyy")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-gray-900">
                                            {booking.currency} {booking.estimatedAmount.toFixed(2)}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">Estimated</p>
                                        {(booking.depositAmount ?? 0) > 0 && (
                                            <p className="text-sm text-gray-600 mt-2">
                                                Deposit: {booking.currency} {(booking.depositAmount ?? 0).toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <BookmarkIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No bookings found</p>
                        <p className="text-sm text-gray-400 mt-1">
                            All bookings will appear here
                        </p>
                    </div>
                )}
            </div>

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
