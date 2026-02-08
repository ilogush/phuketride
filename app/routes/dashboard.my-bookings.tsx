import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import { BookmarkIcon } from "@heroicons/react/24/outline";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function MyBookingsPage() {
    const { user } = useLoaderData<typeof loader>();

    const columns: Column<any>[] = [
        { key: "id", label: "Booking ID" },
        { key: "carName", label: "Car" },
        { key: "startDate", label: "Start Date" },
        { key: "endDate", label: "End Date" },
        { key: "totalPrice", label: "Total Price" },
        { key: "status", label: "Status" },
    ];

    return (
        <div className="space-y-4">
            <PageHeader title="My Bookings" />

            <DataTable
                data={[]}
                columns={columns}
                totalCount={0}
                emptyTitle="You have no bookings"
                emptyDescription="Your rental history will appear here"
                emptyIcon={<BookmarkIcon className="w-16 h-16" />}
            />
        </div>
    );
}
