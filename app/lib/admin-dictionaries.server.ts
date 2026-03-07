import { QUERY_LIMITS } from "~/lib/query-limits";
import {
    getCachedColors,
    getCachedDistricts,
    getCachedLocations,
    getCachedRentalDurations,
    getCachedSeasons,
} from "~/lib/dictionaries-cache.server";

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
    locationName?: string | null;
    districtId: number;
    districtName?: string | null;
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
    return getCachedColors(db) as Promise<AdminColorRow[]>;
}

export async function loadAdminColorsPage(
    db: D1Database,
    options?: { limit?: number; offset?: number; search?: string }
) {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const search = options?.search ?? "";

    if (!search && offset === 0 && limit >= 50) {
        return getCachedColors(db) as Promise<AdminColorRow[]>;
    }

    let query = `SELECT id, name, hex_code AS hexCode FROM colors`;
    const params: (string | number)[] = [];

    if (search) {
        query += ` WHERE name LIKE ?`;
        params.push(`%${search}%`);
    }

    query += ` ORDER BY id ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await db.prepare(query).bind(...params).all();
    return (result.results ?? []) as unknown as AdminColorRow[];
}

export async function countAdminColors(db: D1Database, search?: string) {
    let query = `SELECT COUNT(*) as count FROM colors`;
    const params: (string | number)[] = [];

    if (search) {
        query += ` WHERE name LIKE ?`;
        params.push(`%${search}%`);
    }

    const result = await db.prepare(query).bind(...params).first<{ count: number }>();
    return result?.count ?? 0;
}

export interface AdminBrandRow {
    id: number;
    name: string;
    logo: string | null;
    modelsCount: number;
    createdAt: string;
}

export interface AdminModelRow {
    id: number;
    brandName: string;
    brandId: number;
    name: string;
    bodyTypeId?: number | null;
    bodyTypeName?: string | null;
}

export async function loadAdminModels(db: D1Database) {
    const result = await db
        .prepare(`
            SELECT 
                m.id, 
                m.name, 
                m.brand_id AS brandId,
                b.name AS brandName,
                m.body_type_id AS bodyTypeId,
                bt.name AS bodyTypeName
            FROM car_models m
            JOIN car_brands b ON b.id = m.brand_id
            LEFT JOIN body_types bt ON bt.id = m.body_type_id
            ORDER BY b.name ASC, m.name ASC
        `)
        .all();
    return (result.results ?? []) as unknown as AdminModelRow[];
}

export async function loadAdminModelsPage(
    db: D1Database,
    options?: { limit?: number; offset?: number; search?: string }
) {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    const search = options?.search ?? "";

    let query = `
        SELECT 
            m.id, 
            m.name, 
            m.brand_id AS brandId,
            b.name AS brandName,
            m.body_type_id AS bodyTypeId,
            bt.name AS bodyTypeName
        FROM car_models m
        JOIN car_brands b ON b.id = m.brand_id
        LEFT JOIN body_types bt ON bt.id = m.body_type_id
    `;
    const params: (string | number)[] = [];

    if (search) {
        query += ` WHERE m.name LIKE ? OR b.name LIKE ?`;
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY b.name ASC, m.name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await db.prepare(query).bind(...params).all();
    return (result.results ?? []) as unknown as AdminModelRow[];
}

export async function countAdminModels(db: D1Database, search?: string) {
    let query = `
        SELECT COUNT(*) as count
        FROM car_models m
        JOIN car_brands b ON b.id = m.brand_id
    `;
    const params: (string | number)[] = [];

    if (search) {
        query += ` WHERE m.name LIKE ? OR b.name LIKE ?`;
        params.push(`%${search}%`, `%${search}%`);
    }

    const result = await db.prepare(query).bind(...params).first<{ count: number }>();
    return result?.count ?? 0;
}

export async function loadAdminBrands(db: D1Database) {
    const result = await db
        .prepare(`
            SELECT 
                b.id, 
                b.name, 
                b.logo, 
                b.created_at AS createdAt,
                (SELECT COUNT(*) FROM car_models m WHERE m.brand_id = b.id) AS modelsCount
            FROM car_brands b
            ORDER BY b.name ASC
        `)
        .all();
    return (result.results ?? []) as unknown as AdminBrandRow[];
}

export async function loadAdminColorById(db: D1Database, colorId: number) {
    const result = await db
        .prepare("SELECT id, name, hex_code AS hexCode FROM colors WHERE id = ? LIMIT 1")
        .bind(colorId)
        .all();

    return ((result.results ?? []) as unknown as AdminColorRow[])[0] ?? null;
}

export async function loadAdminLocations(db: D1Database, limit: number = QUERY_LIMITS.LARGE) {
    const locations = await getCachedLocations(db);
    return locations.slice(0, limit) as AdminLocationRow[];
}

export async function loadAdminDistricts(
    db: D1Database,
    options?: { includeDetails?: boolean; limit?: number; offset?: number; search?: string }
) {
    const includeDetails = options?.includeDetails ?? false;
    const limit = options?.limit ?? QUERY_LIMITS.LARGE;
    const offset = options?.offset ?? 0;
    const search = options?.search ?? "";

    if (!includeDetails && !search && offset === 0) {
        const districts = await getCachedDistricts(db);
        return districts.slice(0, limit) as AdminDistrictRow[];
    }

    let query = `
        SELECT
            d.id,
            d.name,
            d.location_id AS locationId,
            l.name AS locationName,
            d.beaches,
            d.delivery_price AS deliveryPrice,
            d.created_at AS createdAt,
            d.updated_at AS updatedAt
        FROM districts d
        LEFT JOIN locations l ON d.location_id = l.id
    `;
    const params: any[] = [];

    if (search) {
        query += ` WHERE d.name LIKE ? OR l.name LIKE ?`;
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY d.id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await db.prepare(query).bind(...params).all();
    return (result.results ?? []) as unknown as AdminDistrictRow[];
}

export async function countAdminDistricts(db: D1Database, search?: string) {
    let query = `
        SELECT COUNT(*) as count
        FROM districts d
        LEFT JOIN locations l ON d.location_id = l.id
    `;
    const params: any[] = [];

    if (search) {
        query += ` WHERE d.name LIKE ? OR l.name LIKE ?`;
        params.push(`%${search}%`, `%${search}%`);
    }

    const result = await db.prepare(query).bind(...params).first<{ count: number }>();
    return result?.count ?? 0;
}

export async function loadAdminHotels(
    db: D1Database,
    options?: { limit?: number; offset?: number; search?: string }
) {
    const limit = options?.limit ?? QUERY_LIMITS.LARGE;
    const offset = options?.offset ?? 0;
    const search = options?.search ?? "";

    let query = `
        SELECT
            h.id,
            h.name,
            h.location_id AS locationId,
            l.name AS locationName,
            h.district_id AS districtId,
            d.name AS districtName,
            h.address,
            h.created_at AS createdAt,
            h.updated_at AS updatedAt
        FROM hotels h
        LEFT JOIN locations l ON h.location_id = l.id
        LEFT JOIN districts d ON h.district_id = d.id
    `;
    const params: any[] = [];

    if (search) {
        query += ` WHERE h.name LIKE ? OR l.name LIKE ? OR d.name LIKE ?`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY h.id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await db.prepare(query).bind(...params).all();
    return (result.results ?? []) as unknown as AdminHotelRow[];
}

export async function countAdminHotels(db: D1Database, search?: string) {
    let query = `
        SELECT COUNT(*) as count
        FROM hotels h
        LEFT JOIN locations l ON h.location_id = l.id
        LEFT JOIN districts d ON h.district_id = d.id
    `;
    const params: any[] = [];

    if (search) {
        query += ` WHERE h.name LIKE ? OR l.name LIKE ? OR d.name LIKE ?`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const result = await db.prepare(query).bind(...params).first<{ count: number }>();
    return result?.count ?? 0;
}

export async function loadAdminDurations(db: D1Database) {
    return getCachedRentalDurations(db, QUERY_LIMITS.LARGE) as Promise<AdminDurationRow[]>;
}

export interface AdminPaymentStatusRow {
    id: number;
    name: string;
}

export async function loadAdminPaymentStatuses(db: D1Database) {
    const result = await db.prepare("SELECT id, name FROM payment_statuses ORDER BY id ASC").all();
    return (result.results ?? []) as unknown as AdminPaymentStatusRow[];
}

export async function loadAdminSeasons(db: D1Database) {
    return getCachedSeasons(db, { limit: QUERY_LIMITS.LARGE, order: "idAsc" }) as Promise<AdminSeasonRow[]>;
}
