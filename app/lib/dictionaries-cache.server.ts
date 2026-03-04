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

const DEFAULT_TTL_MS = 2 * 60 * 1000;
const cache = new Map<string, CacheEntry<unknown>>();

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

export async function getCachedColors(db: D1Database): Promise<DictionaryRow[]> {
    return getOrLoadCached("dict:colors", async () => {
        const result = await db.prepare("SELECT id, name FROM colors ORDER BY name ASC").all();
        return (result.results || []) as unknown as DictionaryRow[];
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
