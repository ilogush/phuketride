import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/ui/PageHeader";
import DataTable, { type Column } from "~/components/ui/DataTable";
import StatusBadge from "~/components/ui/StatusBadge";
import Button from "~/components/ui/Button";
import { PlusIcon } from "@heroicons/react/24/outline";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function LocationsPage() {
    const { user } = useLoaderData<typeof loader>();

    const locations = [
        { id: '1', name: 'Phuket Airport', address: 'Phuket International Airport', status: 'active' },
        { id: '2', name: 'Patong Beach', address: 'Patong, Phuket', status: 'active' },
    ];

    const columns: Column<typeof locations[0]>[] = [
        {
            key: 'name',
            label: 'Name',
        },
        {
            key: 'address',
            label: 'Address',
        },
        {
            key: 'status',
            label: 'Status',
            render: (location) => (
                <StatusBadge variant="success">
                    {location.status}
                </StatusBadge>
            ),
        },
    ];

    return (
        <div className="space-y-4 animate-in fade-in duration-700">
            <PageHeader
                title="Locations"
                rightActions={
                    <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                        Add Location
                    </Button>
                }
            />

            <DataTable
                data={locations}
                columns={columns}
                totalCount={locations.length}
                emptyTitle="No locations found"
                emptyDescription="Start by adding your first location"
            />
        </div>
    );
}
