import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAdmin } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import { PlusIcon, BanknotesIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAdmin(request);
    return { user };
}

export default function PaymentStatusesPage() {
    useUrlToast();
    const { user } = useLoaderData<typeof loader>();

    type PaymentStatusRow = {
        id: number;
        name: string;
        color?: string;
        description?: string;
    };

    const columns: Column<PaymentStatusRow>[] = [
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
                emptyIcon={<BanknotesIcon className="w-10 h-10" />}
            />
        </div>
    );
}
