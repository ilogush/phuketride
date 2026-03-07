import { getPrimaryCarPhotoUrl } from "~/lib/car-photos";
import { countCarsPage, listCarsPage, listCarStatusCounts } from "~/lib/cars-repo.server";
import type { SessionUser } from "~/lib/auth.server";
import type { CarListRow } from "~/lib/db-types";
import { requireScopedDashboardAccess } from "~/lib/access-policy.server";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { parseListFilters } from "~/lib/query-filters.server";

const CAR_TABS = ["available", "rented", "maintenance", "booked"] as const;
type CarTab = typeof CAR_TABS[number];

export type CarsPageCar = CarListRow & {
    previewPhotoUrl: string | null;
    licensePlate: string | null;
    pricePerDay: number | null;
    insuranceType: string | null;
    template: {
        brand: { name: string | null };
        model: { name: string | null };
        bodyType: { name: string | null };
        engineVolume: number | null;
    };
    color: { name: string | null };
};

export interface CarsPageData {
    user: SessionUser;
    cars: CarsPageCar[];
    statusCounts: { all: number; available: number; rented: number; maintenance: number; booked: number };
    activeStatus: CarTab;
    totalCount: number;
    page: number;
    pageSize: number;
    search: string;
    companyId: number | null;
}

import type { ScopedDb } from "~/lib/db-factory.server";

export async function loadCarsPageData(args: {
    request: Request;
    user: SessionUser;
    sdb: ScopedDb;
}): Promise<CarsPageData> {
    const { sdb, request, user } = args;
    const { companyId } = sdb;
    const url = new URL(request.url);
    const { tab, search, sortBy, sortOrder } = parseListFilters(url, {
        tabs: CAR_TABS,
        defaultTab: "available",
        sortBy: ["createdAt", "id", "licensePlate", "pricePerDay", "mileage", "deposit"] as const,
        defaultSortBy: "createdAt",
        defaultSortOrder: "desc",
    });
    const activeStatus: CarTab = tab ?? "available";
    const { page, pageSize, offset } = getPaginationFromUrl(url);

    let cars: CarsPageCar[] = [];
    let statusCounts = { all: 0, available: 0, rented: 0, maintenance: 0, booked: 0 };
    let totalCount = 0;

    try {
        const [countsResult, result, countResult] = await Promise.all([
            sdb.cars.getStatusCounts(),
            sdb.cars.list({
                status: activeStatus,
                pageSize,
                offset,
                search,
                sortBy: sortBy || "createdAt",
                sortOrder,
            }) as Promise<CarListRow[]>,
            sdb.cars.count({
                status: activeStatus,
                search,
            }),
        ]);

        cars = result.map((car) => ({
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

        countsResult.forEach((row) => {
            const count = Number(row.count || 0);
            if (row.status === "available") statusCounts.available = count;
            if (row.status === "rented") statusCounts.rented = count;
            if (row.status === "maintenance") statusCounts.maintenance = count;
            if (row.status === "booked") statusCounts.booked = count;
        });
        statusCounts.all = statusCounts.available + statusCounts.rented + statusCounts.maintenance + statusCounts.booked;
        totalCount = countResult;
    } catch {
        cars = [];
    }

    return { user, cars, statusCounts, activeStatus, totalCount, page, pageSize, search, companyId };
}
