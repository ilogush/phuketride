import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, useSearchParams, useNavigation, Link } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Cars — Phuket Ride Admin" },
    { name: "robots", content: "noindex, nofollow" },
];
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { TruckIcon, PlusIcon } from "@heroicons/react/24/outline";
import IdBadge from "~/components/dashboard/IdBadge";
import { useUrlToast } from "~/lib/useUrlToast";
import { loadCarsPageData, type CarsPageCar } from "~/lib/cars-page.server";
import { trackServerOperation } from "~/lib/telemetry.server";

import { getScopedDb } from "~/lib/db-factory.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, sdb } = await getScopedDb(request, context);
    const url = new URL(request.url);
    const activeStatus = (url.searchParams.get("tab") || "available");
    const sortBy = url.searchParams.get("sortBy") || "createdAt";

    return trackServerOperation({
        event: "cars.load",
        scope: "route.loader",
        request,
        userId: user.id,
        details: { route: "cars", tab: activeStatus, sortBy },
        run: () => loadCarsPageData({
            request,
            user,
            sdb,
        }),
    });
}

export default function CarsPage() {
    const { cars, statusCounts, activeStatus, totalCount, search } = useLoaderData<typeof loader>();
    useUrlToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigation = useNavigation();

    const tabs = [
        { id: "available", label: "Available" },
        { id: "rented", label: "Rented" },
        { id: "maintenance", label: "Maintenance" },
        { id: "booked", label: "Booked" },
    ];

    const currentTab = String(activeStatus);
    const modCompanyId = searchParams.get("modCompanyId");

    const columns: Column<CarsPageCar>[] = [
        {
            key: "photo",
            label: "Photo",
            render: (car) => {
                const firstPhoto = car.previewPhotoUrl as string | null;
                const editPath = modCompanyId
                    ? `/cars/${car.id}/edit?modCompanyId=${modCompanyId}`
                    : `/cars/${car.id}/edit`;

                return (
                    <Link to={editPath} className="block hover:opacity-70 transition-opacity">
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
        {
            key: "licensePlate",
            label: "License Plate",
            sortable: true,
            render: (car) => (
                <div className="flex items-center gap-2">
                    <IdBadge className="bg-blue-800">
                        {String(car.id).padStart(3, '0')}
                    </IdBadge>
                    <span className="font-mono font-medium">{car.licensePlate}</span>
                </div>
            )
        },
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
            sortable: true,
            render: (car) => car.mileage ? `${car.mileage.toLocaleString('en-US')} km` : "-"
        },
        {
            key: "insuranceType",
            label: "Insurance",
            render: (car) => car.insuranceType
                ? car.insuranceType.replace(/\s+Insurance$/i, "")
                : "-"
        },
        {
            key: "pricePerDay",
            label: "Price per Day",
            sortable: true,
            render: (car) => `฿${Number(car.pricePerDay || 0).toLocaleString("en-US")}`
        },
        {
            key: "deposit",
            label: "Deposit",
            sortable: true,
            render: (car) => `฿${Number(car.deposit || 0).toLocaleString("en-US")}`
        },
        {
            key: "status",
            label: "Status",
            render: (car) => {
                const variantMap: Record<string, any> = {
                    available: "success",
                    rented: "info",
                    maintenance: "error",
                    booked: "pending",
                };
                return <StatusBadge variant={variantMap[car.status] || "neutral"}>{car.status}</StatusBadge>;
            }
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Cars"
                rightActions={
                    <Link to={modCompanyId ? `/cars/create?modCompanyId=${modCompanyId}` : "/cars/create"}>
                        <Button variant="solid" icon={<PlusIcon className="w-5 h-5" />}>
                            Add
                        </Button>
                    </Link>
                }
            />

            <Tabs
                tabs={tabs}
                activeTab={currentTab}
                onTabChange={(id) => {
                    const next = new URLSearchParams(searchParams);
                    next.set("tab", String(id));
                    next.set("page", "1");
                    setSearchParams(next);
                }}
            />

            <DataTable
                data={cars}
                columns={columns}
                totalCount={totalCount}
                serverPagination
                isLoading={navigation.state === "loading"}
                emptyTitle="No cars found"
                emptyDescription={`No cars with status "${currentTab}"`}
                emptyIcon={<TruckIcon className="w-10 h-10" />}
            />
        </div>
    );
}
