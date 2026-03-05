import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { TruckIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";
import { getPrimaryCarPhotoUrl } from "~/lib/car-photos";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { parseListFilters } from "~/lib/query-filters.server";
import { listCarsPage } from "~/lib/cars-repo.server";
import type { CarListRow } from "~/lib/db-types";
const CAR_TABS = ["available", "rented", "maintenance", "booked"] as const;
type CarTab = typeof CAR_TABS[number];

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const url = new URL(request.url);
    const effectiveCompanyId = getEffectiveCompanyId(request, user);
    const { tab, search, sortBy, sortOrder } = parseListFilters(url, {
        tabs: CAR_TABS,
        defaultTab: "available",
        sortBy: ["createdAt", "id", "licensePlate", "pricePerDay", "mileage", "deposit"] as const,
        defaultSortBy: "createdAt",
        defaultSortOrder: "desc",
    });
    const activeStatus: CarTab = tab ?? "available";
    const { page, pageSize, offset } = getPaginationFromUrl(url);

    let cars: Array<CarListRow & {
        previewPhotoUrl: string | null;
        licensePlate: string | null;
        pricePerDay: number | null;
        insuranceType: string | null;
        template: { brand: { name: string | null }; model: { name: string | null }; bodyType: { name: string | null }; engineVolume: number | null };
        color: { name: string | null };
    }> = [];
    let statusCounts = { all: 0, available: 0, rented: 0, maintenance: 0, booked: 0 };
    let totalCount = 0;

    try {
        const [countsResult, result] = effectiveCompanyId
            ? await Promise.all([
                context.cloudflare.env.DB.prepare(`
                    SELECT status, COUNT(*) AS count
                    FROM company_cars
                    WHERE company_id = ?
                    GROUP BY status
                `).bind(effectiveCompanyId).all() as Promise<{ results?: Array<{ status: string; count: number }> }>,
                listCarsPage({
                    db: context.cloudflare.env.DB,
                    companyId: effectiveCompanyId,
                    status: activeStatus,
                    pageSize,
                    offset,
                    search,
                    sortBy: sortBy || "createdAt",
                    sortOrder,
                }) as Promise<CarListRow[]>,
            ])
            : await Promise.all([
                context.cloudflare.env.DB.prepare(`
                    SELECT status, COUNT(*) AS count
                    FROM company_cars
                    GROUP BY status
                `).all() as Promise<{ results?: Array<{ status: string; count: number }> }>,
                listCarsPage({
                    db: context.cloudflare.env.DB,
                    companyId: null,
                    status: activeStatus,
                    pageSize,
                    offset,
                    search,
                    sortBy: sortBy || "createdAt",
                    sortOrder,
                }) as Promise<CarListRow[]>,
            ]);

        cars = result.map((car: CarListRow) => ({
            ...car,
            previewPhotoUrl: getPrimaryCarPhotoUrl(car.photos, request.url, null),
            licensePlate: car.license_plate,
            pricePerDay: car.price_per_day,
            insuranceType: car.insurance_type,
            template: {
                brand: { name: car.brandName },
                model: { name: car.modelName },
                bodyType: { name: car.bodyTypeName },
                engineVolume: car.engine_volume,
            },
            color: { name: car.colorName },
        }));

        (countsResult.results || []).forEach((row) => {
            const count = Number(row.count || 0);
            if (row.status === "available") statusCounts.available = count;
            if (row.status === "rented") statusCounts.rented = count;
            if (row.status === "maintenance") statusCounts.maintenance = count;
            if (row.status === "booked") statusCounts.booked = count;
        });
        statusCounts.all = statusCounts.available + statusCounts.rented + statusCounts.maintenance + statusCounts.booked;
        if (search) {
            const countSql = `
                SELECT COUNT(*) AS count
                FROM company_cars cc
                LEFT JOIN car_templates ct ON ct.id = cc.template_id
                LEFT JOIN car_brands cb ON cb.id = ct.brand_id
                LEFT JOIN car_models cm ON cm.id = ct.model_id
                LEFT JOIN body_types bt ON bt.id = ct.body_type_id
                LEFT JOIN colors cl ON cl.id = cc.color_id
                WHERE ${effectiveCompanyId ? "cc.company_id = ? AND " : ""}cc.status = ?
                AND (COALESCE(cc.license_plate,'') LIKE ? OR COALESCE(cb.name,'') LIKE ? OR COALESCE(cm.name,'') LIKE ? OR COALESCE(bt.name,'') LIKE ? OR COALESCE(cl.name,'') LIKE ?)
            `;
            const q = `%${search}%`;
            const countResult = effectiveCompanyId
                ? await context.cloudflare.env.DB.prepare(countSql).bind(effectiveCompanyId, activeStatus, q, q, q, q, q).first() as { count?: number | string } | null
                : await context.cloudflare.env.DB.prepare(countSql).bind(activeStatus, q, q, q, q, q).first() as { count?: number | string } | null;
            totalCount = Number(countResult?.count || 0);
        } else {
            totalCount = activeStatus === "available" ? statusCounts.available
                : activeStatus === "rented" ? statusCounts.rented
                    : activeStatus === "maintenance" ? statusCounts.maintenance
                        : statusCounts.booked;
        }
    } catch {
        cars = [];
    }

    return { user, cars, statusCounts, activeStatus, totalCount, page, pageSize, search };
}

export default function CarsPage() {
    const { cars, statusCounts, activeStatus, totalCount, search } = useLoaderData<typeof loader>();
    useUrlToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const tabs = [
        { id: "available", label: "Available" },
        { id: "rented", label: "Rented" },
        { id: "maintenance", label: "Maintenance" },
        { id: "booked", label: "Booked" },
    ];

    const currentTab = String(activeStatus);
    const modCompanyId = searchParams.get("modCompanyId");

    const columns: Column<typeof cars[0]>[] = [
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
        { key: "licensePlate", label: "License Plate", sortable: true },
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
            render: (car) => <StatusBadge variant={car.status === "available" ? "success" : "neutral"}>{car.status}</StatusBadge>
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Cars"
                withSearch
                searchValue={search}
                searchPlaceholder="Search cars"
                onSearchChange={(value) => {
                    const next = new URLSearchParams(searchParams);
                    if (value.trim()) next.set("search", value.trim());
                    else next.delete("search");
                    next.set("page", "1");
                    setSearchParams(next);
                }}
                rightActions={
                    <Link to="/cars/create">
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
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
                emptyTitle="No cars found"
                emptyDescription={`No cars with status "${currentTab}"`}
                emptyIcon={<TruckIcon className="w-10 h-10" />}
            />
        </div>
    );
}
