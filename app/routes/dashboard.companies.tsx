import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq, count } from "drizzle-orm";
import PageHeader from "~/components/dashboard/PageHeader";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import { useEffect } from "react";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    
    // Get showArchived from query params
    const url = new URL(request.url);
    const showArchived = url.searchParams.get("archived") === "true";

    let companiesList: any[] = [];

    try {
        // Fetch companies with additional data using relations
        const companiesData = await db.query.companies.findMany({
            with: {
                owner: {
                    columns: {
                        name: true,
                        surname: true,
                        archivedAt: true,
                    },
                },
            },
            limit: 50,
        });

        // Filter companies based on archived status
        const filteredCompaniesData = companiesData.filter(c => {
            if (showArchived) return true; // Show all if archived filter is on
            return !c.archivedAt; // Show only non-archived by default
        });

        // Fetch district and car count for each company
        for (const company of filteredCompaniesData) {
            // Get district info
            const districtData = await db.select({
                name: schema.districts.name,
            })
            .from(schema.districts)
            .where(eq(schema.districts.id, company.districtId || 0))
            .limit(1);

            // Get car count
            const carCountData = await db.select({
                count: count(schema.companyCars.id),
            })
            .from(schema.companyCars)
            .where(eq(schema.companyCars.companyId, company.id));

            companiesList.push({
                id: company.id,
                name: company.name,
                email: company.email,
                phone: company.phone,
                locationId: company.locationId,
                districtId: company.districtId,
                ownerId: company.ownerId,
                archivedAt: company.archivedAt,
                partnerName: company.owner ? `${company.owner.name || ''} ${company.owner.surname || ''}`.trim() : '-',
                partnerArchived: !!company.owner?.archivedAt,
                districtName: districtData[0]?.name || '-',
                carCount: carCountData[0]?.count || 0,
                status: company.archivedAt ? 'archived' : 'active',
            });
        }
    } catch (error) {
        console.error("Error loading companies:", error);
    }

    return { user, companies: companiesList, showArchived };
}

export default function CompaniesPage() {
    const { companies: companiesList, showArchived } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();

    // Toast notifications
    useEffect(() => {
        const success = searchParams.get("success");
        const error = searchParams.get("error");
        if (success) {
            toast.success(success);
        }
        if (error) {
            toast.error(error);
        }
    }, [searchParams, toast]);

    const columns: Column<typeof companiesList[0]>[] = [
        {
            key: "id",
            label: "ID",
            render: (company) => (
                <Link to={`/companies/${company.id}`} className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-full hover:bg-gray-700">
                    {String(company.id).padStart(4, '0')}
                </Link>
            ),
        },
        {
            key: "name",
            label: "Name",
            render: (company) => (
                <span className="font-medium text-gray-900">
                    {company.name}
                </span>
            ),
        },
        {
            key: "partner",
            label: "Owner",
            render: (company) => (
                <div className="flex flex-col">
                    <Link 
                        to={`/users/${company.ownerId}`} 
                        className="text-gray-900 hover:text-blue-600 font-medium"
                    >
                        {company.partnerName}
                    </Link>
                    {company.partnerArchived && (
                        <span className="text-xs text-orange-600">Archived</span>
                    )}
                </div>
            ),
        },
        {
            key: "cars",
            label: "Cars",
            render: (company) => (
                <span className="text-gray-600">{company.carCount}</span>
            ),
        },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        {
            key: "district",
            label: "District",
            render: (company) => (
                <span className="text-gray-600">{company.districtName}</span>
            ),
        },
        {
            key: "status",
            label: "Status",
            render: (company) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    company.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                }`}>
                    {company.status}
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Companies"
                rightActions={
                    <Link to={showArchived ? "/companies" : "/companies?archived=true"}>
                        <Button variant="secondary">
                            {showArchived ? "Hide Archived" : "Show Archived"}
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
                emptyIcon={<BuildingOfficeIcon className="w-10 h-10" />}
            />
        </div>
    );
}
