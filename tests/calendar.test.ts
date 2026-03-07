import test from "node:test";
import assert from "node:assert/strict";
import { createCalendarEventFromForm, loadCalendarPageData, loadUpcomingCalendarFeed, resolveCalendarMonthParams } from "../app/lib/calendar-page.server";
import { FakeD1Database } from "./helpers/fake-d1";

test("resolveCalendarMonthParams falls back to current date for invalid values", () => {
    const url = new URL("https://example.com/calendar?month=99&year=abc");
    const result = resolveCalendarMonthParams(url, new Date("2026-03-07T00:00:00.000Z"));

    assert.equal(result.currentMonth, 2);
    assert.equal(result.currentYear, 2026);
});

test("loadCalendarPageData reads month snapshot via shared repo contract", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM calendar_events",
            all: [{ results: [{ id: 1, title: "Event", startDate: new Date("2026-03-10").toISOString(), color: "#fff" }] }],
        },
        {
            match: "FROM contracts c",
            all: [{ results: [{ id: 2, endDate: new Date("2026-03-11").toISOString() }] }],
        },
        {
            match: "FROM bookings b",
            all: [{ results: [{ id: 3, startDate: new Date("2026-03-12").toISOString() }] }],
        },
    ]);

    const result = await loadCalendarPageData({
        db: db as unknown as D1Database,
        companyId: 7,
        url: new URL("https://example.com/calendar?month=2&year=2026"),
    });

    assert.equal(result.events.length, 1);
    assert.equal(result.contracts.length, 1);
    assert.equal(result.bookings.length, 1);
    assert.equal(result.currentMonth, 2);
    assert.equal(result.currentYear, 2026);
});

test("createCalendarEventFromForm validates input and inserts via shared calendar event helper", async () => {
    const db = new FakeD1Database([
        {
            match: "INSERT INTO calendar_events",
            run: [{ meta: { last_row_id: 11 } }],
        },
    ]);
    const formData = new FormData();
    formData.set("title", "Meeting");
    formData.set("eventType", "meeting");
    formData.set("startDate", "10/03/2026 11:30");
    formData.set("endDate", "10/03/2026 12:30");

    const result = await createCalendarEventFromForm({
        db: db as unknown as D1Database,
        companyId: 8,
        createdBy: "admin-1",
        formData,
    });

    assert.equal(result.ok, true);
    assert.equal(db.countCalls("INSERT INTO calendar_events", "run"), 1);
});

test("loadUpcomingCalendarFeed returns sorted merged events with validated limit", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM contracts c",
            all: [{ results: [{ id: 5, endDate: new Date("2026-03-20T00:00:00.000Z").toISOString() }] }],
        },
        {
            match: "FROM calendar_events",
            all: [{ results: [{ id: 9, title: "Delivery", startDate: new Date("2026-03-10T00:00:00.000Z").toISOString(), eventType: "delivery" }] }],
        },
    ]);

    const result = await loadUpcomingCalendarFeed({
        db: db as unknown as D1Database,
        companyId: 4,
        url: new URL("https://example.com/api/calendar-events?limit=2"),
        now: new Date("2026-03-07T00:00:00.000Z"),
    });

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.data.length, 2);
        assert.equal(result.data[0]?.id, 9);
        assert.equal(result.data[1]?.id, 5);
    }
});
