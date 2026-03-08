import test from "node:test";
import assert from "node:assert/strict";
import { createPaymentRecord, loadPaymentCreatePageData } from "../app/lib/payments-create.server";
import { FakeD1Database } from "./helpers/fake-d1";

const actor = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "manager@example.com",
    role: "manager",
    name: "Manager",
    surname: null,
    companyId: 12,
} as const;

test("loadPaymentCreatePageData returns scoped contracts and cached dictionaries", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM contracts c",
            all: [{ results: [{ id: 44 }] }],
        },
        {
            match: "SELECT id, name FROM payment_types",
            all: [{ results: [{ id: 1, name: "Deposit" }] }],
        },
        {
            match: "SELECT id, code, symbol FROM currencies",
            all: [{ results: [{ id: 1, code: "THB", symbol: "฿" }] }],
        },
    ]);

    const result = await loadPaymentCreatePageData({
        db: db as unknown as D1Database,
        companyId: 12,
    });

    assert.equal(result.contracts.length, 1);
    assert.equal(result.paymentTypes.length, 1);
    assert.equal(result.currencies.length, 1);
});

test("createPaymentRecord writes payment, audit and success feedback", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT c.id, cc.company_id AS companyId",
            first: [{ id: 55, companyId: 12 }],
        },
        {
            match: "INSERT INTO payments",
            run: [{ meta: { last_row_id: 91 } }],
        },
        {
            match: "INSERT INTO audit_logs",
            run: [{ meta: { last_row_id: 1 } }],
        },
    ]);
    const formData = new FormData();
    formData.set("contractId", "55");
    formData.set("paymentTypeId", "1");
    formData.set("amount", "750");
    formData.set("currency", "THB");
    formData.set("status", "completed");

    const response = await createPaymentRecord({
        db: db as unknown as D1Database,
        request: new Request("https://example.com/payments/create?modCompanyId=12", { method: "POST", body: formData }),
        user: actor,
        companyId: 12,
        formData,
    });

    assert.equal(response.status, 302);
    const location = response.headers.get("Location");
    assert.ok(location);
    const url = new URL(location, "https://example.com");
    assert.equal(url.pathname, "/payments");
    assert.equal(url.searchParams.get("success"), "Payment created successfully");
    assert.equal(url.searchParams.get("modCompanyId"), "12");
    assert.equal(db.countCalls("INSERT INTO payments", "run"), 1);
    assert.equal(db.countCalls("INSERT INTO audit_logs", "run"), 1);
});

test("createPaymentRecord rejects cross-company contract with forbidden response", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT c.id, cc.company_id AS companyId",
            first: [null],
        },
    ]);
    const formData = new FormData();
    formData.set("contractId", "999");
    formData.set("paymentTypeId", "1");
    formData.set("amount", "750");
    formData.set("currency", "THB");
    formData.set("status", "completed");

    await assert.rejects(
        () =>
            createPaymentRecord({
                db: db as unknown as D1Database,
                request: new Request("https://example.com/payments/create?modCompanyId=12", {
                    method: "POST",
                    body: formData,
                }),
                user: actor,
                companyId: 12,
                formData,
            }),
        (error: unknown) =>
            error instanceof Response &&
            error.status === 403
    );
    assert.equal(db.countCalls("INSERT INTO payments", "run"), 0);
});
