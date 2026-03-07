import test from "node:test";
import assert from "node:assert/strict";
import {
    loadClientPaymentsHistoryPage,
    loadClientRentalHistoryPage,
    submitClientContractReview,
} from "../app/lib/user-self-service.server";
import { FakeD1Database } from "./helpers/fake-d1";

test("loadClientRentalHistoryPage normalizes invalid status to all", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT COUNT(*) AS count FROM contracts c",
            first: [{ count: 1 }],
        },
        {
            match: "FROM contracts c",
            all: [{ results: [{ id: 7, startDate: "2026-03-01", endDate: "2026-03-03" }] }],
        },
    ]);

    const result = await loadClientRentalHistoryPage({
        db: db as unknown as D1Database,
        userId: "user-1",
        url: new URL("https://example.com/my-contracts?status=weird"),
        includeColor: false,
    });

    assert.equal(result.status, "all");
    assert.equal(result.rows.length, 1);
});

test("loadClientPaymentsHistoryPage returns scoped payments list", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT COUNT(*) AS count\n        FROM payments p",
            first: [{ count: 1 }],
        },
        {
            match: "FROM payments p",
            all: [{ results: [{ id: 5, contractId: 11, paymentTypeName: "Deposit", paymentTypeSign: "+", amount: 500 }] }],
        },
    ]);

    const result = await loadClientPaymentsHistoryPage({
        db: db as unknown as D1Database,
        userId: "user-1",
        url: new URL("https://example.com/my-payments?status=completed"),
    });

    assert.equal(result.status, "completed");
    assert.equal(result.payments.length, 1);
    assert.equal(result.payments[0]?.contractId, 11);
});

test("submitClientContractReview redirects with validation error for short review text", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM contracts c",
            first: [{ id: 9, carId: 22, endDate: "2026-03-01T00:00:00.000Z", status: "closed" }],
        },
    ]);
    const formData = new FormData();
    formData.set("reviewText", "short");
    formData.set("rating", "5");

    const response = await submitClientContractReview({
        db: db as unknown as D1Database,
        request: new Request("https://example.com/my-contracts/9", { method: "POST", body: formData }),
        contractId: 9,
        user: {
            id: "user-1",
            email: "user@example.com",
            role: "user",
            name: "John",
            surname: "Smith",
        },
    });

    assert.equal(response.status, 302);
    assert.match(response.headers.get("Location") || "", /error=Review\+text\+must\+be\+at\+least\+10\+characters/);
});
