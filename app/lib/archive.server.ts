/**
 * Archive a user (partner/manager)
 * Also archives their company if they are the owner
 */
export async function archiveUser(db: D1Database, userId: string): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
        // Check if user exists and is not already archived
        const user = await db
            .prepare("SELECT id, role FROM users WHERE id = ? AND archived_at IS NULL LIMIT 1")
            .bind(userId)
            .first<{ id: string; role: string }>();

        if (!user) {
            return { success: false, error: "User not found or already archived", message: "User not found or already archived" };
        }

        // Archive user
        await db
            .prepare("UPDATE users SET archived_at = ?, updated_at = ? WHERE id = ?")
            .bind(Date.now(), Date.now(), userId)
            .run();

        // If user is a partner (company owner), archive their company too
        if (user.role === "partner") {
            await db
                .prepare("UPDATE companies SET archived_at = ?, updated_at = ? WHERE owner_id = ?")
                .bind(Date.now(), Date.now(), userId)
                .run();
        }

        return { success: true, message: "User archived successfully" };
    } catch {
        return { success: false, error: "Failed to archive user", message: "Failed to archive user" };
    }
}

/**
 * Archive a company and its owner
 */
export async function archiveCompany(db: D1Database, companyId: number): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
        // Check if company exists and is not already archived
        const company = await db
            .prepare("SELECT id, owner_id AS ownerId FROM companies WHERE id = ? AND archived_at IS NULL LIMIT 1")
            .bind(companyId)
            .first<{ id: number; ownerId: string }>();

        if (!company) {
            return { success: false, error: "Company not found or already archived", message: "Company not found or already archived" };
        }

        // Archive company
        await db
            .prepare("UPDATE companies SET archived_at = ?, updated_at = ? WHERE id = ?")
            .bind(Date.now(), Date.now(), companyId)
            .run();

        // Archive owner (partner)
        await db
            .prepare("UPDATE users SET archived_at = ?, updated_at = ? WHERE id = ?")
            .bind(Date.now(), Date.now(), company.ownerId)
            .run();

        return { success: true, message: "Company archived successfully" };
    } catch {
        return { success: false, error: "Failed to archive company", message: "Failed to archive company" };
    }
}

/**
 * Delete or archive a car
 * - If car has contracts: cannot delete, must archive
 * - If car has no contracts: can delete
 */
export async function deleteOrArchiveCar(
    db: D1Database, 
    carId: number, 
    companyId: number,
    forceArchive: boolean = false
): Promise<{ success: boolean; error?: string; action?: "deleted" | "archived"; message?: string }> {
    try {
        // Check if car exists and belongs to company
        const car = await db
            .prepare("SELECT id FROM company_cars WHERE id = ? AND company_id = ? LIMIT 1")
            .bind(carId, companyId)
            .first<{ id: number }>();

        if (!car) {
            return { success: false, error: "Car not found or access denied", message: "Car not found or access denied" };
        }

        // Check if car has any contracts
        const contractsCount = await db
            .prepare("SELECT COUNT(*) as count FROM contracts WHERE company_car_id = ?")
            .bind(carId)
            .first<{ count: number }>();

        const hasContracts = (contractsCount?.count || 0) > 0;

        if (hasContracts || forceArchive) {
            // Archive car (cannot delete if has contracts)
            await db
                .prepare("UPDATE company_cars SET archived_at = ?, updated_at = ? WHERE id = ?")
                .bind(Date.now(), Date.now(), carId)
                .run();

            return { success: true, action: "archived", message: "Car archived successfully" };
        } else {
            // Delete car (no contracts)
            await db
                .prepare("DELETE FROM company_cars WHERE id = ?")
                .bind(carId)
                .run();

            return { success: true, action: "deleted", message: "Car deleted successfully" };
        }
    } catch {
        return { success: false, error: "Failed to delete/archive car", message: "Failed to delete/archive car" };
    }
}

/**
 * Unarchive a user
 */
export async function unarchiveUser(db: D1Database, userId: string): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
        await db
            .prepare("UPDATE users SET archived_at = NULL, updated_at = ? WHERE id = ?")
            .bind(Date.now(), userId)
            .run();

        return { success: true, message: "User unarchived successfully" };
    } catch {
        return { success: false, error: "Failed to unarchive user", message: "Failed to unarchive user" };
    }
}

/**
 * Unarchive a company
 */
export async function unarchiveCompany(db: D1Database, companyId: number): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
        await db
            .prepare("UPDATE companies SET archived_at = NULL, updated_at = ? WHERE id = ?")
            .bind(Date.now(), companyId)
            .run();

        return { success: true, message: "Company unarchived successfully" };
    } catch {
        return { success: false, error: "Failed to unarchive company", message: "Failed to unarchive company" };
    }
}
