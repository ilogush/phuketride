import test from "node:test";
import assert from "node:assert/strict";
import {
    createManagedUser,
    deleteManagedUser,
    parseUserMutationForm,
    resolveProfileAssets,
} from "../app/lib/user-profile.server";
import { FakeD1Database } from "./helpers/fake-d1";

class FakeBucket {
    puts: string[] = [];
    deletes: string[] = [];

    async put(key: string) {
        this.puts.push(key);
    }

    async delete(key: string) {
        this.deletes.push(key);
    }
}

test("resolveProfileAssets preserves existing document photos when no new uploads are provided", async () => {
    const bucket = new FakeBucket();
    const result = await resolveProfileAssets({
        bucket: bucket as unknown as R2Bucket,
        userId: "user-1",
        currentUser: {
            avatarUrl: "/assets/avatars/user-1.webp",
            passportPhotos: JSON.stringify([{ base64: "/assets/users/user-1/passport/a.webp", fileName: "a.webp" }]),
            driverLicensePhotos: JSON.stringify([{ base64: "/assets/users/user-1/driver/b.webp", fileName: "b.webp" }]),
        },
        avatarBase64: null,
        avatarFileName: null,
        removeAvatar: false,
        passportPhotosInput: [],
        driverLicensePhotosInput: [],
    });

    assert.equal(result.avatarUrl, "/assets/avatars/user-1.webp");
    assert.equal(
        result.passportPhotos,
        JSON.stringify([{ base64: "/assets/users/user-1/passport/a.webp", fileName: "a.webp" }])
    );
    assert.equal(
        result.driverLicensePhotos,
        JSON.stringify([{ base64: "/assets/users/user-1/driver/b.webp", fileName: "b.webp" }])
    );
    assert.deepEqual(bucket.deletes, []);
});

test("resolveProfileAssets deletes removed passport assets when list changes", async () => {
    const bucket = new FakeBucket();
    const result = await resolveProfileAssets({
        bucket: bucket as unknown as R2Bucket,
        userId: "user-1",
        currentUser: {
            avatarUrl: null,
            passportPhotos: JSON.stringify([
                { base64: "/assets/users/user-1/passport/a.webp", fileName: "a.webp" },
                { base64: "/assets/users/user-1/passport/b.webp", fileName: "b.webp" },
            ]),
            driverLicensePhotos: null,
        },
        avatarBase64: null,
        avatarFileName: null,
        removeAvatar: false,
        passportPhotosInput: [{ base64: "/assets/users/user-1/passport/b.webp", fileName: "b.webp" }],
        driverLicensePhotosInput: [],
    });

    assert.equal(
        result.passportPhotos,
        JSON.stringify([{ base64: "/assets/users/user-1/passport/b.webp", fileName: "b.webp" }])
    );
    assert.deepEqual(bucket.deletes, ["users/user-1/passport/a.webp"]);
});

test("parseUserMutationForm normalizes fields and falls back to provided email and role", () => {
    const formData = new FormData();
    formData.set("name", "John");
    formData.set("surname", "Smith");
    formData.set("hotelId", "5");
    formData.set("documentPhotos", JSON.stringify([{ base64: "data:image/png;base64,aaa", fileName: "doc.png" }]));

    const result = parseUserMutationForm(formData, {
        email: "user@example.com",
        role: "manager",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.data.validData.email, "user@example.com");
        assert.equal(result.data.validData.role, "manager");
        assert.equal(result.data.validData.hotelId, 5);
        assert.equal(result.data.fallbackDocumentPhotosInput.length, 1);
    }
});

test("createManagedUser inserts user and audit log", async () => {
    const db = new FakeD1Database([
        {
            match: "INSERT INTO users",
            run: [{ meta: { last_row_id: 1 } }],
        },
        {
            match: "INSERT INTO audit_logs",
            run: [{ meta: { last_row_id: 2 } }],
        },
    ]);
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("role", "user");
    formData.set("name", "John");
    formData.set("newPassword", "secret123");
    formData.set("confirmPassword", "secret123");

    const result = await createManagedUser({
        db: db as unknown as D1Database,
        request: new Request("https://example.com/users/create"),
        actor: {
            id: "admin-1",
            role: "admin",
            companyId: 3,
        },
        formData,
    });

    assert.equal(result.ok, true);
    assert.equal(db.countCalls("INSERT INTO users", "run"), 1);
    assert.equal(db.countCalls("INSERT INTO audit_logs", "run"), 1);
});

test("deleteManagedUser blocks self-delete without touching database", async () => {
    const db = new FakeD1Database([]);

    const result = await deleteManagedUser({
        db: db as unknown as D1Database,
        request: new Request("https://example.com/users/user-1/edit"),
        actor: {
            id: "user-1",
            role: "admin",
            companyId: 3,
        },
        targetUserId: "user-1",
        currentUser: {
            id: "user-1",
            email: "user@example.com",
            role: "user",
            name: "User",
            surname: null,
            phone: null,
            whatsapp: null,
            telegram: null,
            passportNumber: null,
            passportPhotos: null,
            driverLicensePhotos: null,
            avatarUrl: null,
            hotelId: null,
            roomNumber: null,
            locationId: null,
            districtId: null,
            address: null,
        },
    });

    assert.deepEqual(result, {
        ok: false,
        error: "You cannot delete your own account",
    });
    assert.equal(db.calls.length, 0);
});
