import { QUERY_LIMITS } from "~/lib/query-limits";
import { getCachedActiveCurrenciesForCompany, getCachedDistricts } from "~/lib/dictionaries-cache.server";
import type { CurrencyRow } from "~/lib/db-types";

export type RentalCreateCarOption = {
    id: number;
    name: string;
    pricePerDay: number;
    deposit: number;
};

export type RentalCreateDistrictOption = {
    id: number;
    name: string;
    deliveryPrice: number | null;
};

type RentalCreateCarRow = {
    id: number;
    pricePerDay: number | null;
    deposit: number | null;
    licensePlate: string | null;
    year: number | null;
    brandName: string | null;
    modelName: string | null;
};

function mapRentalCarOption(car: RentalCreateCarRow): RentalCreateCarOption {
    const title = [car.brandName, car.modelName, car.year].filter(Boolean).join(" ").trim();
    return {
        id: car.id,
        name: [title, car.licensePlate].filter(Boolean).join(" - "),
        pricePerDay: car.pricePerDay ?? 0,
        deposit: car.deposit ?? 0,
    };
}

export async function loadRentalCreateBaseData(db: D1Database, companyId: number): Promise<{
    cars: RentalCreateCarOption[];
    districts: RentalCreateDistrictOption[];
}> {
    const [carsRaw, districtsRaw] = await Promise.all([
        db.prepare(`
            SELECT
                cc.id,
                cc.price_per_day AS pricePerDay,
                cc.deposit,
                cc.license_plate AS licensePlate,
                cc.year,
                cb.name AS brandName,
                cm.name AS modelName
            FROM company_cars cc
            LEFT JOIN car_templates ct ON ct.id = cc.template_id
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            WHERE cc.company_id = ? AND cc.status = 'available' AND cc.archived_at IS NULL
            LIMIT ${QUERY_LIMITS.MEDIUM}
        `)
            .bind(companyId)
            .all()
            .then((result) => ((result.results || []) as unknown as RentalCreateCarRow[])),
        getCachedDistricts(db),
    ]);

    return {
        cars: carsRaw.map(mapRentalCarOption),
        districts: districtsRaw.map((district) => ({
            id: district.id,
            name: district.name,
            deliveryPrice: district.deliveryPrice ?? null,
        })),
    };
}

export async function loadContractCreatePageData(db: D1Database, companyId: number) {
    const [baseData, currencies] = await Promise.all([
        loadRentalCreateBaseData(db, companyId),
        getCachedActiveCurrenciesForCompany(db, companyId) as Promise<CurrencyRow[]>,
    ]);

    return {
        ...baseData,
        currencies:
            Array.isArray(currencies) && currencies.length > 0
                ? currencies
                : [{ id: 1, code: "THB", symbol: "฿" }],
    };
}
