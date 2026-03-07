import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import { PlusIcon, BookmarkIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import SimplePagination from "~/components/dashboard/SimplePagination";
import StatusBadge from "~/components/dashboard/StatusBadge";
import { formatContactPhone } from "~/lib/phone";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { parseListFilters } from "~/lib/query-filters.server";
import { useUrlToast } from "~/lib/useUrlToast";
import { trackServerOperation } from "~/lib/telemetry.server";
import { getScopedDb } from "~/lib/db-factory.server";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const BOOKING_STATUSES = ["all", "pending", "confirmed", "converted", "cancelled"] as const;
type BookingStatusFilter = typeof BOOKING_STATUSES[number];

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);

    const url = new URL(request.url);
    const { page, pageSize, offset } = getPaginationFromUrl(url);
    const { status, search, sortBy, sortOrder } = parseListFilters(url, {
        statuses: BOOKING_STATUSES,
        defaultStatus: "all",
    });
    const selectedStatus: BookingStatusFilter = status ?? "all";

    return trackServerOperation({
        event: "bookings.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "bookings", status: selectedStatus, search },
        run: async () => {
            const [totalItems, bookings] = await Promise.all([
                sdb.bookings.count({
                    status: selectedStatus,
                    search,
                }),
                sdb.bookings.list({
                    status: selectedStatus,
                    pageSize,
                    offset,
                    search,
                    sortBy: sortBy || "createdAt",
                    sortOrder: sortOrder || "desc",
                }),
            ]);
            const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

            return { bookings, totalPages, currentPage: page, status: selectedStatus, search };
        },
    });
}

export default function BookingsPage() {
    useUrlToast();
    const { bookings, totalPages, currentPage, status, search } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();

    const handleStatusChange = (newStatus: string) => {
        setSearchParams({ status: newStatus, page: "1", search: search || "" });
    };

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const q = formData.get("search") as string;
        setSearchParams({ status, page: "1", search: q });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bookings Management"
                rightActions={
                    <Link to="/bookings/create">
                        <Button variant="solid">
                            <PlusIcon className="w-5 h-5 mr-2" />
                            New Booking
                        </Button>
                    </Link>
                }
            />

            {/* Filters & Search */}
            <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                        <FunnelIcon className="h-5 w-5 text-gray-400 shrink-0" />
                        {BOOKING_STATUSES.map((s) => (
                            <Button
                                key={s}
                                type="button"
                                variant="plain"
                                onClick={() => handleStatusChange(s)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${status === s ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                            >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </Button>
                        ))}
                    </div>

                    <form onSubmit={handleSearch} className="relative flex-1 md:max-w-sm">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            name="search"
                            defaultValue={search || ""}
                            placeholder="Search by ID, name, phone..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all text-sm"
                        />
                    </form>
                </div>
            </div>

            {/* Bookings List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {bookings.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                        {bookings.map((booking) => (
                            <Link
                                key={booking.id}
                                to={`/bookings/${booking.id}`}
                                className="block p-6 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-gray-900">
                                                {booking.brandName} {booking.modelName} {booking.carYear}
                                            </h3>
                                            <StatusBadge variant={booking.status as any}>
                                                {booking.status}
                                            </StatusBadge>
                                            {booking.depositPaid && (
                                                <StatusBadge variant="success">
                                                    Deposit Paid
                                                </StatusBadge>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-600">
                                                Client: {booking.clientName} {booking.clientSurname}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Phone: {formatContactPhone(booking.clientPhone)} {booking.clientEmail && `• ${booking.clientEmail}`}
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
