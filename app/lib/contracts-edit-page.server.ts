import { mapExtrasByType, type ExtraType } from "~/lib/contract-extras.server";
import { getEditableContractById } from "~/lib/contracts-repo.server";

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
    deposit_payment_method: string | null;
    total_amount: number | null;
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
    paymentMethod: string | null;
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
                payment_method AS paymentMethod,
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
        depositPaymentMethod: contractRaw.deposit_payment_method,
        totalAmount: contractRaw.total_amount,
        fuelLevel: contractRaw.fuel_level,
        cleanliness: contractRaw.cleanliness,
        fullInsuranceEnabled: !!extrasMap.full_insurance,
        babySeatEnabled: !!extrasMap.baby_seat,
        islandTripEnabled: !!extrasMap.island_trip,
        krabiTripEnabled: !!extrasMap.krabi_trip,
        fullInsurancePrice: extrasMap.full_insurance?.extraPrice ?? extrasMap.full_insurance?.amount ?? 0,
        babySeatPrice: extrasMap.baby_seat?.extraPrice ?? extrasMap.baby_seat?.amount ?? 0,
        islandTripPrice: extrasMap.island_trip?.extraPrice ?? extrasMap.island_trip?.amount ?? 0,
        krabiTripPrice: extrasMap.krabi_trip?.extraPrice ?? extrasMap.krabi_trip?.amount ?? 0,
        startMileage: contractRaw.start_mileage,
        companyCar: {
            id: contractRaw.carId,
            companyId: contractRaw.companyId,
            licensePlate: contractRaw.licensePlate,
        },
        client: {
            id: contractRaw.clientId,
            name: contractRaw.clientName,
            surname: contractRaw.clientSurname,
            phone: contractRaw.clientPhone,
            email: contractRaw.clientEmail,
            whatsapp: contractRaw.clientWhatsapp,
            telegram: contractRaw.clientTelegram,
            passportNumber: contractRaw.clientPassport,
            passportPhotos: contractRaw.clientPassportPhotos,
            driverLicensePhotos: contractRaw.clientDriverLicensePhotos,
        },
    };

    const [cars, districts] = await Promise.all([
        sdb.db
            .prepare("SELECT id, license_plate AS licensePlate FROM company_cars WHERE company_id = ? AND status = 'available' AND archived_at IS NULL")
            .bind(sdb.companyId ?? contract.companyCar.companyId)
            .all()
            .then((result) => ((result.results || []) as Array<{ id: number; licensePlate: string }>).map((row) => ({
                id: row.id,
                name: row.licensePlate,
            }))),
        sdb.db
            .prepare("SELECT id, name FROM districts WHERE is_active = 1")
            .all()
            .then((result) => (result.results || []) as Array<{ id: number; name: string }>),
    ]);

    return { contract, cars, districts, client: contract.client };
}
