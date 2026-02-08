import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { companies } from "~/db/schema";
import PageHeader from "~/components/ui/PageHeader";
import DataTable, { type Column } from "~/components/ui/DataTable";
import Button from "~/components/ui/Button";
import { BuildingOfficeIcon, PlusIcon } from "@heroicons/react/24/outline";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);

    let companiesList: any[] = [];

    try {
        const companiesData = await db.select({
            id: companies.id,
            name: companies.name,
            email: companies.email,
            phone: companies.phone,
            locationId: companies.locationId,
        }).from(companies).limit(50);

        companiesList = companiesData;
    } catch (error) {
        console.error("Error loading companies:", error);
    }

    return { user, companies: companiesList };
}

export default function CompaniesPage() {
    const { companies: companiesList } = useLoaderData<typeof loader>();

    const columns: Column<typeof companiesList[0]>[] = [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        {
            key: "actions",
            label: "Actions",
            render: (company) => (
                <div className="flex gap-2">
                    <Link to={`/dashboard/companies/${company.id}`}>
                        <Button variant="secondary" size="sm">View</Button>
                    </Link>
                    <Link to={`/dashboard/companies/${company.id}/edit`}>
                        <Button variant="secondary" size="sm">Edit</Button>
                    </Link>
                </div>
            )
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Companies"
                rightActions={
                    <Link to="/companies/create">
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                            Add
                        </Button>
                    </Link>
                }
            />

            <DataTable
                data={companiesList}
                columns={columns}
                totalCount={companiesList.length}
                emptyTitle="No companies found"
                emptyDescription="Start by adding your first company"
                emptyIcon={<BuildingOfficeIcon className="w-16 h-16" />}
            />
        </div>
    );
}
