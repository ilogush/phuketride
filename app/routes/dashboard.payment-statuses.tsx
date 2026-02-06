import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/ui/PageHeader";
import Button from "~/components/ui/Button";
import DataTable, { type Column } from "~/components/ui/DataTable";
import { PlusIcon, BanknotesIcon } from "@heroicons/react/24/outline";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    return { user };
}

export default function PaymentStatusesPage() {
    const { user } = useLoaderData<typeof loader>();

    const columns: Column<any>[] = [
        { key: "id", label: "ID" },
        { key: "name", label: "Status Name" },
        { key: "color", label: "Color" },
        { key: "description", label: "Description" },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Payment Statuses"
                rightActions={
                    <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                        Add Status
                    </Button>
                }
            />

            <DataTable
                data={[]}
                columns={columns}
                totalCount={0}
                emptyTitle="No payment statuses found"
                emptyDescription="Define payment statuses for the system"
                emptyIcon={<BanknotesIcon className="w-16 h-16" />}
            />
        </div>
    );
}
