import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { companies, users, districts, companyCars } from "~/db/schema";
import { eq, count } from "drizzle-orm";
import PageHeader from "~/components/dashboard/PageHeader";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import { useEffect } from "react";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);

    let companiesList: any[] = [];

    try {
        // Fetch companies with additional data
        const companiesData = await db.select({
            id: companies.id,
            name: companies.name,
            email: companies.email,
            phone: companies.phone,
            locationId: companies.locationId,
            districtId: companies.districtId,
            ownerId: companies.ownerId,
        })
        .from(companies)
        .limit(50);

        // Filter out company with ID 3
        const filteredCompaniesData = companiesData.filter(c => c.id !== 3);

        // Fetch partner names and car counts for each company
        for (const company of filteredCompaniesData) {
            // Get partner/owner info
            const ownerData = await db.select({
                name: users.name,
                surname: users.surname,
            })
            .from(users)
            .where(eq(users.id, company.ownerId))
            .limit(1);

            // Get district info
            const districtData = await db.select({
                name: districts.name,
            })
            .from(districts)
            .where(eq(districts.id, company.districtId || 0))
            .limit(1);

            // Get car count
            const carCountData = await db.select({
                count: count(companyCars.id),
            })
            .from(companyCars)
            .where(eq(companyCars.companyId, company.id));

            companiesList.push({
                ...company,
                partnerName: ownerData[0] ? `${ownerData[0].name || ''} ${ownerData[0].surname || ''}`.trim() : '-',
                districtName: districtData[0]?.name || '-',
                carCount: carCountData[0]?.count || 0,
                status: 'active', // Default status for companies
            });
        }
    } catch (error) {
        console.error("Error loading companies:", error);
    }

    return { user, companies: companiesList };
}

export default function CompaniesPage() {
    const { companies: companiesList } = useLoaderData<typeof loader>();
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
                <span className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-full">
                    {String(company.id).padStart(4, '0')}
                </span>
            ),
        },
        {
            key: "name",
            label: "Name",
            render: (company) => (
                <Link to={`/companies/${company.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                    {company.name}
                </Link>
            ),
        },
        {
            key: "partner",
            label: "Partner",
            render: (company) => (
                <span className="text-gray-600">{company.partnerName}</span>
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
        {
            key: "actions",
            label: "Actions",
            render: (company) => (
                <div className="flex gap-2">
                    <Link to={`/companies/${company.id}`}>
                        <Button variant="secondary" size="sm">
                            View
                        </Button>
                    </Link>
                    <Link to={`/companies/${company.id}/edit`}>
                        <Button variant="secondary" size="sm">Edit</Button>
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Companies"
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
