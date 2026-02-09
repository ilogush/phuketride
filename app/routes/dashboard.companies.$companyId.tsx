import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq, desc } from "drizzle-orm";
import { companies, users, companyCars, contracts, carModels, carBrands } from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import StatusBadge from "~/components/dashboard/StatusBadge";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);
    const companyId = parseInt(params.companyId || "0");

    let company: any = null;
    let cars: any[] = [];
    let contractsList: any[] = [];

    try {
        const companyData = await db
            .select({
                id: companies.id,
                name: companies.name,
                email: companies.email,
                phone: companies.phone,
                address: companies.address,
            })
            .from(companies)
            .where(eq(companies.id, companyId))
            .limit(1);

        company = companyData[0] || null;

        if (!company) {
            throw new Response("Company not found", { status: 404 });
        }

        const carsData = await db
            .select({
                id: companyCars.id,
                licensePlate: companyCars.licensePlate,
                year: companyCars.year,
                pricePerDay: companyCars.pricePerDay,
                status: companyCars.status,
                mileage: companyCars.mileage,
                brandName: carBrands.name,
                modelName: carModels.name,
            })
            .from(companyCars)
            .leftJoin(carModels, eq(companyCars.templateId, carModels.id))
            .leftJoin(carBrands, eq(carModels.brandId, carBrands.id))
            .where(eq(companyCars.companyId, companyId))
            .orderBy(desc(companyCars.createdAt))
            .limit(100);

        cars = carsData;

        const contractsData = await db
            .select({
                id: contracts.id,
                startDate: contracts.startDate,
                endDate: contracts.endDate,
                totalAmount: contracts.totalAmount,
                status: contracts.status,
                clientName: users.name,
                clientSurname: users.surname,
                licensePlate: companyCars.licensePlate,
            })
            .from(contracts)
            .innerJoin(companyCars, eq(contracts.companyCarId, companyCars.id))
            .leftJoin(users, eq(contracts.clientId, users.id))
            .where(eq(companyCars.companyId, companyId))
            .orderBy(desc(contracts.createdAt))
            .limit(50);

        contractsList = contractsData;
    } catch (error) {
        console.error("Error loading company data:", error);
    }

    return { user, company, cars, contracts: contractsList };
}

export default function CompanyDetailPage() {
    const { company, cars, contracts } = useLoaderData<typeof loader>();

    if (!company) {
        return (
            <div className="space-y-4">
                <PageHeader title="Company Not Found" />
                <div className="text-center py-12">
                    <p className="text-gray-500">The company you are looking for does not exist.</p>
                    <Link to="/companies" className="mt-4 inline-block">
                        <Button variant="secondary">
                            Back to Companies
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const carColumns: Column<typeof cars[0]>[] = [
        {
            key: "id",
            label: "ID",
            render: (car) => (
                <span className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-full">
                    {String(car.id).padStart(4, "0")}
                </span>
            ),
        },
        {
            key: "licensePlate",
            label: "License Plate",
        },
        {
            key: "brandName",
            label: "Brand",
        },
        {
            key: "modelName",
            label: "Model",
        },
        {
            key: "year",
            label: "Year",
        },
        {
            key: "pricePerDay",
            label: "Price/Day",
            render: (car) => `฿${(car.pricePerDay || 0).toLocaleString()}`,
        },
        {
            key: "status",
            label: "Status",
            render: (car) => {
                const status = car.status || "available";
                const variant = status === "available" ? "success" : 
                    status === "rented" ? "warning" : 
                    status === "maintenance" ? "error" : "neutral";
                return <StatusBadge variant={variant}>{status}</StatusBadge>;
            },
        },
    ];

    const contractColumns: Column<typeof contracts[0]>[] = [
        {
            key: "id",
            label: "ID",
            render: (contract) => (
                <span className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-full">
                    {String(contract.id).padStart(4, "0")}
                </span>
            ),
        },
        {
            key: "startDate",
            label: "Start Date",
            render: (contract) => new Date(contract.startDate).toLocaleDateString(),
        },
        {
            key: "endDate",
            label: "End Date",
            render: (contract) => new Date(contract.endDate).toLocaleDateString(),
        },
        {
            key: "clientName",
            label: "Client",
            render: (contract) => `${contract.clientName || ""} ${contract.clientSurname || ""}`.trim() || "-",
        },
        {
            key: "licensePlate",
            label: "Car",
        },
        {
            key: "totalAmount",
            label: "Amount",
            render: (contract) => `฿${(contract.totalAmount || 0).toLocaleString()}`,
        },
        {
            key: "status",
            label: "Status",
            render: (contract) => {
                const status = contract.status || "draft";
                const variant = status === "active" ? "success" : 
                    status === "completed" ? "neutral" : 
                    status === "cancelled" ? "error" : "warning";
                return <StatusBadge variant={variant}>{status}</StatusBadge>;
            },
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title={company.name || "Company Details"}
                leftActions={
                    <Link to="/companies">
                        <Button variant="secondary">
                            <ArrowLeftIcon className="w-4 h-4 mr-2" />
                            Back to Companies
                        </Button>
                    </Link>
                }
                rightActions={
                    <Link to={`/companies/${company.id}/edit`}>
                        <Button variant="secondary">
                            Edit
                        </Button>
                    </Link>
                }
            />

            <div className="bg-white rounded-3xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Name</p>
                        <p className="text-gray-900">{company.name || "-"}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="text-gray-900">{company.email || "-"}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <p className="text-gray-900">{company.phone || "-"}</p>
                    </div>
                    <div className="col-span-full">
                        <p className="text-sm font-medium text-gray-500">Address</p>
                        <p className="text-gray-900">{company.address || "-"}</p>
                    </div>
                </div>
            </div>

            <DataTable
                data={cars}
                columns={carColumns}
                totalCount={cars.length}
                emptyTitle="No cars found"
                emptyDescription="Cars will appear here when added"
            />

            <DataTable
                data={contracts}
                columns={contractColumns}
                totalCount={contracts.length}
                emptyTitle="No contracts found"
                emptyDescription="Contracts will appear here when created"
            />
        </div>
    );
}
