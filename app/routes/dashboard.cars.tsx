import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { companyCars } from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { TruckIcon, PlusIcon } from "@heroicons/react/24/outline";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);

    let cars: any[] = [];
    let statusCounts = { all: 0, available: 0, rented: 0, maintenance: 0, booked: 0 };

    try {
        const carsQuery = user.role === "admin"
            ? db.select({
                id: companyCars.id,
                licensePlate: companyCars.licensePlate,
                year: companyCars.year,
                pricePerDay: companyCars.pricePerDay,
                status: companyCars.status,
                mileage: companyCars.mileage,
            }).from(companyCars).limit(50)
            : db.select({
                id: companyCars.id,
                licensePlate: companyCars.licensePlate,
                year: companyCars.year,
                pricePerDay: companyCars.pricePerDay,
                status: companyCars.status,
                mileage: companyCars.mileage,
            }).from(companyCars)
                .where(eq(companyCars.companyId, user.companyId!))
                .limit(50);

        cars = await carsQuery;

        statusCounts.all = cars.length;
        statusCounts.available = cars.filter(c => c.status === "available").length;
        statusCounts.rented = cars.filter(c => c.status === "rented").length;
        statusCounts.maintenance = cars.filter(c => c.status === "maintenance").length;
        statusCounts.booked = cars.filter(c => c.status === "booked").length;
    } catch (error) {
        console.error("Error loading cars:", error);
    }

    return { user, cars, statusCounts };
}

export default function CarsPage() {
    const { cars, statusCounts } = useLoaderData<typeof loader>();
    const [activeTab, setActiveTab] = useState<string>("available");

    const tabs = [
        { id: "available", label: "Available" },
        { id: "rented", label: "Rented" },
        { id: "maintenance", label: "Maintenance" },
        { id: "booked", label: "Booked" },
    ];

    const filteredCars = cars.filter(car => car.status === activeTab);

    const columns: Column<typeof cars[0]>[] = [
        { key: "id", label: "ID" },
        { key: "licensePlate", label: "License Plate" },
        {
            key: "year",
            label: "Year",
            render: (car) => car.year || "-"
        },
        {
            key: "pricePerDay",
            label: "Price/Day",
            render: (car) => car.pricePerDay ? `${car.pricePerDay} THB` : "-"
        },
        {
            key: "mileage",
            label: "Mileage",
            render: (car) => car.mileage ? `${car.mileage.toLocaleString()} km` : "-"
        },
        {
            key: "status",
            label: "Status",
            render: (car) => <StatusBadge variant={car.status === "available" ? "success" : "neutral"}>{car.status}</StatusBadge>
        },
        {
            key: "actions",
            label: "Actions",
            render: (car) => (
                <div className="flex gap-2">
                    <Link to={`/cars/${car.id}`}>
                        <Button variant="secondary" size="sm">View</Button>
                    </Link>
                    <Link to={`/cars/${car.id}/edit`}>
                        <Button variant="secondary" size="sm">Edit</Button>
                    </Link>
                </div>
            )
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Cars"
                rightActions={
                    <Link to="/cars/create">
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                            Add
                        </Button>
                    </Link>
                }
            />

            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as string)} />

            <DataTable
                data={filteredCars}
                columns={columns}
                totalCount={filteredCars.length}
                emptyTitle="No cars found"
                emptyDescription={`No cars with status "${activeTab}"`}
                emptyIcon={<TruckIcon className="w-16 h-16" />}
            />
        </div>
    );
}
