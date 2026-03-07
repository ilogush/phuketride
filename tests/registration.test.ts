import test from "node:test";
import assert from "node:assert/strict";
import { registerPartnerAccount, registerUserAccount } from "../app/lib/registration.server";
import { FakeD1Database } from "./helpers/fake-d1";

test("registerUserAccount returns duplicate email error without write", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT id FROM users WHERE email",
            all: [{ results: [{ id: "existing-user" }] }],
        },
    ]);

    const result = await registerUserAccount({
        db: db as unknown as D1Database,
        input: {
            email: "user@example.com",
            password: "secret123",
            firstName: "John",
            lastName: "Smith",
            phone: "+66991234567",
        },
    });

    assert.deepEqual(result, {
        ok: false,
        error: "Email already registered",
    });
    assert.equal(db.countCalls("INSERT INTO users", "run"), 0);
});

test("registerUserAccount inserts user and returns session payload", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT id FROM users WHERE email",
            all: [{ results: [] }],
        },
        {
            match: "INSERT INTO users",
            run: [{ meta: { last_row_id: 1 } }],
        },
    ]);
    const result = await registerUserAccount({
        db: db as unknown as D1Database,
        input: {
            email: "user@example.com",
            password: "secret123",
            firstName: "John",
            lastName: "Smith",
            phone: "+66991234567",
        },
    });

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.sessionUser.email, "user@example.com");
        assert.equal(result.sessionUser.role, "user");
        assert.equal(result.sessionUser.name, "John");
    }
    assert.equal(db.countCalls("INSERT INTO users", "run"), 1);
});

test("registerPartnerAccount returns duplicate email error", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT id FROM users WHERE email",
            all: [{ results: [{ id: "existing-user" }] }],
        },
    ]);
    const result = await registerPartnerAccount({
        db: db as unknown as D1Database,
        input: {
            email: "partner@example.com",
            password: "secret123",
            name: "Jane",
            surname: "Smith",
            phone: "+66812345678",
            telegram: "@jane",
            companyName: "Example Rentals",
            districtId: 1,
            street: "Beach Road",
            houseNumber: "12/1",
        },
    });

    assert.deepEqual(result, {
        ok: false,
        error: "Email already registered",
    });
    assert.equal(db.countCalls("INSERT INTO users", "batch"), 0);
});

test("registerPartnerAccount creates user and company and returns partner session", async () => {
    const db = new FakeD1Database([
        {
            match: "SELECT id FROM users WHERE email",
            all: [{ results: [] }],
        },
        {
            match: "SELECT id FROM companies WHERE owner_id",
            first: [{ id: 55 }],
        },
    ]);
    const result = await registerPartnerAccount({
        db: db as unknown as D1Database,
        input: {
            email: "partner@example.com",
            password: "secret123",
            name: "Jane",
            surname: "Smith",
            phone: "+66812345678",
            telegram: "@jane",
            companyName: "Example Rentals",
            districtId: 4,
            street: "Beach Road",
            houseNumber: "12/1",
        },
    });

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.sessionUser.role, "partner");
        assert.equal(result.sessionUser.companyId, 55);
        assert.equal(result.sessionUser.name, "Jane");
    }
    assert.equal(db.countCalls("INSERT INTO users", "batch"), 1);
    assert.equal(db.countCalls("INSERT INTO companies", "batch"), 1);
});
