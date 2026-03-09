import test from "node:test";
import assert from "node:assert/strict";
import { loadSearchCarsPage } from "../app/features/search-cars/search-cars.loader.server";
import { FakeD1Database } from "./helpers/fake-d1";

test("loadSearchCarsPage excludes cars with overlapping contracts or bookings for selected dates", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT DISTINCT company_car_id AS carId",
            all: [
                {
                    results: [{ carId: 2 }],
                },
            ],
        },
        {
            match: "FROM company_cars cc",
            all: [
                {
                    results: [
                        {
                            id: 1,
                            licensePlate: "ABC123",
                            companyId: 7,
                            brandName: "Toyota",
                            modelName: "Yaris",
                            bodyType: "Sedan",
                            year: 2024,
                            transmission: "AT",
                            fuelType: "Petrol",
                            pricePerDay: 1000,
                            deposit: 5000,
                            photos: null,
                            companyName: "Phuket Ride",
                            locationName: "Phuket",
                            districtName: "Patong",
                            street: "Beach Road",
                            houseNumber: "1",
                            rating: null,
                            totalRatings: null,
                        },
                    ],
                },
            ],
        },
    ]);

    const result = await loadSearchCarsPage({
        db: db as unknown as D1Database,
        request: new Request(
            "https://example.com/search-cars?startDate=2026-03-10&endDate=2026-03-12&startTime=10:00&endTime=10:00",
        ),
    });

    assert.equal(result.cars.length, 1);
    assert.equal(result.cars[0]?.id, 1);
    const listCall = db.calls.find((call) => call.sql.includes("FROM company_cars cc"));
    assert.deepEqual(listCall?.bindings, [2]);
});

test("loadSearchCarsPage skips availability lookup when date range is incomplete", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM company_cars cc",
            all: [
                {
                    results: [],
                },
            ],
        },
    ]);

    await loadSearchCarsPage({
        db: db as unknown as D1Database,
        request: new Request("https://example.com/search-cars?district=Patong"),
    });

    assert.equal(db.countCalls("SELECT DISTINCT company_car_id AS carId", "all"), 0);
});
