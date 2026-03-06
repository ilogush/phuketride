import { QUERY_LIMITS } from "~/lib/query-limits";

export interface AdminColorRow {
    id: number;
    name: string;
    hexCode: string | null;
}

export interface AdminLocationRow {
    id: number;
    name: string;
}

export interface AdminDistrictRow {
    id: number;
    name: string;
    locationId: number;
    beaches?: string | null;
    deliveryPrice?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface AdminHotelRow {
    id: number;
    name: string;
    locationId: number;
    districtId: number;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface AdminDurationRow {
    id: number;
    rangeName: string;
    minDays: number;
    maxDays: number | null;
    priceMultiplier: number;
    discountLabel: string | null;
}

export interface AdminSeasonRow {
    id: number;
    seasonName: string;
    startMonth: number;
    startDay: number;
    endMonth: number;
    endDay: number;
    priceMultiplier: number;
    discountLabel: string | null;
}

export async function loadAdminColors(db: D1Database) {
    const result = await db
        .prepare(`SELECT id, name, hex_code AS hexCode FROM colors LIMIT ${QUERY_LIMITS.LARGE}`)
        .all();
    return (result.results ?? []) as unknown as AdminColorRow[];
}

export async function loadAdminColorById(db: D1Database, colorId: number) {
    const result = await db
        .prepare("SELECT id, name, hex_code AS hexCode FROM colors WHERE id = ? LIMIT 1")
        .bind(colorId)
        .all();

    return ((result.results ?? []) as unknown as AdminColorRow[])[0] ?? null;
}

export async function loadAdminLocations(db: D1Database, limit = QUERY_LIMITS.LARGE) {
    const result = await db
        .prepare(`SELECT id, name FROM locations LIMIT ${limit}`)
        .all();
    return (result.results ?? []) as unknown as AdminLocationRow[];
}

export async function loadAdminDistricts(db: D1Database, options?: { includeDetails?: boolean; limit?: number }) {
    const includeDetails = options?.includeDetails ?? false;
    const limit = options?.limit ?? QUERY_LIMITS.LARGE;

    const query = includeDetails
        ? `SELECT id, name, location_id AS locationId, beaches, delivery_price AS deliveryPrice, created_at AS createdAt, updated_at AS updatedAt FROM districts LIMIT ${limit}`
        : `SELECT id, name, location_id AS locationId FROM districts LIMIT ${limit}`;

    const result = await db.prepare(query).all();
    return (result.results ?? []) as unknown as AdminDistrictRow[];
}

export async function loadAdminHotels(db: D1Database) {
    const result = await db
        .prepare(`SELECT id, name, location_id AS locationId, district_id AS districtId, address, created_at AS createdAt, updated_at AS updatedAt FROM hotels LIMIT ${QUERY_LIMITS.LARGE}`)
        .all();
    return (result.results ?? []) as unknown as AdminHotelRow[];
}

export async function loadAdminDurations(db: D1Database) {
    const result = await db
        .prepare(`
            SELECT
                id,
                range_name AS rangeName,
                min_days AS minDays,
                max_days AS maxDays,
                price_multiplier AS priceMultiplier,
                discount_label AS discountLabel
            FROM rental_durations
            ORDER BY min_days ASC
            LIMIT ${QUERY_LIMITS.LARGE}
        `)
        .all() as { results?: AdminDurationRow[] };
    return result.results || [];
}

export async function loadAdminSeasons(db: D1Database) {
    const result = await db
        .prepare(`
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
            ORDER BY id ASC
            LIMIT ${QUERY_LIMITS.LARGE}
        `)
        .all() as { results?: AdminSeasonRow[] };
    return result.results || [];
}
