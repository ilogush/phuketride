type DbType = D1Database;

export const EXTRA_TYPES = [
    "full_insurance",
    "delivery_fee_after_hours",
    "baby_seat",
    "island_trip",
    "krabi_trip",
] as const;
export type ExtraType = (typeof EXTRA_TYPES)[number];

export interface ExtraPaymentRow {
    id: number;
    extraType: ExtraType;
    extraPrice: number | null;
    amount: number | null;
    currency: string | null;
    currencyId: number | null;
    paymentTypeId: number | null;
}

export function getExtraFlagsFromFormData(formData: FormData): Record<ExtraType, boolean> {
    return {
        full_insurance: formData.get("fullInsurance") === "true",
        delivery_fee_after_hours: formData.get("deliveryFeeAfterHours") === "true",
        baby_seat: formData.get("babySeat") === "true",
        island_trip: formData.get("islandTrip") === "true",
        krabi_trip: formData.get("krabiTrip") === "true",
    };
}

export function getExtraInputFromFormData(formData: FormData, extraType: ExtraType) {
    return {
        amount: Number(formData.get(`extra_${extraType}_amount`)) || 0,
        currencyId: Number(formData.get(`extra_${extraType}_currency`)) || null,
    };
}

export async function getCurrencyCodeById(db: DbType): Promise<Map<number, string>> {
    const currenciesResult = await db.prepare("SELECT id, code FROM currencies WHERE is_active = 1").all() as { results?: Array<{ id: number; code: string }> };
    const rows = (currenciesResult?.results || []) as Array<{ id: number; code: string }>;
    return new Map(rows.map((row) => [Number(row.id), row.code]));
}

export function mapExtrasByType(rows: Array<Partial<ExtraPaymentRow> & { extraType?: string }>) {
    return Object.fromEntries(
        rows
            .filter((row) => typeof row.extraType === "string")
            .map((row) => [row.extraType as ExtraType, row])
    ) as Partial<Record<ExtraType, Partial<ExtraPaymentRow>>>;
}

export function getCreateExtraPaymentStmt(params: {
    db: DbType;
    contractId: number;
    userId: string;
    extraType: ExtraType;
    amount: number;
    currency: string;
    currencyId?: number | null;
    nowIso?: string;
}): D1PreparedStatement {
    const nowIso = params.nowIso || new Date().toISOString();
    return params.db
        .prepare(`
            INSERT INTO payments (
                contract_id, amount, currency, currency_id, status, created_by, created_at, updated_at,
                extra_type, extra_enabled, extra_price
            ) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, 1, ?)
        `)
        .bind(
            params.contractId,
            params.amount,
            params.currency,
            params.currencyId ?? null,
            params.userId,
            nowIso,
            nowIso,
            params.extraType,
            params.amount
        );
}
