import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAdmin } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import { PlusIcon, SwatchIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAdmin(request);
    return { user };
}

export default function BrandsPage() {
    const { user } = useLoaderData<typeof loader>();
    useUrlToast();

    type BrandRow = {
        id: number;
        name: string;
        logo?: string | null;
        modelsCount?: number;
        createdAt?: string;
    };

    const columns: Column<BrandRow>[] = [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "logo", label: "Logo", render: (item) => item.logo ? <img src={item.logo} alt={item.name} className="w-8 h-8 rounded object-contain" /> : <div className="w-8 h-8 bg-gray-100 rounded" /> },
        { key: "modelsCount", label: "Models" },
        { key: "createdAt", label: "Created At" },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Car Brands"
                rightActions={
                    <Link to="/brands/create">
                        <Button variant="solid" icon={<PlusIcon className="w-5 h-5" />}>
                            Add Brand
                        </Button>
                    </Link>
                }
            />

            <DataTable
                data={[]}
                columns={columns}
                totalCount={0}
                emptyTitle="No brands found"
                emptyDescription="Add your first car brand to get started"
                emptyIcon={<SwatchIcon className="w-10 h-10" />}
            />
        </div>
    );
}
