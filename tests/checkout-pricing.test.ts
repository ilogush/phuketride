import test from "node:test";
import assert from "node:assert/strict";
import { calculateCheckoutPricing, type CheckoutPricingContext } from "../app/lib/public-checkout.server";
import { FakeD1Database } from "./helpers/fake-d1";

function buildCar(overrides: Partial<CheckoutPricingContext> = {}): CheckoutPricingContext {
    return {
        companyId: 12,
        ownerId: "partner-1",
        companyName: "Phuket Ride",
        status: "available",
        pricePerDay: 1000,
        deliveryFeeAfterHours: 300,
        weeklySchedule: null,
        holidays: JSON.stringify(["2026-03-09", "2026-03-10"]),
        companyDistrictId: 1,
        deposit: 5000,
        fullInsuranceMinPrice: 400,
        fullInsuranceMaxPrice: 700,
        babySeatPricePerDay: 200,
        islandTripPrice: 1500,
        krabiTripPrice: 2500,
        minRentalDays: 3,
        ...overrides,
    };
}

test("checkout pricing uses DB delivery settings, min rental days and after-hours fees", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM company_delivery_settings",
            all: [
                {
                    results: [
                        { districtId: 2, isActive: 1, deliveryPrice: 800 },
                        { districtId: 3, isActive: 1, deliveryPrice: 900 },
                    ],
                },
            ],
        },
    ]);

    const pricing = await calculateCheckoutPricing({
        db: db as unknown as D1Database,
        car: buildCar(),
        pickupDate: new Date(2026, 2, 9, 7, 0, 0),
        returnDate: new Date(2026, 2, 10, 20, 0, 0),
        pickupDistrictId: 2,
        returnDistrictId: 3,
        withFullInsurance: false,
        withBabySeat: true,
        withIslandTrip: false,
        withKrabiTrip: true,
        bookingRate: "non_refundable",
    });

    assert.equal(pricing.tripDays, 2);
    assert.equal(pricing.effectiveRentalDays, 3);
    assert.equal(pricing.baseTripCost, 3000);
    assert.equal(pricing.deliveryFee, 800);
    assert.equal(pricing.returnFee, 900);
    assert.equal(pricing.pickupAfterHoursFee, 300);
    assert.equal(pricing.returnAfterHoursFee, 300);
    assert.equal(pricing.babySeatExtra, 600);
    assert.equal(pricing.krabiTripExtra, 2500);
    assert.equal(pricing.depositAmount, 5000);
    assert.equal(pricing.totalAmount, 8988);
});

test("checkout pricing zeroes deposit when full insurance is selected", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM company_delivery_settings",
            all: [{ results: [] }],
        },
    ]);

    const pricing = await calculateCheckoutPricing({
        db: db as unknown as D1Database,
        car: buildCar({ minRentalDays: 1, holidays: null, deliveryFeeAfterHours: 0 }),
        pickupDate: new Date(2026, 2, 10, 10, 0, 0),
        returnDate: new Date(2026, 2, 12, 10, 0, 0),
        pickupDistrictId: 0,
        returnDistrictId: 0,
        withFullInsurance: true,
        withBabySeat: false,
        withIslandTrip: true,
        withKrabiTrip: false,
        bookingRate: "refundable",
    });

    assert.equal(pricing.selectedInsurance, 700);
    assert.equal(pricing.depositAmount, 0);
    assert.equal(pricing.totalAmount, 5494);
});
