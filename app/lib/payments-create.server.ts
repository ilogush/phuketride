import { getRequestMetadata } from "~/lib/audit-logger";
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
    const rawData = Object.fromEntries(args.formData);
    const parsed = parseWithSchema(paymentSchema, rawData, "Validation failed");

    if (!parsed.ok) {
        return redirectWithRequestError(args.request, "/payments/create", parsed.error);
    }

    await assertContractOwnershipAccess({
        db: args.db,
        companyId: args.companyId,
        contractId: parsed.data.contractId,
    });

    const now = new Date().toISOString();
    const metadata = getRequestMetadata(args.request);
    
    await args.db.batch([
        args.db.prepare(`
            INSERT INTO payments (
                contract_id, payment_type_id, amount, currency, status, notes, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            parsed.data.contractId,
            parsed.data.paymentTypeId,
            parsed.data.amount,
            parsed.data.currency,
            parsed.data.status,
            parsed.data.notes || null,
            args.user.id,
            now,
            now
        ),
        args.db.prepare(`
            INSERT INTO audit_logs (user_id, role, company_id, entity_type, entity_id, action, before_state, after_state, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, 'payment', last_insert_rowid(), 'create', NULL, ?, ?, ?, ?)
        `).bind(
            args.user.id, args.user.role, args.companyId ?? args.user.companyId ?? null,
            JSON.stringify({ ...parsed.data }),
            metadata.ipAddress ?? null, metadata.userAgent ?? null, now
        )
    ]);

    return redirectWithRequestSuccess(args.request, "/payments", "Payment created successfully");
}
