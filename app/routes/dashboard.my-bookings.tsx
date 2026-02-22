import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { PlusIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import Button from "~/components/dashboard/Button";
import SimplePagination from "~/components/dashboard/SimplePagination";

const ITEMS_PER_PAGE = 20;

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const status = url.searchParams.get("status") || "all";
    
    const offset = (page - 1) * ITEMS_PER_PAGE;

    const whereSql = status === "all" ? "WHERE c.client_id = ?" : "WHERE c.client_id = ? AND c.status = ?";
    const countSql = `SELECT COUNT(*) AS count FROM contracts c ${whereSql}`;
    const countResult = status === "all"
        ? await context.cloudflare.env.DB.prepare(countSql).bind(user.id).first<any>()
        : await context.cloudflare.env.DB.prepare(countSql).bind(user.id, status).first<any>();

    const totalItems = Number(countResult?.count || 0);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    const bookingsSql = `
        SELECT
            c.id,
            c.start_date AS startDate,
            c.end_date AS endDate,
            c.total_amount AS totalAmount,
            c.total_currency AS totalCurrency,
            c.status,
            c.created_at AS createdAt,
            cc.license_plate AS carLicensePlate,
            cc.year AS carYear,
            cb.name AS brandName,
            cm.name AS modelName,
            cl.name AS colorName
        FROM contracts c
        JOIN company_cars cc ON cc.id = c.company_car_id
        LEFT JOIN car_templates ct ON ct.id = cc.template_id
        LEFT JOIN car_brands cb ON cb.id = ct.brand_id
        LEFT JOIN car_models cm ON cm.id = ct.model_id
        LEFT JOIN colors cl ON cl.id = cc.color_id
        ${whereSql}
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
    `;
    const bookingsResult = status === "all"
        ? await context.cloudflare.env.DB.prepare(bookingsSql).bind(user.id, ITEMS_PER_PAGE, offset).all()
        : await context.cloudflare.env.DB.prepare(bookingsSql).bind(user.id, status, ITEMS_PER_PAGE, offset).all();
    const bookings = (bookingsResult as any).results || [];

    return { bookings, totalPages, currentPage: page, status };
}

export default function MyBookingsPage() {
    const { bookings, totalPages, currentPage, status } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();

    const handleStatusChange = (newStatus: string) => {
        setSearchParams({ status: newStatus, page: "1" });
    };

    const statusColors = {
        active: "bg-blue-100 text-blue-800",
        closed: "bg-green-100 text-green-800",
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your car rentals</p>
                </div>
                <Link to="/dashboard/bookings/create">
                    <Button variant="primary">
                        <PlusIcon className="h-5 w-5 mr-2" />
                        New Booking
                    </Button>
                </Link>
            </div>

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
                            onClick={() => handleStatusChange("closed")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === "closed" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            Closed
                        </Button>
                        <Button
                            type="button"
                            variant="unstyled"
                            onClick={() => handleStatusChange("active")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === "active" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            Active
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
                                to={`/dashboard/my-contracts/${booking.id}`}
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
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-600">
                                                {booking.colorName} • {booking.carLicensePlate}
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
                                            {booking.totalCurrency} {booking.totalAmount}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">Total</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <p className="text-gray-500 font-medium">No bookings found</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Create your first booking to get started
                        </p>
                        <Link to="/dashboard/bookings/create" className="mt-4 inline-block">
                            <Button variant="primary">
                                <PlusIcon className="h-5 w-5 mr-2" />
                                New Booking
                            </Button>
                        </Link>
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
