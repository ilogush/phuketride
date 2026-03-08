import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, Link, useSearchParams, useNavigation } from "react-router";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import { PlusIcon, BookmarkIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Tabs from "~/components/dashboard/Tabs";
import StatusBadge from "~/components/dashboard/StatusBadge";
import IdBadge from "~/components/dashboard/IdBadge";
import { formatContactPhone } from "~/lib/phone";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { parseListFilters } from "~/lib/query-filters.server";
import { useUrlToast } from "~/lib/useUrlToast";
import { trackServerOperation } from "~/lib/telemetry.server";
import { getScopedDb } from "~/lib/db-factory.server";
import type { BookingListRow } from "~/lib/db-types";

export const meta: MetaFunction = () => [
    { title: "Bookings — Phuket Ride Admin" },
    { name: "description", content: "Manage car rental bookings in Phuket Ride." },
    { name: "robots", content: "noindex, nofollow" },
];

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

            return { bookings, totalPages, totalCount: totalItems, currentPage: page, status: selectedStatus, search };
        },
    });
}export default function BookingsPage() {
    useUrlToast();
    const { bookings, totalCount, status, search } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigation = useNavigation();

    const tabs = BOOKING_STATUSES.map(s => ({
        id: s,
        label: s.charAt(0).toUpperCase() + s.slice(1)
    }));

    const columns: Column<BookingListRow>[] = [
        {
            key: "id",
            label: "ID",
            sortable: true,
            render: (item) => (
                <IdBadge>
                    {String(item.id).padStart(3, '0')}
                </IdBadge>
            )
        },
        {
            key: "client",
            label: "Client",
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{item.clientName} {item.clientSurname}</span>
                    <span className="text-xs text-gray-500">{formatContactPhone(item.clientPhone)}</span>
                </div>
            )
        },
        {
            key: "car",
            label: "Car",
            render: (item) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.brandName} {item.modelName}</span>
                    <span className="text-xs text-gray-500 font-mono">{item.carLicensePlate}</span>
                </div>
            )
        },
        {
            key: "period",
            label: "Period",
            render: (item) => (
                <div className="text-sm">
                    {format(new Date(item.startDate), "dd MMM")} - {format(new Date(item.endDate), "dd MMM yyyy")}
                </div>
            )
        },
        {
            key: "amount",
            label: "Amount",
            sortable: true,
            render: (item) => (
                <div className="flex flex-col items-end">
                    <span className="font-bold">{item.currency} {item.estimatedAmount.toFixed(2)}</span>
                    {item.depositPaid ? (
                        <span className="text-[10px] text-green-600 font-bold uppercase">Dep. Paid</span>
                    ) : (item.depositAmount ?? 0) > 0 ? (
                        <span className="text-[10px] text-gray-400">Dep: {item.depositAmount?.toFixed(0)}</span>
                    ) : null}
                </div>
            )
        },
        {
            key: "status",
            label: "Status",
            render: (item) => (
                <StatusBadge variant={item.status as any}>
                    {item.status}
                </StatusBadge>
            )
        }
    ];

    const handleSearch = (val: string) => {
        const next = new URLSearchParams(searchParams);
        if (val) next.set("search", val);
        else next.delete("search");
        next.set("page", "1");
        setSearchParams(next, { replace: true });
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title="Bookings"
                rightActions={
                    <Link to="/bookings/create">
                        <Button variant="solid" icon={<PlusIcon className="w-5 h-5" />}>
                            New
                        </Button>
                    </Link>
                }
            />

            <Tabs
                tabs={tabs}
                activeTab={status}
                onTabChange={(id) => {
                    const next = new URLSearchParams(searchParams);
                    next.set("status", String(id));
                    next.set("page", "1");
                    setSearchParams(next);
                }}
            />

            <DataTable<BookingListRow>
                data={bookings}
                columns={columns}
                totalCount={totalCount}
                serverPagination
                isLoading={navigation.state === "loading"}
                getRowClassName={() => "cursor-pointer"}
                onRowClick={(item) => (window.location.href = `/bookings/${item.id}`)}
                emptyTitle="No bookings found"
                emptyDescription={status !== "all" ? `No bookings with status "${status}"` : "Start by creating your first booking"}
                emptyIcon={<BookmarkIcon className="w-10 h-10" />}
            />
        </div>
    );
}
