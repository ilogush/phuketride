import { drizzle } from "drizzle-orm/d1";
import { eq, and, isNull } from "drizzle-orm";
import * as schema from "~/db/schema";

/**
 * Archive a user (partner/manager)
 * Also archives their company if they are the owner
 */
export async function archiveUser(db: D1Database, userId: string): Promise<{ success: boolean; error?: string }> {
    const drizzleDb = drizzle(db, { schema });
    
    try {
        // Check if user exists and is not already archived
        const user = await drizzleDb.query.users.findFirst({
            where: and(
                eq(schema.users.id, userId),
                isNull(schema.users.archivedAt)
            ),
        });

        if (!user) {
            return { success: false, error: "User not found or already archived" };
        }

        // Archive user
        await drizzleDb
            .update(schema.users)
            .set({ archivedAt: new Date() })
            .where(eq(schema.users.id, userId));

        // If user is a partner (company owner), archive their company too
        if (user.role === "partner") {
            await drizzleDb
                .update(schema.companies)
                .set({ archivedAt: new Date() })
                .where(eq(schema.companies.ownerId, userId));
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to archive user:", error);
        return { success: false, error: "Failed to archive user" };
    }
}

/**
 * Archive a company and its owner
 */
export async function archiveCompany(db: D1Database, companyId: number): Promise<{ success: boolean; error?: string }> {
    const drizzleDb = drizzle(db, { schema });
    
    try {
        // Check if company exists and is not already archived
        const company = await drizzleDb.query.companies.findFirst({
            where: and(
                eq(schema.companies.id, companyId),
                isNull(schema.companies.archivedAt)
            ),
        });

        if (!company) {
            return { success: false, error: "Company not found or already archived" };
        }

        // Archive company
        await drizzleDb
            .update(schema.companies)
            .set({ archivedAt: new Date() })
            .where(eq(schema.companies.id, companyId));

        // Archive owner (partner)
        await drizzleDb
            .update(schema.users)
            .set({ archivedAt: new Date() })
            .where(eq(schema.users.id, company.ownerId));

        return { success: true };
    } catch (error) {
        console.error("Failed to archive company:", error);
        return { success: false, error: "Failed to archive company" };
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
): Promise<{ success: boolean; error?: string; action?: "deleted" | "archived" }> {
    const drizzleDb = drizzle(db, { schema });
    
    try {
        // Check if car exists and belongs to company
        const car = await drizzleDb.query.companyCars.findFirst({
            where: and(
                eq(schema.companyCars.id, carId),
                eq(schema.companyCars.companyId, companyId)
            ),
        });

        if (!car) {
            return { success: false, error: "Car not found or access denied" };
        }

        // Check if car has any contracts
        const contractsCount = await db
            .prepare("SELECT COUNT(*) as count FROM contracts WHERE company_car_id = ?")
            .bind(carId)
            .first<{ count: number }>();

        const hasContracts = (contractsCount?.count || 0) > 0;

        if (hasContracts || forceArchive) {
            // Archive car (cannot delete if has contracts)
            await drizzleDb
                .update(schema.companyCars)
                .set({ archivedAt: new Date() })
                .where(eq(schema.companyCars.id, carId));

            return { success: true, action: "archived" };
        } else {
            // Delete car (no contracts)
            await drizzleDb
                .delete(schema.companyCars)
                .where(eq(schema.companyCars.id, carId));

            return { success: true, action: "deleted" };
        }
    } catch (error) {
        console.error("Failed to delete/archive car:", error);
        return { success: false, error: "Failed to delete/archive car" };
    }
}

/**
 * Unarchive a user
 */
export async function unarchiveUser(db: D1Database, userId: string): Promise<{ success: boolean; error?: string }> {
    const drizzleDb = drizzle(db, { schema });
    
    try {
        await drizzleDb
            .update(schema.users)
            .set({ archivedAt: null })
            .where(eq(schema.users.id, userId));

        return { success: true };
    } catch (error) {
        console.error("Failed to unarchive user:", error);
        return { success: false, error: "Failed to unarchive user" };
    }
}

/**
 * Unarchive a company
 */
export async function unarchiveCompany(db: D1Database, companyId: number): Promise<{ success: boolean; error?: string }> {
    const drizzleDb = drizzle(db, { schema });
    
    try {
        await drizzleDb
            .update(schema.companies)
            .set({ archivedAt: null })
            .where(eq(schema.companies.id, companyId));

        return { success: true };
    } catch (error) {
        console.error("Failed to unarchive company:", error);
        return { success: false, error: "Failed to unarchive company" };
    }
}
