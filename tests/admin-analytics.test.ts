import test from "node:test";
import assert from "node:assert/strict";
import {
    clearAuditLogsFromForm,
    deleteDashboardTaskFromForm,
    loadDashboardChartsData,
    loadReportsPageData,
} from "../app/lib/admin-analytics.server";
import { FakeD1Database } from "./helpers/fake-d1";

test("loadDashboardChartsData returns scoped analytics payload", async () => {
    const db = new FakeD1Database([
        {
            match: /FROM contracts c\s+INNER JOIN company_cars cc ON cc.id = c.company_car_id\s+WHERE c.created_at >= \? AND c.created_at < \? AND cc.company_id = \?/,
            first: [{ count: 1 }, { count: 2 }, { count: 3 }, { count: 4 }, { count: 5 }, { count: 6 }, { count: 7 }],
        },
        {
            match: "FROM companies c",
            all: [{ results: [{ location: "Phuket", count: 1 }] }],
        },
        {
            match: /FROM contracts c\s+INNER JOIN company_cars cc ON cc.id = c.company_car_id\s+WHERE c.status = \?\s+AND cc.company_id = \?/,
            first: [{ count: 9 }, { count: 4 }],
        },
        {
            match: /FROM contracts c\s+INNER JOIN company_cars cc ON cc.id = c.company_car_id\s+WHERE c.status = \?\s+AND c.updated_at >= \?\s+AND cc.company_id = \?/,
            first: [{ count: 2 }],
        },
    ]);

    const result = await loadDashboardChartsData({
        db: db as unknown as D1Database,
        companyId: 12,
        now: new Date("2026-03-07T12:00:00.000Z"),
    });

    assert.equal(result.activityByDay.length, 7);
    assert.deepEqual(result.activityByDay.map((point) => point.count), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(result.companiesByLocation, [{ location: "Phuket", count: 1 }]);
    assert.deepEqual(result.contractStats, { active: 9, closed: 4, closedToday: 2 });
});

test("clearAuditLogsFromForm redirects with success feedback", async () => {
    const db = new FakeD1Database([
        {
            match: "DELETE FROM audit_logs",
            run: [{ meta: { changes: 12 } }],
        },
    ]);
    const formData = new FormData();
    formData.set("intent", "clear");

    const response = await clearAuditLogsFromForm({
        db: db as unknown as D1Database,
        request: new Request("https://example.com/logs", { method: "POST", body: formData }),
        companyId: null,
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("Location"), "/logs?success=Audit+logs+cleared+successfully");
    assert.equal(db.countCalls("DELETE FROM audit_logs", "run"), 1);
});

test("deleteDashboardTaskFromForm enforces scoped task deletion", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT id FROM calendar_events WHERE id = ? AND company_id = ? LIMIT 1",
            first: [{ id: 55 }],
        },
        {
            match: "DELETE FROM calendar_events WHERE id = ? AND company_id = ?",
            run: [{ meta: { changes: 1 } }],
        },
    ]);
    const formData = new FormData();
    formData.set("intent", "delete");
    formData.set("taskId", "55");

    const response = await deleteDashboardTaskFromForm({
        db: db as unknown as D1Database,
        request: new Request("https://example.com/home?modCompanyId=12", { method: "POST", body: formData }),
        companyId: 12,
        taskId: 55,
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("Location"), "/home?modCompanyId=12&success=Task+deleted+successfully");
    assert.equal(db.countCalls("DELETE FROM calendar_events WHERE id = ? AND company_id = ?", "run"), 1);
});

test("loadReportsPageData returns summary-backed report cards", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT\n              (SELECT COUNT(*) FROM contracts WHERE created_at >= ?)",
            first: [{
                contractsCreatedLast7Days: 14,
                locationsTracked: 3,
                companiesTracked: 8,
                activeContracts: 11,
                closedToday: 2,
                auditEntries: 120,
            }],
        },
    ]);

    const result = await loadReportsPageData({
        db: db as unknown as D1Database,
        companyId: null,
        now: new Date("2026-03-07T12:00:00.000Z"),
    });

    assert.equal(result.reports.length, 4);
    assert.equal(result.reports[0]?.metric, "14 new contracts");
    assert.equal(result.reports[3]?.metric, "11 active / 2 closed today");
});
