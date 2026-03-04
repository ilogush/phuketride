export type Currency = {
    id: number;
    name: string;
    code: string;
    symbol: string;
    companyId: number | null;
    isActive?: boolean | number | null;
};

export const isPhuketName = (value: unknown) => String(value || "").trim().toLowerCase() === "phuket";

export const normalizeCurrencyRow = (row: Record<string, unknown>): Currency => ({
    ...(row as Currency),
    companyId: (row.companyId as number | null | undefined) ?? (row.company_id as number | null | undefined) ?? null,
    isActive: (row.isActive as number | boolean | null | undefined) ?? (row.is_active as number | boolean | null | undefined) ?? null,
});

export const normalizeCompanyRow = (row: Record<string, unknown>) => ({
    ...row,
    locationId: (row.locationId as number | undefined) ?? (row.location_id as number | undefined) ?? null,
    districtId: (row.districtId as number | undefined) ?? (row.district_id as number | undefined) ?? null,
    houseNumber: (row.houseNumber as string | undefined) ?? (row.house_number as string | undefined) ?? "",
    bankName: (row.bankName as string | undefined) ?? (row.bank_name as string | undefined) ?? null,
    accountNumber: (row.accountNumber as string | undefined) ?? (row.account_number as string | undefined) ?? null,
    accountName: (row.accountName as string | undefined) ?? (row.account_name as string | undefined) ?? null,
    swiftCode: (row.swiftCode as string | undefined) ?? (row.swift_code as string | undefined) ?? null,
    deliveryFeeAfterHours:
        (row.deliveryFeeAfterHours as number | undefined) ??
        (row.delivery_fee_after_hours as number | undefined) ??
        null,
    islandTripPrice: (row.islandTripPrice as number | undefined) ?? (row.island_trip_price as number | undefined) ?? null,
    krabiTripPrice: (row.krabiTripPrice as number | undefined) ?? (row.krabi_trip_price as number | undefined) ?? null,
    babySeatPricePerDay:
        (row.babySeatPricePerDay as number | undefined) ?? (row.baby_seat_price_per_day as number | undefined) ?? null,
    weeklySchedule: (row.weeklySchedule as string | undefined) ?? (row.weekly_schedule as string | undefined) ?? null,
    holidays: (row.holidays as string | undefined) ?? (row.holidays as string | undefined) ?? null,
});

