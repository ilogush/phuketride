import { QUERY_LIMITS } from "~/lib/query-limits";
import {
    getCachedDistricts,
    getCachedLocations,
    type CachedDistrictRow,
    type CachedLocationRow,
} from "~/lib/dictionaries-cache.server";

export interface CompanyAssignableUserRow {
    id: string;
    email: string;
    name: string | null;
    surname: string | null;
    role: string;
    phone: string | null;
}

export async function loadCreateCompanyPageData(db: D1Database): Promise<{
    locations: CachedLocationRow[];
    districts: CachedDistrictRow[];
    users: CompanyAssignableUserRow[];
}> {
    const [locations, districts, users] = await Promise.all([
        getCachedLocations(db),
        getCachedDistricts(db),
        db
            .prepare(`
                SELECT id, email, name, surname, role, phone
                FROM users
                WHERE role != 'admin'
                ORDER BY created_at DESC
                LIMIT ${QUERY_LIMITS.XL}
            `)
            .all()
            .then((result) => ((result.results || []) as unknown as CompanyAssignableUserRow[])),
    ]);

    return {
        locations,
        districts,
        users,
    };
}
