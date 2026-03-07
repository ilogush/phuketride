export async function enforcePhuketCurrencyInvariant(db: D1Database, companyId: number) {
    const thbCurrency = await db
        .prepare("SELECT id FROM currencies WHERE UPPER(code) = 'THB' LIMIT 1")
        .first() as { id?: number } | null;

    if (!thbCurrency?.id) {
        throw new Error("THB currency is required for Phuket companies");
    }

    const nowIso = new Date().toISOString();
    await db
        .prepare("UPDATE currencies SET company_id = ?, is_active = 1, updated_at = ? WHERE id = ?")
        .bind(companyId, nowIso, thbCurrency.id)
        .run();

    await db
        .prepare("UPDATE currencies SET company_id = NULL WHERE company_id = ? AND id != ?")
        .bind(companyId, thbCurrency.id)
        .run();
}
