import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, useNavigation, Link } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Companies — Phuket Ride Admin" },
    { name: "robots", content: "noindex, nofollow" },
];
import PageHeader from "~/components/dashboard/PageHeader";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { loadCompaniesPageData, type CompaniesPageRow } from "~/lib/companies-page.server";
import { trackServerOperation } from "~/lib/telemetry.server";

import { getScopedDb } from "~/lib/db-factory.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, sdb } = await getScopedDb(request, context);
    const url = new URL(request.url);
    const showArchived = url.searchParams.get("archived") === "true";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";

    return trackServerOperation({
        event: "companies.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: null,
        details: { route: "companies", showArchived, sortBy },
        run: () => loadCompaniesPageData({
            request,
            sdb,
            user,
        }),
    });
}

export default function CompaniesPage() {
    const { companies: companiesList, showArchived, totalCount } = useLoaderData<typeof loader>();
    useUrlToast();

    const columns: Column<CompaniesPageRow>[] = [
        {
            key: "id",
            label: "ID",
            sortable: true,
            render: (company) => (
                <Link to={`/home?modCompanyId=${company.id}`} className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none hover:bg-gray-700">
                    {String(company.id).padStart(3, '0')}
                </Link>
            ),
        },
        {
            key: "name",
            label: "Name",
            sortable: true,
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
                        to={`/users/${company.ownerId}/edit`}
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
            key: "carCount",
            label: "Cars",
            sortable: true,
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
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${company.status === 'active'
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
                        <Button variant="outline">
                            {showArchived ? "Hide Archived" : "Show Archived"}
                        </Button>
                    </Link>
                }
            />

            <DataTable
                data={companiesList}
                columns={columns}
                totalCount={totalCount}
                serverPagination
                emptyTitle="No companies found"
                emptyDescription="Start by adding your first company"
                emptyIcon={<BuildingOfficeIcon className="w-10 h-10" />}
            />
        </div>
    );
}
