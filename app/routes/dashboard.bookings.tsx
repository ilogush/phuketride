import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import { PlusIcon, BookmarkIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import SimplePagination from "~/components/dashboard/SimplePagination";

const ITEMS_PER_PAGE = 20;

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    
    if (!user.companyId) {
        throw new Response("Manager must be assigned to a company", { status: 403 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const status = url.searchParams.get("status") || "all";
    
    const offset = (page - 1) * ITEMS_PER_PAGE;

    // Get company cars for this manager's company
    const companyCarsIds = await db
        .select({ id: schema.companyCars.id })
        .from(schema.companyCars)
        .where(eq(schema.companyCars.companyId, user.companyId));

    const carIds = companyCarsIds.map(car => car.id);

    if (carIds.length === 0) {
        return { bookings: [], totalPages: 0, currentPage: page, status };
    }

    // Build where conditions
    const conditions = [sql`${schema.contracts.companyCarId} IN (${sql.join(carIds.map(id => sql`${id}`), sql`, `)})`];

    if (status !== "all") {
        conditions.push(sql`${schema.contracts.status} = ${status}`);
    }

    // Get total count
    const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.contracts)
        .where(and(...conditions));

    const totalItems = countResult?.count || 0;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // Get bookings
    const bookings = await db
        .select({
            id: schema.contracts.id,
            startDate: schema.contracts.startDate,
            endDate: schema.contracts.endDate,
            totalAmount: schema.contracts.totalAmount,
            totalCurrency: schema.contracts.totalCurrency,
            status: schema.contracts.status,
            createdAt: schema.contracts.createdAt,
            clientId: schema.contracts.clientId,
            carLicensePlate: schema.companyCars.licensePlate,
            carYear: schema.companyCars.year,
            brandName: schema.carBrands.name,
            modelName: schema.carModels.name,
            clientName: schema.users.name,
            clientSurname: schema.users.surname,
            clientEmail: schema.users.email,
        })
        .from(schema.contracts)
        .innerJoin(schema.companyCars, eq(schema.contracts.companyCarId, schema.companyCars.id))
        .innerJoin(schema.users, eq(schema.contracts.clientId, schema.users.id))
        .leftJoin(schema.carTemplates, eq(schema.companyCars.templateId, schema.carTemplates.id))
        .leftJoin(schema.carBrands, eq(schema.carTemplates.brandId, schema.carBrands.id))
        .leftJoin(schema.carModels, eq(schema.carTemplates.modelId, schema.carModels.id))
        .where(and(...conditions))
        .orderBy(desc(schema.contracts.createdAt))
        .limit(ITEMS_PER_PAGE)
        .offset(offset);

    return { bookings, totalPages, currentPage: page, status };
}

export default function BookingsPage() {
    const { bookings, totalPages, currentPage, status } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();

    const handleStatusChange = (newStatus: string) => {
        setSearchParams({ status: newStatus, page: "1" });
    };

    const statusColors = {
        draft: "bg-gray-100 text-gray-800",
        active: "bg-blue-100 text-blue-800",
        completed: "bg-green-100 text-green-800",
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
                            onClick={() => handleStatusChange("draft")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                status === "draft"
                                    ? "bg-gray-800 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            Draft
                        </button>
                        <button
                            onClick={() => handleStatusChange("active")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                status === "active"
                                    ? "bg-gray-800 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            Active
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
                                to={`/dashboard/contracts/${booking.id}`}
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
                                                Client: {booking.clientName} {booking.clientSurname} ({booking.clientEmail})
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
