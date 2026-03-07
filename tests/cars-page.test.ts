import test from "node:test";
import assert from "node:assert/strict";
import { loadCarsPageData } from "../app/lib/cars-page.server";
import { serializeSession, type SessionUser } from "../app/lib/auth.server";
import { setRuntimeEnv } from "../app/lib/runtime-env.server";
import { FakeD1Database } from "./helpers/fake-d1";

async function buildRequest(user: SessionUser, url = "https://example.com/cars") {
    setRuntimeEnv({ SESSION_SECRET: "test-session-secret" } as Env, "test");
    const baseRequest = new Request(url);
    const cookie = await serializeSession(baseRequest, user);
    return new Request(url, {
        headers: {
            Cookie: cookie,
        },
    });
}

test("loadCarsPageData uses scoped admin mod company access and maps car rows", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT status, COUNT(*) AS count",
            all: [{ results: [{ status: "available", count: 3 }, { status: "rented", count: 1 }] }],
        },
        {
            match: "FROM company_cars cc",
            all: [{
                results: [{
                    id: 5,
                    photos: JSON.stringify(["/assets/cars/car-5.webp"]),
                    license_plate: "AB1234",
                    price_per_day: 1200,
                    insurance_type: "Full Insurance",
                    engine_volume: 2,
                    mileage: 45000,
                    deposit: 5000,
                    status: "available",
                    brandName: "Toyota",
                    modelName: "Yaris",
                    bodyTypeName: "Hatchback",
                    colorName: "White",
                }],
            }],
        },
        {
            match: "FROM company_cars\n                WHERE company_id = ? AND status = ?",
            first: [{ count: 1 }],
        },
    ]);

    const result = await loadCarsPageData({
        request: await buildRequest(
            {
                id: "admin-1",
                email: "admin@example.com",
                role: "admin",
                name: "Admin",
                surname: null,
            },
            "https://example.com/cars?modCompanyId=77&tab=available"
        ),
        db: db as unknown as D1Database,
    });

    assert.equal(result.companyId, 77);
    assert.equal(result.cars.length, 1);
    assert.equal(result.cars[0]?.licensePlate, "AB1234");
    assert.equal(result.cars[0]?.template.brand.name, "Toyota");
    assert.equal(result.statusCounts.all, 4);
});

test("loadCarsPageData falls back to empty cars payload when repo calls fail", async () => {
    const db = new FakeD1Database([]);

    const result = await loadCarsPageData({
        request: await buildRequest({
            id: "partner-1",
            email: "partner@example.com",
            role: "partner",
            name: "Partner",
            surname: null,
            companyId: 12,
        }),
        db: db as unknown as D1Database,
    });

    assert.equal(result.companyId, 12);
    assert.deepEqual(result.cars, []);
    assert.equal(result.totalCount, 0);
    assert.deepEqual(result.statusCounts, { all: 0, available: 0, rented: 0, maintenance: 0, booked: 0 });
});
