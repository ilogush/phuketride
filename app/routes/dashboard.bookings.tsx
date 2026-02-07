import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/ui/PageHeader";
import Button from "~/components/ui/Button";
import DataTable, { type Column } from "~/components/ui/DataTable";
import { PlusIcon, BookmarkIcon } from "@heroicons/react/24/outline";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function BookingsPage() {
    const { user } = useLoaderData<typeof loader>();

    const columns: Column<any>[] = [
        { key: "id", label: "ID" },
        { key: "customerName", label: "Customer" },
        { key: "carName", label: "Car" },
        { key: "startDate", label: "Start Date" },
        { key: "endDate", label: "End Date" },
        { key: "status", label: "Status" },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Bookings Management"
                rightActions={
                    <Link to="/bookings/create">
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                            New Booking
                        </Button>
                    </Link>
                }
            />

            <DataTable
                data={[]}
                columns={columns}
                totalCount={0}
                emptyTitle="No bookings found"
                emptyDescription="All bookings will appear here"
                emptyIcon={<BookmarkIcon className="w-16 h-16" />}
            />
        </div>
    );
}
