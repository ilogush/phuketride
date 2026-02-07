import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/ui/PageHeader";
import Button from "~/components/ui/Button";
import DataTable, { type Column } from "~/components/ui/DataTable";
import { PlusIcon, CubeIcon } from "@heroicons/react/24/outline";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    return { user };
}

export default function ModelsPage() {
    const { user } = useLoaderData<typeof loader>();

    const columns: Column<any>[] = [
        { key: "id", label: "ID" },
        { key: "brandName", label: "Brand" },
        { key: "name", label: "Model Name" },
        { key: "category", label: "Category" },
        { key: "transmission", label: "Transmission" },
        { key: "fuelType", label: "Fuel" },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Car Models"
                rightActions={
                    <Link to="/models/create">
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                            Add Model
                        </Button>
                    </Link>
                }
            />

            <DataTable
                data={[]}
                columns={columns}
                totalCount={0}
                emptyTitle="No models found"
                emptyDescription="Add car models to the database"
                emptyIcon={<CubeIcon className="w-16 h-16" />}
            />
        </div>
    );
}
