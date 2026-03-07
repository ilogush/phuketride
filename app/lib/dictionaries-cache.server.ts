type CacheEntry<T> = {
    expiresAt: number;
    value: T;
};

import type {
    CurrencyDetailedRow,
    CurrencyRow,
    DictionaryRow,
    ModelRow,
    PaymentTemplateRow,
} from "~/lib/db-types";
import { QUERY_LIMITS } from "~/lib/query-limits";

export interface CachedLocationRow {
    id: number;
    name: string;
}

export interface CachedColorRow {
    id: number;
    name: string;
    hexCode: string | null;
}

export interface CachedDistrictRow {
    id: number;
    name: string;
    locationId: number;
    deliveryPrice?: number | null;
}

export interface CachedHotelRow {
    id: number;
    name: string;
}

export interface CachedSeasonRow {
    id: number;
    seasonName: string;
    startMonth: number;
    startDay: number;
    endMonth: number;
    endDay: number;
    priceMultiplier: number;
    discountLabel: string | null;
}

type CachedSeasonOrder = "priceMultiplierDesc" | "idAsc";

export interface CachedDurationRow {
    id: number;
    rangeName: string;
    minDays: number;
    maxDays: number | null;
    priceMultiplier: number;
    discountLabel: string | null;
}

export interface CachedCarTemplateOption {
    id: number;
    brand?: { name?: string | null };
    model?: { name?: string | null };
    bodyType?: { name?: string | null };
    fuelType?: { name?: string | null };
    engineVolume?: number | null;
    transmission?: string | null;
    seats?: number | null;
    doors?: number | null;
    drivetrain?: string | null;
    luggage_capacity?: string | null;
    rear_camera?: number | null;
    bluetooth_enabled?: number | null;
    carplay_enabled?: number | null;
    android_auto_enabled?: number | null;
    feature_air_conditioning?: number | null;
    feature_abs?: number | null;
    feature_airbags?: number | null;
}

const DEFAULT_TTL_MS = 2 * 60 * 1000;
const cache = new Map<string, CacheEntry<unknown>>();

export function invalidateCacheByPrefix(prefix: string) {
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
            cache.delete(key);
        }
    }
}

export function invalidateSettingsCaches(companyId?: number | null) {
    invalidateCacheByPrefix("dict:currencies");
    invalidateCacheByPrefix("dict:payment_types");
    if (companyId) {
        invalidateCacheByPrefix(`dict:payment_templates:company:${companyId}`);
        invalidateCacheByPrefix(`dict:payment_types:company:${companyId}`);
        invalidateCacheByPrefix(`dict:currencies:active:company:${companyId}`);
    }
}

async function getOrLoadCached<T>(key: string, load: () => Promise<T>, ttlMs = DEFAULT_TTL_MS): Promise<T> {
    const now = Date.now();
    const cached = cache.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > now) {
        return cached.value;
    }
    const value = await load();
    cache.set(key, { value, expiresAt: now + ttlMs });
    return value;
}

export async function getCachedCarBrands(db: D1Database): Promise<DictionaryRow[]> {
    return getOrLoadCached("dict:car_brands", async () => {
        const result = await db.prepare("SELECT id, name FROM car_brands ORDER BY name ASC").all();
        return (result.results || []) as unknown as DictionaryRow[];
    });
}

export async function getCachedCarModels(db: D1Database): Promise<ModelRow[]> {
    return getOrLoadCached("dict:car_models", async () => {
        const result = await db.prepare("SELECT id, name, brand_id FROM car_models ORDER BY name ASC").all();
        return (result.results || []) as unknown as ModelRow[];
    });
}

export async function getCachedBodyTypes(db: D1Database): Promise<DictionaryRow[]> {
    return getOrLoadCached("dict:body_types", async () => {
        const result = await db.prepare("SELECT id, name FROM body_types ORDER BY name ASC").all();
        return (result.results || []) as unknown as DictionaryRow[];
    });
}

export async function getCachedFuelTypes(db: D1Database): Promise<DictionaryRow[]> {
    return getOrLoadCached("dict:fuel_types", async () => {
        const result = await db.prepare("SELECT id, name FROM fuel_types ORDER BY name ASC").all();
        return (result.results || []) as unknown as DictionaryRow[];
    });
}

export async function getCachedColors(db: D1Database): Promise<CachedColorRow[]> {
    return getOrLoadCached("dict:colors", async () => {
        const result = await db
            .prepare("SELECT id, name, hex_code AS hexCode FROM colors ORDER BY name ASC")
            .all();
        return (result.results || []) as unknown as CachedColorRow[];
    });
}

export async function getCachedPaymentTypes(db: D1Database): Promise<DictionaryRow[]> {
    return getOrLoadCached("dict:payment_types", async () => {
        const result = await db.prepare("SELECT id, name FROM payment_types ORDER BY name ASC").all();
        return (result.results || []) as unknown as DictionaryRow[];
    });
}

export async function getCachedCurrencies(db: D1Database): Promise<CurrencyRow[]> {
    return getOrLoadCached("dict:currencies", async () => {
        const result = await db.prepare("SELECT id, code, symbol FROM currencies WHERE is_active = 1 ORDER BY code ASC").all();
        return (result.results || []) as unknown as CurrencyRow[];
    });
}

export async function getCachedPaymentTypesForCompany(db: D1Database, companyId: number): Promise<DictionaryRow[]> {
    return getOrLoadCached(`dict:payment_types:company:${companyId}`, async () => {
        const result = await db
            .prepare(`
                SELECT id, name
                FROM payment_types
                WHERE company_id IS NULL OR company_id = ?
                ORDER BY name ASC
            `)
            .bind(companyId)
            .all();
        return (result.results || []) as unknown as DictionaryRow[];
    });
}

export async function getCachedActiveCurrenciesForCompany(db: D1Database, companyId: number | null): Promise<CurrencyRow[]> {
    const key = companyId ? `dict:currencies:active:company:${companyId}` : "dict:currencies:active:company:none";
    return getOrLoadCached(key, async () => {
        const result = await db
            .prepare(`
                SELECT id, code, symbol
                FROM currencies
                WHERE is_active = 1 AND (? IS NULL OR company_id IS NULL OR company_id = ?)
                ORDER BY code ASC
            `)
            .bind(companyId, companyId)
            .all();
        return (result.results || []) as unknown as CurrencyRow[];
    });
}

export async function getCachedPaymentTemplatesForCompany(db: D1Database, companyId: number): Promise<PaymentTemplateRow[]> {
    return getOrLoadCached(`dict:payment_templates:company:${companyId}`, async () => {
        const result = await db
            .prepare(`
                SELECT
                    id, name, sign, description,
                    show_on_create AS showOnCreate,
                    show_on_close AS showOnClose,
                    is_active AS isActive,
                    is_system AS isSystem,
                    company_id AS companyId
                FROM payment_types
                WHERE company_id IS NULL OR company_id = ?
                ORDER BY name ASC
            `)
            .bind(companyId)
            .all();
        return (result.results || []) as unknown as PaymentTemplateRow[];
    });
}

export async function getCachedCurrenciesDetailed(db: D1Database): Promise<CurrencyDetailedRow[]> {
    return getOrLoadCached("dict:currencies:detailed", async () => {
        const result = await db
            .prepare(`
                SELECT
                    id, name, code, symbol,
                    company_id AS companyId,
                    is_active AS isActive
                FROM currencies
                ORDER BY name ASC
            `)
            .all();
        return (result.results || []) as unknown as CurrencyDetailedRow[];
    });
}

export async function getCachedLocations(db: D1Database): Promise<CachedLocationRow[]> {
    return getOrLoadCached("dict:locations", async () => {
        const result = await db.prepare("SELECT id, name FROM locations ORDER BY name ASC").all();
        return (result.results || []) as unknown as CachedLocationRow[];
    });
}

export async function getCachedDistricts(db: D1Database): Promise<CachedDistrictRow[]> {
    return getOrLoadCached("dict:districts", async () => {
        const result = await db
            .prepare("SELECT id, name, location_id AS locationId, delivery_price AS deliveryPrice FROM districts ORDER BY name ASC")
            .all();
        return (result.results || []) as unknown as CachedDistrictRow[];
    });
}

export async function getCachedHotels(db: D1Database): Promise<CachedHotelRow[]> {
    return getOrLoadCached("dict:hotels", async () => {
        const result = await db.prepare("SELECT id, name FROM hotels ORDER BY name ASC").all();
        return (result.results || []) as unknown as CachedHotelRow[];
    });
}

export async function getCachedSeasons(
    db: D1Database,
    options?: { limit?: number; order?: CachedSeasonOrder },
): Promise<CachedSeasonRow[]> {
    const limit = options?.limit ?? QUERY_LIMITS.SMALL;
    const order = options?.order ?? "priceMultiplierDesc";
    const orderBy = order === "idAsc" ? "id ASC" : "price_multiplier DESC";

    return getOrLoadCached(`dict:seasons:${order}:${limit}`, async () => {
        const result = await db.prepare(`
            SELECT
                id,
                season_name AS seasonName,
                start_month AS startMonth,
                start_day AS startDay,
                end_month AS endMonth,
                end_day AS endDay,
                price_multiplier AS priceMultiplier,
                discount_label AS discountLabel
            FROM seasons
            ORDER BY ${orderBy}
            LIMIT ${limit}
        `).all();
        return (result.results || []) as unknown as CachedSeasonRow[];
    });
}

export async function getCachedRentalDurations(db: D1Database, limit: number = QUERY_LIMITS.SMALL): Promise<CachedDurationRow[]> {
    return getOrLoadCached(`dict:rental_durations:${limit}`, async () => {
        const result = await db.prepare(`
            SELECT
                id,
                range_name AS rangeName,
                min_days AS minDays,
                max_days AS maxDays,
                price_multiplier AS priceMultiplier,
                discount_label AS discountLabel
            FROM rental_durations
            ORDER BY min_days ASC
            LIMIT ${limit}
        `).all();
        return (result.results || []) as unknown as CachedDurationRow[];
    });
}

export async function getCachedCarTemplateOptions(db: D1Database): Promise<CachedCarTemplateOption[]> {
    return getOrLoadCached("dict:car_template_options", async () => {
        const result = await db.prepare(`
            SELECT
                ct.*,
                cb.name AS brandName,
                cm.name AS modelName,
                bt.name AS bodyTypeName,
                ft.name AS fuelTypeName
            FROM car_templates ct
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            LEFT JOIN body_types bt ON bt.id = ct.body_type_id
            LEFT JOIN fuel_types ft ON ft.id = ct.fuel_type_id
            LIMIT ${QUERY_LIMITS.LARGE}
        `).all();

        return ((result.results || []) as Array<Record<string, unknown>>).map((template) => ({
            ...template,
            brand: { name: template.brandName as string | null | undefined },
            model: { name: template.modelName as string | null | undefined },
            bodyType: { name: template.bodyTypeName as string | null | undefined },
            fuelType: { name: template.fuelTypeName as string | null | undefined },
            engineVolume: (template.engine_volume as number | null | undefined) ?? null,
        })) as CachedCarTemplateOption[];
    });
}
