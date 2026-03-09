export async function backfillContractDefaults(db: D1Database) {
    await db.prepare(`
        UPDATE contracts
        SET start_date = date('now', '-5 days'),
            end_date = date('now', '+5 days'),
            total_amount = COALESCE(total_amount, 15000)
        WHERE start_date IS NULL OR end_date IS NULL OR total_amount IS NULL
    `).run();
}
