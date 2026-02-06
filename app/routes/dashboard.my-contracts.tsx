import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/ui/PageHeader";
import DataTable, { type Column } from "~/components/ui/DataTable";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function MyContractsPage() {
    const { user } = useLoaderData<typeof loader>();

    const columns: Column<any>[] = [
        { key: "id", label: "Contract #" },
        { key: "carName", label: "Car" },
        { key: "signedAt", label: "Signed At" },
        { key: "status", label: "Status" },
        { key: "file", label: "Document", render: () => <span className="text-blue-600 cursor-pointer">View PDF</span> },
    ];

    return (
        <div className="space-y-4">
            <PageHeader title="My Contracts" />

            <DataTable
                data={[]}
                columns={columns}
                totalCount={0}
                emptyTitle="No contracts found"
                emptyDescription="Your rental contracts will be stored here"
                emptyIcon={<DocumentTextIcon className="w-16 h-16" />}
            />
        </div>
    );
}
