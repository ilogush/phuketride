import type { LoaderFunctionArgs } from "react-router";
import type { SessionUser } from "~/lib/auth.server";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";
import { QUERY_LIMITS } from "~/lib/query-limits";

const PHUKET_LOCATION_ID = 1;

export interface LocationsPageDistrict {
    id: number;
    name: string;
    locationId: number;
    beaches: string | null;
    streets: string | null;
    isActive: boolean;
    deliveryPrice: number | null;
    createdAt: Date;
    updatedAt: Date;
}

type PartnerDistrictSettingRow = {
    id: number;
    name: string;
    location_id: number;
    beaches: string | null;
    streets: string | null;
    company_is_active: number | null;
    company_delivery_price: number | null;
    district_is_active: number;
    district_delivery_price: number | null;
    created_at: Date;
    updated_at: Date;
};

type AdminDistrictRow = {
    id: number;
    name: string;
    location_id: number;
    beaches: string | null;
    streets: string | null;
    is_active: number;
    delivery_price: number | null;
    created_at: Date;
    updated_at: Date;
};

async function loadPartnerDistricts(
    db: D1Database,
    effectiveCompanyId: number,
): Promise<LocationsPageDistrict[]> {
    const settings = await db
        .prepare(`
            SELECT
                d.id,
                d.name,
                d.location_id,
                d.beaches,
                d.streets,
                cds.is_active AS company_is_active,
                cds.delivery_price AS company_delivery_price,
                d.is_active AS district_is_active,
                d.delivery_price AS district_delivery_price,
                d.created_at,
                d.updated_at
            FROM districts d
            LEFT JOIN company_delivery_settings cds
                ON cds.district_id = d.id AND cds.company_id = ?
            WHERE d.location_id = ?
            LIMIT ${QUERY_LIMITS.LARGE}
        `)
        .bind(effectiveCompanyId, PHUKET_LOCATION_ID)
        .all() as { results?: PartnerDistrictSettingRow[] };

    return (settings.results || []).map((district) => ({
        id: district.id,
        name: district.name,
        locationId: district.location_id,
        beaches: district.beaches,
        streets: district.streets,
        isActive: district.company_is_active === null || district.company_is_active === undefined
            ? !!district.district_is_active
            : !!district.company_is_active,
        deliveryPrice: district.company_delivery_price === null || district.company_delivery_price === undefined
            ? district.district_delivery_price
            : district.company_delivery_price,
        createdAt: district.created_at,
        updatedAt: district.updated_at,
    }));
}

async function loadAdminDistricts(db: D1Database): Promise<LocationsPageDistrict[]> {
    const districtsRaw = await db
        .prepare(`
            SELECT
                id,
                name,
                location_id,
                beaches,
                streets,
                is_active,
                delivery_price,
                created_at,
                updated_at
            FROM districts
            WHERE location_id = ?
            LIMIT ${QUERY_LIMITS.LARGE}
        `)
        .bind(PHUKET_LOCATION_ID)
        .all() as { results?: AdminDistrictRow[] };

    return (districtsRaw.results || []).map((district) => ({
        id: district.id,
        name: district.name,
        locationId: district.location_id,
        beaches: district.beaches,
        streets: district.streets,
        isActive: !!district.is_active,
        deliveryPrice: district.delivery_price,
        createdAt: district.created_at,
        updatedAt: district.updated_at,
    }));
}

export async function loadLocationsPageData({
    request,
    context,
    user,
}: {
    request: Request;
    context: LoaderFunctionArgs["context"];
    user: SessionUser;
}) {
    const effectiveCompanyId = getEffectiveCompanyId(request, user);
    const isModMode = user.role === "admin" && effectiveCompanyId !== null;
    const canUseCompanyDeliveryView = user.role === "partner" || isModMode;

    const districts = canUseCompanyDeliveryView && effectiveCompanyId
        ? await loadPartnerDistricts(context.cloudflare.env.DB, effectiveCompanyId)
        : await loadAdminDistricts(context.cloudflare.env.DB);

    return { districts, user, isModMode };
}
