import test from "node:test";
import assert from "node:assert/strict";
import { redirectWithRequestError, redirectWithRequestSuccess } from "../app/lib/route-feedback";

test("redirectWithRequestSuccess preserves modCompanyId", () => {
    const response = redirectWithRequestSuccess(
        new Request("https://example.com/contracts/new?modCompanyId=77"),
        "/contracts",
        "Contract created successfully"
    );

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("Location"), "/contracts?modCompanyId=77&success=Contract+created+successfully");
});

test("redirectWithRequestError preserves modCompanyId on create page", () => {
    const response = redirectWithRequestError(
        new Request("https://example.com/bookings/create?modCompanyId=15"),
        "/bookings/create",
        "Validation failed"
    );

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("Location"), "/bookings/create?modCompanyId=15&error=Validation+failed");
});
