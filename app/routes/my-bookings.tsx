import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { PlusIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import Button from "~/components/dashboard/Button";
import SimplePagination from "~/components/dashboard/SimplePagination";
import { trackServerOperation } from "~/lib/telemetry.server";
import { loadClientRentalHistoryPage } from "~/lib/user-self-service.server";
import { useUrlToast } from "~/lib/useUrlToast";
import { requireSelfProfileAccess } from "~/lib/access-policy.server";

export const meta: MetaFunction = () => [
    { title: "My Bookings | Phuket Ride" },
    { name: "robots", content: "noindex, nofollow" },
];

interface MyBookingRow {
    id: number;
    startDate: string;
    endDate: string;
    totalAmount: number;
    totalCurrency: string;
    status: "active" | "closed";
    createdAt: string;
    carLicensePlate: string;
    carYear: number;
    brandName: string | null;
    modelName: string | null;
    colorName: string | null;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user } = await requireSelfProfileAccess(request);
    const url = new URL(request.url);

    return trackServerOperation({
        event: "my-bookings.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: user.companyId ?? null,
        details: { route: "my-bookings" },
        run: async () => {
            const { rows, totalPages, currentPage, status } = await loadClientRentalHistoryPage({
                db: context.cloudflare.env.DB,
                userId: user.id,
                url,
                includeColor: true,
            });
            return {
                bookings: rows as MyBookingRow[],
                totalPages,
                currentPage,
                status,
            };
        },
    });
}

export default function MyBookingsPage() {
    useUrlToast();
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
                <Link to="/bookings/create">
                    <Button variant="solid">
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
                            variant="plain"
                            onClick={() => handleStatusChange("all")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            All
                        </Button>
                        <Button
                            type="button"
                            variant="plain"
                            onClick={() => handleStatusChange("closed")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === "closed" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            Closed
                        </Button>
                        <Button
                            type="button"
                            variant="plain"
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
                        {bookings.map((booking: MyBookingRow) => (
                            <Link
                                key={booking.id}
                                to={`/my-contracts/${booking.id}`}
                                className="block p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="font-semibold text-gray-900">
                                                {booking.brandName} {booking.modelName} {booking.carYear}
                                            </h2>
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
                        <Link to="/bookings/create" className="mt-4 inline-block">
                            <Button variant="solid">
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
