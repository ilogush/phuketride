// Contract calculation helpers
type DbType = D1Database;

/**
 * Calculate amount paid for a contract from payments
 * Returns sum of (amount * sign) where sign is +1 or -1
 */
export async function calculateAmountPaid(
    db: DbType,
    contractId: number
): Promise<number> {
    const result = await db
        .prepare(
            `
            SELECT
              COALESCE(
                SUM(
                  CASE
                    WHEN pt.sign = '+' THEN p.amount
                    WHEN pt.sign = '-' THEN -p.amount
                    ELSE 0
                  END
                ),
                0
              ) AS total
            FROM payments p
            INNER JOIN payment_types pt ON p.payment_type_id = pt.id
            WHERE p.contract_id = ? AND p.status = 'completed'
            `
        )
        .bind(contractId)
        .first<{ total: number }>();

    return Number(result?.total || 0);
}

/**
 * Get contract with calculated amount_paid
 */
export async function getContractWithAmountPaid(
    db: DbType,
    contractId: number
) {
    const contract = await db
        .prepare(`
            SELECT
                id, company_car_id, client_id, manager_id, booking_id,
                start_date, end_date, actual_end_date,
                total_amount, total_currency,
                deposit_amount, deposit_currency, deposit_payment_method,
                pickup_district_id, pickup_hotel, pickup_room, delivery_cost,
                return_district_id, return_hotel, return_room, return_cost,
                start_mileage, end_mileage, fuel_level, cleanliness,
                status, notes, photos, created_at, updated_at
            FROM contracts
            WHERE id = ?
            LIMIT 1
        `)
        .bind(contractId)
        .first<Record<string, unknown>>();

    if (!contract) return null;

    const amountPaid = await calculateAmountPaid(db, contractId);

    return {
        ...contract,
        amountPaid
    };
}

/**
 * Get prepared statement to update car status
 */
export function getUpdateCarStatusStmt(
    db: DbType,
    carId: number,
    status: 'available' | 'rented' | 'booked' | 'maintenance'
): D1PreparedStatement {
    return db
        .prepare("UPDATE company_cars SET status = ?, updated_at = ? WHERE id = ?")
        .bind(status, new Date().toISOString(), carId);
}

/**
 * Update car status based on contract status (immediate execution)
 */
export async function updateCarStatus(
    db: DbType,
    carId: number,
    status: 'available' | 'rented' | 'booked' | 'maintenance',
    reason: string
): Promise<void> {
    void reason;
    await getUpdateCarStatusStmt(db, carId, status).run();
}
