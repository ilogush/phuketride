import { getRequestMetadata, quickAudit } from "~/lib/audit-logger";
import { getCachedCurrencies, getCachedPaymentTypes } from "~/lib/dictionaries-cache.server";
import { QUERY_LIMITS } from "~/lib/query-limits";
import { paymentSchema } from "~/schemas/payment";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";
import { assertContractOwnershipAccess } from "~/lib/access-policy.server";
import type { SessionUser } from "~/lib/auth.server";

export async function loadPaymentCreatePageData(args: {
    db: D1Database;
    companyId: number | null;
}) {
    const [contractsResult, paymentTypes, currencies] = await Promise.all([
        args.companyId === null
            ? args.db.prepare(`SELECT id FROM contracts ORDER BY id DESC LIMIT ${QUERY_LIMITS.LARGE}`).all()
            : args.db
                  .prepare(`
                    SELECT c.id
                    FROM contracts c
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ?
                    ORDER BY c.id DESC
                    LIMIT ${QUERY_LIMITS.LARGE}
                `)
                  .bind(args.companyId)
                  .all(),
        getCachedPaymentTypes(args.db),
        getCachedCurrencies(args.db),
    ]);

    return {
        contracts: (contractsResult.results ?? []) as Array<{ id: number }>,
        paymentTypes: paymentTypes as Array<{ id: number; name: string }>,
        currencies,
    };
}

export async function createPaymentRecord(args: {
    db: D1Database;
    request: Request;
    user: SessionUser;
    companyId: number | null;
    formData: FormData;
}) {
    const parsed = parseWithSchema(
        paymentSchema,
        {
            contractId: args.formData.get("contractId") ? Number(args.formData.get("contractId")) : 0,
            paymentTypeId: Number(args.formData.get("paymentTypeId")),
            amount: Number(args.formData.get("amount")),
            currency: (args.formData.get("currency") as string) || "THB",
            status: (args.formData.get("status") as string) || "pending",
            notes: args.formData.get("notes") as string | null,
        },
        "Validation failed"
    );

    if (!parsed.ok) {
        return redirectWithRequestError(args.request, "/payments/create", parsed.error);
    }

    await assertContractOwnershipAccess({
        db: args.db,
        companyId: args.companyId,
        contractId: parsed.data.contractId,
    });

    const now = new Date().toISOString();
    const insertResult = await args.db
        .prepare(
            `
            INSERT INTO payments (
                contract_id, payment_type_id, amount, currency, status, notes, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
        )
        .bind(
            parsed.data.contractId,
            parsed.data.paymentTypeId,
            parsed.data.amount,
            parsed.data.currency,
            parsed.data.status,
            parsed.data.notes,
            args.user.id,
            now,
            now
        )
        .run();

    const paymentId = Number(insertResult.meta.last_row_id || 0);
    await quickAudit({
        db: args.db,
        userId: args.user.id,
        role: args.user.role,
        companyId: args.companyId ?? args.user.companyId ?? null,
        entityType: "payment",
        entityId: paymentId,
        action: "create",
        afterState: { id: paymentId, ...parsed.data },
        ...getRequestMetadata(args.request),
    });

    return redirectWithRequestSuccess(args.request, "/payments", "Payment created successfully");
}
