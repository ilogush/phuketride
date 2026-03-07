import { QUERY_LIMITS } from "~/lib/query-limits";
// Security helpers for multi-tenancy validation
type DbType = D1Database;

/**
 * Verify that a car belongs to the user's company
 * Throws Response(403) if validation fails
 */
export async function validateCarOwnership(
    db: DbType,
    carId: number,
    companyId: number
): Promise<void> {
    const car = await db
        .prepare("SELECT id FROM company_cars WHERE id = ? AND company_id = ? LIMIT 1")
        .bind(carId, companyId)
        .first<{ id: number }>();

    if (!car) {
        throw new Response("Car not found or doesn't belong to your company", { status: 403 });
    }
}

/**
 * Verify that a contract belongs to the user's company
 * Throws Response(403) if validation fails
 */
export async function validateContractOwnership(
    db: DbType,
    contractId: number,
    companyId: number
): Promise<void> {
    const contract = await db
        .prepare(
            `
            SELECT c.id, cc.company_id AS companyId
            FROM contracts c
            INNER JOIN company_cars cc ON c.company_car_id = cc.id
            WHERE c.id = ?
            LIMIT 1
            `
        )
        .bind(contractId)
        .first<{ id: number; companyId: number }>();

    if (!contract || contract.companyId !== companyId) {
        throw new Response("Contract not found or doesn't belong to your company", { status: 403 });
    }
}

/**
 * Verify that a booking belongs to the user's company
 * Throws Response(403) if validation fails
 */
export async function validateBookingOwnership(
    db: DbType,
    bookingId: number,
    companyId: number
): Promise<void> {
    const booking = await db
        .prepare(
            `
            SELECT b.id
            FROM bookings b
            INNER JOIN company_cars cc ON b.company_car_id = cc.id
            WHERE b.id = ? AND cc.company_id = ?
            LIMIT 1
            `
        )
        .bind(bookingId, companyId)
        .first<{ id: number }>();

    if (!booking) {
        throw new Response("Booking not found or doesn't belong to your company", { status: 403 });
    }
}

/**
 * Verify that a company exists
 * Throws Response(403) if validation fails
 */
export async function validateCompanyAccess(
    db: DbType,
    companyId: number
): Promise<void> {
    const company = await db
        .prepare("SELECT id FROM companies WHERE id = ? LIMIT 1")
        .bind(companyId)
        .first<{ id: number }>();

    if (!company) {
        throw new Response("Company not found", { status: 403 });
    }
}

/**
 * Get company clients (users who have contracts with this company)
 */
export async function getCompanyClients(
    db: DbType,
    companyId: number
) {
    const result = await db
        .prepare(
            `
            SELECT DISTINCT
              u.id,
              u.email,
              u.name,
              u.surname,
              u.phone,
              u.role
            FROM users u
            INNER JOIN contracts c ON u.id = c.client_id
            INNER JOIN company_cars cc ON c.company_car_id = cc.id
            WHERE cc.company_id = ? AND u.role = 'user'
            LIMIT ${QUERY_LIMITS.LARGE}
            `
        )
        .bind(companyId)
        .all();

    return (result.results ?? []) as Array<{
        id: string;
        email: string;
        name: string | null;
        surname: string | null;
        phone: string | null;
        role: string;
    }>;
}
