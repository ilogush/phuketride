import test from "node:test";
import assert from "node:assert/strict";
import { cancelBooking, convertBookingToContract } from "../app/lib/booking-actions.server";
import { FakeD1Database } from "./helpers/fake-d1";

const actor = {
    id: "manager-1",
    email: "manager@example.com",
    role: "manager",
    name: "Manager",
    surname: null,
    companyId: 12,
} as const;

test("cancelBooking updates booking status, frees car and writes audit log", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM bookings",
            first: [
                {
                    id: 5,
                    status: "pending",
                    companyCarId: 90,
                },
            ],
        },
    ]);

    const response = await cancelBooking({
        db: db as unknown as D1Database,
        request: new Request("https://example.com/bookings/5", { headers: { "User-Agent": "test" } }),
        user: actor,
        companyId: 12,
        bookingId: 5,
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("Location"), "/bookings?success=Booking+cancelled+successfully");
    assert.equal(db.countCalls("UPDATE bookings SET status = 'cancelled'", "batch"), 1);
    assert.equal(db.countCalls("UPDATE company_cars SET status = ?", "batch"), 1);
    assert.equal(db.countCalls("INSERT INTO audit_logs", "batch"), 1);
});

test("convertBookingToContract creates contract extras, events and audits", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM bookings b",
            first: [
                {
                    id: 7,
                    status: "confirmed",
                    companyCarId: 90,
                    companyId: 12,
                    clientId: null,
                    startDate: "2026-03-10T10:00:00.000Z",
                    endDate: "2026-03-12T10:00:00.000Z",
                    estimatedAmount: 1200,
                    currency: "THB",
                    depositAmount: 300,
                    fullInsuranceEnabled: 1,
                    fullInsurancePrice: 400,
                    babySeatEnabled: 1,
                    babySeatPrice: 200,
                    islandTripEnabled: 0,
                    islandTripPrice: 0,
                    krabiTripEnabled: 0,
                    krabiTripPrice: 0,
                    pickupDistrictId: 2,
                    pickupHotel: "Hotel",
                    pickupRoom: "101",
                    deliveryCost: 150,
                    returnDistrictId: 3,
                    returnHotel: "Hotel",
                    returnRoom: "102",
                    returnCost: 200,
                    notes: "note",
                    clientName: "John",
                    clientSurname: "Smith",
                    clientPhone: "+660000000",
                    clientEmail: "john@example.com",
                    clientPassport: "AB12345",
                },
            ],
        },
        {
            match: "SELECT id FROM users WHERE passport_number = ? LIMIT 1",
            first: [null],
        },
        {
            match: "SELECT id FROM contracts WHERE created_at = ? AND manager_id = ? ORDER BY id DESC LIMIT 1",
            first: [{ id: 42 }],
        },
    ]);

    const response = await convertBookingToContract({
        db: db as unknown as D1Database,
        request: new Request("https://example.com/bookings/7", { headers: { "User-Agent": "test" } }),
        user: actor,
        companyId: 12,
        bookingId: 7,
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("Location"), "/contracts/42/edit?success=Booking+converted+to+contract+successfully");
    assert.equal(db.countCalls("UPDATE bookings SET status = 'converted'", "batch"), 1);
    assert.equal(db.countCalls("UPDATE company_cars SET status = ?", "batch"), 1);
    assert.equal(db.countCalls("INSERT INTO payments", "batch"), 2);
    assert.equal(db.countCalls("INSERT INTO calendar_events", "batch"), 2);
    assert.equal(db.countCalls("INSERT INTO audit_logs", "batch"), 2);
});
