// Security helpers for multi-tenancy validation
type DbType = D1Database;

/**
 * Verify that a car belongs to the user's company
 * Throws error if validation fails
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
        throw new Error("Car not found or doesn't belong to your company");
    }
}

/**
 * Verify that a contract belongs to the user's company
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
        throw new Error("Contract not found or doesn't belong to your company");
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
            LIMIT 100
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
