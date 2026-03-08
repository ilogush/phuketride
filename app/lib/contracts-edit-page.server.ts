import { mapExtrasByType, type ExtraType } from "~/lib/contract-extras.server";
import { getEditableContractById } from "~/lib/contracts-repo.server";
import { getCachedActiveCurrenciesForCompany, getCachedDistricts } from "~/lib/dictionaries-cache.server";
import type { D1DatabaseLike as D1Database } from "./repo-types.server";

type ContractLoaderRow = {
    id: number;
    company_car_id: number;
    start_date: string;
    end_date: string;
    pickup_district_id: number | null;
    pickup_hotel: string | null;
    pickup_room: string | null;
    return_district_id: number | null;
    return_hotel: string | null;
    return_room: string | null;
    delivery_cost: number | null;
    return_cost: number | null;
    deposit_amount: number | null;
    total_amount: number | null;
    total_currency: string | null;
    deposit_currency: string | null;
    fuel_level: string | null;
    cleanliness: string | null;
    start_mileage: number | null;
    carId: number;
    companyId: number;
    licensePlate: string;
    clientId: string;
    clientName: string | null;
    clientSurname: string | null;
    clientPhone: string | null;
    clientEmail: string | null;
    clientWhatsapp: string | null;
    clientTelegram: string | null;
    clientPassport: string | null;
    clientPassportPhotos: string | null;
    clientDriverLicensePhotos: string | null;
    notes: string | null;
    photos: string | null;
};

type ContractExtraRow = {
    id: number;
    extraType: ExtraType;
    extraPrice: number | null;
    amount: number | null;
    paymentTypeId: number | null;
    currency: string | null;
    currencyId: number | null;
    status: string | null;
    notes: string | null;
};

import type { ScopedDb } from "~/lib/db-factory.server";

export async function loadEditContractPageData(sdb: ScopedDb, contractId: number) {
    const contractRaw = await sdb.contracts.getDetail(contractId) as ContractLoaderRow | null;

    if (!contractRaw) {
        throw new Response("Contract not found", { status: 404 });
    }

    const extrasResult = await sdb.db
        .prepare(`
            SELECT
                id,
                extra_type AS extraType,
                extra_price AS extraPrice,
                amount,
                payment_type_id AS paymentTypeId,
                currency,
                currency_id AS currencyId,
                status,
                notes
            FROM payments
            WHERE contract_id = ? AND extra_type IS NOT NULL
        `)
        .bind(contractId)
        .all() as { results?: ContractExtraRow[] };

    const extrasRows = (extrasResult.results || []) as ContractExtraRow[];
    const extrasMap = mapExtrasByType(extrasRows);
    const contract = {
        ...contractRaw,
        companyCarId: contractRaw.company_car_id,
        startDate: contractRaw.start_date,
        endDate: contractRaw.end_date,
        pickupDistrictId: contractRaw.pickup_district_id,
        pickupHotel: contractRaw.pickup_hotel,
        pickupRoom: contractRaw.pickup_room,
        returnDistrictId: contractRaw.return_district_id,
        returnHotel: contractRaw.return_hotel,
        returnRoom: contractRaw.return_room,
        deliveryCost: contractRaw.delivery_cost,
        returnCost: contractRaw.return_cost,
        depositAmount: contractRaw.deposit_amount,
        totalAmount: contractRaw.total_amount,
        totalCurrency: contractRaw.total_currency,
        depositCurrency: contractRaw.deposit_currency,
        fuelLevel: contractRaw.fuel_level,
        cleanliness: contractRaw.cleanliness,
        startMileage: contractRaw.start_mileage,
        notes: contractRaw.notes,
        photos: contractRaw.photos,
        client: {
            id: contractRaw.clientId,
            name: contractRaw.clientName,
            surname: contractRaw.clientSurname,
            phone: contractRaw.clientPhone,
            email: contractRaw.clientEmail,
            whatsapp: contractRaw.clientWhatsapp,
            telegram: contractRaw.clientTelegram,
            passport: contractRaw.clientPassport,
            passportPhotos: contractRaw.clientPassportPhotos,
            driverLicensePhotos: contractRaw.clientDriverLicensePhotos,
        },
        companyCar: {
            id: contractRaw.carId,
            companyId: contractRaw.companyId,
            licensePlate: contractRaw.licensePlate,
        },
        extras: extrasMap,
    };

    const [cars, districts, currencies, extraSettings, contractPayments] = await Promise.all([
        sdb.db
            .prepare("SELECT id, license_plate AS licensePlate FROM company_cars WHERE company_id = ? AND status = 'available' AND archived_at IS NULL")
            .bind(sdb.companyId ?? contract.companyCar.companyId)
            .all()
            .then((result) => ((result.results || []) as Array<{ id: number; licensePlate: string }>).map((row) => ({
                id: row.id,
                name: row.licensePlate,
            }))),
        getCachedDistricts(sdb.db as any),
        getCachedActiveCurrenciesForCompany(sdb.db as any, sdb.companyId!),
        sdb.db
            .prepare("SELECT delivery_fee_after_hours, island_trip_price, krabi_trip_price, baby_seat_price_per_day FROM companies WHERE id = ?")
            .bind(sdb.companyId ?? contract.companyCar.companyId)
            .first() as Promise<{
              delivery_fee_after_hours?: number | null;
              island_trip_price?: number | null;
              krabi_trip_price?: number | null;
              baby_seat_price_per_day?: number | null;
            } | null>,
        sdb.db
            .prepare(`
                SELECT
                    id, amount, currency, status, created_at AS createdAt, extra_type AS extraType, notes
                FROM payments
                WHERE contract_id = ?
                ORDER BY created_at DESC
            `)
            .bind(contractId)
            .all()
    ]);

    const totalCurrencyRow = (currencies as any[])?.find(c => c.code === contractRaw.total_currency);
    const depositCurrencyRow = (currencies as any[])?.find(c => c.code === contractRaw.deposit_currency);

    return { 
        contract: {
            ...contract,
            totalCurrencyId: totalCurrencyRow?.id,
            depositCurrencyId: depositCurrencyRow?.id,
        }, 
        cars, 
        districts, 
        client: contract.client,
        currencies: (currencies as any[]) || [{ id: 1, code: "THB", symbol: "฿" }],
        extraSettings,
        payments: (contractPayments.results || []) as Array<{
            id: number;
            amount: number;
            currency: string;
            status: string;
            createdAt: string;
            extraType: string | null;
            notes: string | null;
        }>
    };
}
