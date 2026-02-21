import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { companyCars } from "~/db/schema";
import * as schema from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { TruckIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const effectiveCompanyId = getEffectiveCompanyId(request, user);

    let cars: any[] = [];
    let statusCounts = { all: 0, available: 0, rented: 0, maintenance: 0, booked: 0 };

    try {
        const carsQuery = !effectiveCompanyId
            ? db.query.companyCars.findMany({
                with: {
                    template: {
                        with: {
                            brand: true,
                            model: true,
                            bodyType: true,
                        }
                    },
                    color: true,
                },
                limit: 50,
            })
            : db.query.companyCars.findMany({
                where: (companyCars, { eq }) => eq(companyCars.companyId, effectiveCompanyId),
                with: {
                    template: {
                        with: {
                            brand: true,
                            model: true,
                            bodyType: true,
                        }
                    },
                    color: true,
                },
                limit: 50,
            });

        cars = await carsQuery;

        statusCounts.all = cars.length;
        statusCounts.available = cars.filter(c => c.status === "available").length;
        statusCounts.rented = cars.filter(c => c.status === "rented").length;
        statusCounts.maintenance = cars.filter(c => c.status === "maintenance").length;
        statusCounts.booked = cars.filter(c => c.status === "booked").length;
    } catch {
        cars = [];
    }

    return { user, cars, statusCounts };
}

export default function CarsPage() {
    const { cars, statusCounts } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<string>("available");

    // Toast notifications
    useEffect(() => {
        const success = searchParams.get("success");
        const error = searchParams.get("error");
        if (success) {
            toast.success(success, 3000);
        }
        if (error) {
            toast.error(error, 3000);
        }
    }, [searchParams, toast]);

    const tabs = [
        { id: "available", label: "Available" },
        { id: "rented", label: "Rented" },
        { id: "maintenance", label: "Maintenance" },
        { id: "booked", label: "Booked" },
    ];

    const filteredCars = cars.filter(car => car.status === activeTab);

    const columns: Column<typeof cars[0]>[] = [
        { 
            key: "photo", 
            label: "Photo",
            render: (car) => {
                const photos = car.photos ? JSON.parse(car.photos as string) : [];
                const firstPhoto = photos[0];
                
                return (
                    <Link to={`/dashboard/cars/${car.id}`} className="block hover:opacity-70 transition-opacity">
                        {firstPhoto ? (
                            <img 
                                src={firstPhoto} 
                                alt={`${car.template?.brand?.name} ${car.template?.model?.name}`}
                                className="w-10 h-10 object-cover rounded-lg"
                            />
                        ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <TruckIcon className="w-6 h-6 text-gray-400" />
                            </div>
                        )}
                    </Link>
                );
            }
        },
        { key: "licensePlate", label: "License Plate" },
        {
            key: "car",
            label: "Car",
            render: (car) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{car.template?.brand?.name || "-"}</span>
                    <span className="text-xs text-gray-500">{car.template?.model?.name || "-"}</span>
                </div>
            )
        },
        {
            key: "engine",
            label: "Engine",
            render: (car) => car.template?.engineVolume ? `${car.template.engineVolume}L` : "-"
        },
        {
            key: "bodyType",
            label: "Body Type",
            render: (car) => car.template?.bodyType?.name || "-"
        },
        {
            key: "color",
            label: "Color",
            render: (car) => car.color?.name || "-"
        },
        {
            key: "mileage",
            label: "Mileage",
            render: (car) => car.mileage ? `${car.mileage.toLocaleString('en-US')} km` : "-"
        },
        {
            key: "insuranceType",
            label: "Insurance Type",
            render: (car) => car.insuranceType || "-"
        },
        {
            key: "pricePerDay",
            label: "Price per Day",
            render: (car) => `${Number(car.pricePerDay || 0).toLocaleString("en-US")} THB`
        },
        {
            key: "deposit",
            label: "Deposit",
            render: (car) => `${Number(car.deposit || 0).toLocaleString("en-US")} THB`
        },
        {
            key: "status",
            label: "Status",
            render: (car) => <StatusBadge variant={car.status === "available" ? "success" : "neutral"}>{car.status}</StatusBadge>
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Cars"
                rightActions={
                    <Link to="/dashboard/cars/create">
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
                emptyIcon={<TruckIcon className="w-10 h-10" />}
            />
        </div>
    );
}
