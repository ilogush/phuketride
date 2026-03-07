import test from "node:test";
import assert from "node:assert/strict";
import { closeContractAction } from "../app/lib/contracts-close-action.server";
import { FakeD1Database } from "./helpers/fake-d1";

const actor = {
    id: "manager-1",
    email: "manager@example.com",
    role: "manager",
    name: "Manager",
    surname: null,
    companyId: 12,
} as const;

test("closeContractAction closes contract, frees car and writes audit", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT id, status, company_car_id AS companyCarId FROM contracts",
            first: [{ id: 88, status: "active", companyCarId: 90 }],
        },
        {
            match: "INSERT INTO audit_logs",
            run: [{ meta: { last_row_id: 1 } }],
        },
    ]);

    const response = await closeContractAction({
        db: db as unknown as D1Database,
        request: new Request("https://example.com/contracts/88/close", { headers: { "User-Agent": "test" } }),
        user: actor,
        companyId: 12,
        contractId: 88,
        actualEndDate: new Date("2026-03-12T12:00:00.000Z"),
        endMileage: 12345,
        fuelLevel: "full",
        cleanliness: "clean",
        notes: "closed",
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("Location"), "/contracts?success=Contract+closed+successfully");
    assert.equal(db.countCalls("UPDATE contracts", "batch"), 1);
    assert.equal(db.countCalls("UPDATE company_cars SET status = ?", "batch"), 1);
    assert.equal(db.countCalls("INSERT INTO audit_logs", "run"), 1);
});
