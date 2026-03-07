import type { SessionUser } from "~/lib/auth.server";
import { getQuickAuditStmt, getRequestMetadata } from "~/lib/audit-logger";
import { getUpdateCarStatusStmt } from "~/lib/contract-helpers.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";

type CloseContractArgs = {
    db: D1Database;
    request: Request;
    user: SessionUser;
    companyId: number | null;
    contractId: number;
    actualEndDate: Date;
    endMileage: number;
    fuelLevel: string;
    cleanliness: string;
    notes: string | null;
};

export async function closeContractAction(args: CloseContractArgs) {
    const {
        db,
        request,
        user,
        companyId,
        contractId,
        actualEndDate,
        endMileage,
        fuelLevel,
        cleanliness,
        notes,
    } = args;

    const contract = await db
        .prepare("SELECT id, status, company_car_id AS companyCarId FROM contracts WHERE id = ? LIMIT 1")
        .bind(contractId)
        .first() as { id: number; status: string; companyCarId: number } | null;

    if (!contract) {
        return redirectWithRequestError(request, "/contracts", "Contract not found");
    }

    await db.batch([
        db.prepare(`
            UPDATE contracts
            SET status = 'closed', actual_end_date = ?, end_mileage = ?, fuel_level = ?, cleanliness = ?, notes = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            actualEndDate.toISOString(),
            endMileage,
            fuelLevel,
            cleanliness,
            notes,
            new Date().toISOString(),
            contractId
        ),
        getUpdateCarStatusStmt(db, contract.companyCarId, "available"),
    ]);

    const metadata = getRequestMetadata(request);
    await getQuickAuditStmt({
        db,
        userId: user.id,
        role: user.role,
        companyId: companyId ?? user.companyId,
        entityType: "contract",
        entityId: contractId,
        action: "update",
        beforeState: { status: contract.status },
        afterState: { status: "closed", actualEndDate, endMileage },
        ...metadata,
    }).run();

    return redirectWithRequestSuccess(request, "/contracts", "Contract closed successfully");
}
