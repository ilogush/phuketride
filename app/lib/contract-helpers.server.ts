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
        .prepare("SELECT * FROM contracts WHERE id = ? LIMIT 1")
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
 * Update car status based on contract status
 */
export async function updateCarStatus(
    db: DbType,
    carId: number,
    status: 'available' | 'rented' | 'booked' | 'maintenance',
    reason: string
): Promise<void> {
    void reason;
    await db
        .prepare("UPDATE company_cars SET status = ?, updated_at = ? WHERE id = ?")
        .bind(status, Date.now(), carId)
        .run();
}
