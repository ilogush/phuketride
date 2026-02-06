import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/ui/PageHeader";
import Button from "~/components/ui/Button";
import DataTable, { type Column } from "~/components/ui/DataTable";
import { PlusIcon, BookmarkIcon } from "@heroicons/react/24/outline";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    return { user };
}

export default function CarTemplatesPage() {
    const { user } = useLoaderData<typeof loader>();

    const columns: Column<any>[] = [
        { key: "id", label: "ID" },
        { key: "brandName", label: "Brand" },
        { key: "modelName", label: "Model" },
        { key: "basePrice", label: "Base Price" },
        { key: "seats", label: "Seats" },
        { key: "doors", label: "Doors" },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Car Templates"
                rightActions={
                    <Link to="/dashboard/car-templates/create">
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                            Add Template
                        </Button>
                    </Link>
                }
            />

            <DataTable
                data={[]}
                columns={columns}
                totalCount={0}
                emptyTitle="No templates found"
                emptyDescription="Templates help streamline adding new cars to the fleet"
                emptyIcon={<BookmarkIcon className="w-16 h-16" />}
            />
        </div>
    );
}
