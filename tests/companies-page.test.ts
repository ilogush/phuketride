import test from "node:test";
import assert from "node:assert/strict";
import { loadCompaniesPageData } from "../app/lib/companies-page.server";
import { type SessionUser } from "../app/lib/auth.server";
import { createScopedDb } from "../app/lib/db-factory.server";
import { FakeD1Database } from "./helpers/fake-d1";

const adminUser: SessionUser = {
    id: "admin-1",
    email: "admin@example.com",
    role: "admin",
    name: "Admin",
    surname: null,
};

test("loadCompaniesPageData maps company rows for admin table", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT COUNT(*) AS count",
            first: [{ count: 2 }],
        },
        {
            match: "SELECT c.id",
            all: [{ results: [{ id: 7 }, { id: 9 }] }],
        },
        {
            match: "WHERE c.id IN",
            all: [{
                results: [
                    {
                        id: 9,
                        name: "Beta Cars",
                        email: "beta@example.com",
                        phone: "222",
                        locationId: 1,
                        districtId: 2,
                        ownerId: "owner-2",
                        archivedAt: "2026-03-01",
                        ownerName: "Jane",
                        ownerSurname: "Doe",
                        ownerArchivedAt: "2026-03-02",
                        districtName: "Patong",
                        carCount: "4",
                    },
                    {
                        id: 7,
                        name: "Alpha Cars",
                        email: "alpha@example.com",
                        phone: "111",
                        locationId: 1,
                        districtId: 3,
                        ownerId: "owner-1",
                        archivedAt: null,
                        ownerName: "John",
                        ownerSurname: "Smith",
                        ownerArchivedAt: null,
                        districtName: "Karon",
                        carCount: "6",
                    },
                ],
            }],
        },
    ]);

    const result = await loadCompaniesPageData({
        request: new Request("https://example.com/companies?search=car"),
        user: adminUser,
        sdb: createScopedDb(db as unknown as never, null),
    });

    assert.equal(result.totalCount, 2);
    assert.equal(result.companies.length, 2);
    assert.equal(result.companies[0]?.id, 7);
    assert.equal(result.companies[0]?.partnerName, "John Smith");
    assert.equal(result.companies[0]?.partnerArchived, false);
    assert.equal(result.companies[0]?.carCount, 6);
    assert.equal(result.companies[1]?.status, "archived");
});

test("loadCompaniesPageData falls back to empty list when repo calls fail", async () => {
    const db = new FakeD1Database([]);

    const result = await loadCompaniesPageData({
        request: new Request("https://example.com/companies"),
        user: adminUser,
        sdb: createScopedDb(db as unknown as never, null),
    });

    assert.deepEqual(result.companies, []);
    assert.equal(result.totalCount, 0);
    assert.equal(result.showArchived, false);
});
