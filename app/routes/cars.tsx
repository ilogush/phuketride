import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, useSearchParams, useNavigation, Link } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Cars — Phuket Ride Admin" },
    { name: "robots", content: "noindex, nofollow" },
];
import PageHeader from '~/components/shared/ui/PageHeader';
import PageSearchInput from '~/components/shared/ui/PageSearchInput';
import Tabs from '~/components/shared/ui/Tabs';
import DataTable, { type Column } from '~/components/dashboard/data-table/DataTable';
import StatusBadge from '~/components/shared/ui/StatusBadge';
import Button from '~/components/shared/ui/Button';
import { TruckIcon, PlusIcon } from "@heroicons/react/24/outline";
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
    const handleSearch = (value: string) => {
        const next = new URLSearchParams(searchParams);
        const trimmed = value.trim();
        if (trimmed) next.set("search", trimmed);
        else next.delete("search");
        next.set("page", "1");
        setSearchParams(next, { replace: true });
    };

    const columns: Column<CarsPageCar>[] = [
        {
            key: "car",
            label: "Car",
            render: (car) => {
                const firstPhoto = car.previewPhotoUrl as string | null;
                const editPath = modCompanyId
                    ? `/cars/${car.id}/edit?modCompanyId=${modCompanyId}`
                    : `/cars/${car.id}/edit`;

                return (
                    <div className="flex items-center gap-3">
                        <Link to={editPath} className="block hover:opacity-70 transition-opacity flex-shrink-0">
                            {firstPhoto ? (
                                <img
                                    src={firstPhoto}
                                    alt={`${car.template?.brand?.name} ${car.template?.model?.name}`}
                                    className="w-12 h-12 object-cover rounded-xl"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                    <TruckIcon className="w-6 h-6 text-gray-400" />
                                </div>
                            )}
                        </Link>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-gray-900 truncate">
                                {car.template?.brand?.name || "-"}
                            </span>
                            <span className="text-xs text-gray-500 font-medium truncate">
                                {car.template?.model?.name || "-"}
                            </span>
                        </div>
                    </div>
                );
            }
        },
        {
            key: "licensePlate",
            label: "License Plate",
            render: (car) => (
                <span className="font-mono text-gray-900">
                    {car.licensePlate}
                </span>
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
                searchSlot={
                    <PageSearchInput
                        value={search || ""}
                        onChange={handleSearch}
                        placeholder="Search cars..."
                    />
                }
                rightSlot={
                    <Link to={modCompanyId ? `/cars/create?modCompanyId=${modCompanyId}` : "/cars/create"}>
                        <Button variant="primary" leadingIcon={<PlusIcon className="w-5 h-5" />}>
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
