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
    return getCachedColors(db) as Promise<AdminColorRow[]>;
}

export async function loadAdminColorById(db: D1Database, colorId: number) {
    const result = await db
        .prepare("SELECT id, name, hex_code AS hexCode FROM colors WHERE id = ? LIMIT 1")
        .bind(colorId)
        .all();

    return ((result.results ?? []) as unknown as AdminColorRow[])[0] ?? null;
}

export async function loadAdminLocations(db: D1Database, limit = QUERY_LIMITS.LARGE) {
    const locations = await getCachedLocations(db);
    return locations.slice(0, limit) as AdminLocationRow[];
}

export async function loadAdminDistricts(db: D1Database, options?: { includeDetails?: boolean; limit?: number }) {
    const includeDetails = options?.includeDetails ?? false;
    const limit = options?.limit ?? QUERY_LIMITS.LARGE;

    if (!includeDetails) {
        const districts = await getCachedDistricts(db);
        return districts.slice(0, limit) as AdminDistrictRow[];
    }

    const result = await db
        .prepare(`SELECT id, name, location_id AS locationId, beaches, delivery_price AS deliveryPrice, created_at AS createdAt, updated_at AS updatedAt FROM districts LIMIT ${limit}`)
        .all();
    return (result.results ?? []) as unknown as AdminDistrictRow[];
}

export async function loadAdminHotels(db: D1Database) {
    const result = await db
        .prepare(`SELECT id, name, location_id AS locationId, district_id AS districtId, address, created_at AS createdAt, updated_at AS updatedAt FROM hotels LIMIT ${QUERY_LIMITS.LARGE}`)
        .all();
    return (result.results ?? []) as unknown as AdminHotelRow[];
}

export async function loadAdminDurations(db: D1Database) {
    return getCachedRentalDurations(db, QUERY_LIMITS.LARGE) as Promise<AdminDurationRow[]>;
}

export async function loadAdminSeasons(db: D1Database) {
    return getCachedSeasons(db, { limit: QUERY_LIMITS.LARGE, order: "idAsc" }) as Promise<AdminSeasonRow[]>;
}
