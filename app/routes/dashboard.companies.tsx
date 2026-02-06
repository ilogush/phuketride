import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { companies } from "~/db/schema";
import PageHeader from "~/components/ui/PageHeader";
import Tabs from "~/components/ui/Tabs";
import DataTable, { type Column } from "~/components/ui/DataTable";
import Button from "~/components/ui/Button";
import { BuildingOfficeIcon, PlusIcon } from "@heroicons/react/24/outline";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);

    let companiesList: any[] = [];
    let locationCounts: Record<string, number> = { all: 0 };

    try {
        const companiesData = await db.select({
            id: companies.id,
            name: companies.name,
            email: companies.email,
            phone: companies.phone,
            locationId: companies.locationId,
        }).from(companies).limit(50);

        companiesList = companiesData;
        locationCounts.all = companiesList.length;

        companiesList.forEach(company => {
            const locId = `loc-${company.locationId}`;
            locationCounts[locId] = (locationCounts[locId] || 0) + 1;
        });
    } catch (error) {
        console.error("Error loading companies:", error);
    }

    return { user, companies: companiesList, locationCounts };
}

export default function CompaniesPage() {
    const { companies: companiesList, locationCounts } = useLoaderData<typeof loader>();
    const [activeTab, setActiveTab] = useState<string>("all");

    const tabs = [
        { id: "all", label: "All", count: locationCounts.all },
    ];

    const filteredCompanies = activeTab === "all"
        ? companiesList
        : companiesList.filter(company => `loc-${company.locationId}` === activeTab);

    const columns: Column<typeof companiesList[0]>[] = [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Companies"
                rightActions={
                    <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                        Add Company
                    </Button>
                }
            />

            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            <DataTable
                data={filteredCompanies}
                columns={columns}
                totalCount={filteredCompanies.length}
                emptyTitle="No companies found"
                emptyDescription="Start by adding your first company"
                emptyIcon={<BuildingOfficeIcon className="w-16 h-16" />}
            />
        </div>
    );
}
