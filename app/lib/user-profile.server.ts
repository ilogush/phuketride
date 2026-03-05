import { PASSWORD_MIN_LENGTH } from "~/lib/password";
import { hashPassword } from "~/lib/password.server";
import type { UploadPhotoItem } from "~/lib/r2.server";

export interface LookupOption {
    id: number;
    name: string;
}

export interface DistrictLookupOption extends LookupOption {
    locationId: number;
}

export async function loadProfileReferenceData(db: D1Database) {
    const [hotels, locations, districts] = await Promise.all([
        db
            .prepare("SELECT id, name FROM hotels ORDER BY name ASC")
            .all()
            .then((r) => (r.results ?? []) as unknown as LookupOption[]),
        db
            .prepare("SELECT id, name FROM locations ORDER BY name ASC")
            .all()
            .then((r) => (r.results ?? []) as unknown as LookupOption[]),
        db
            .prepare("SELECT id, name, location_id AS locationId FROM districts ORDER BY name ASC")
            .all()
            .then((r) => (r.results ?? []) as unknown as DistrictLookupOption[]),
    ]);

    return { hotels, locations, districts };
}

export function parseUploadPhotoItems(value: FormDataEntryValue | null): UploadPhotoItem[] {
    if (typeof value !== "string") return [];
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((p) => p && typeof p.base64 === "string" && typeof p.fileName === "string");
    } catch {
        return [];
    }
}

export function parseStoredPhotoItems(value: string | null | undefined): UploadPhotoItem[] {
    if (!value) return [];

    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((p) => p && typeof p.base64 === "string" && typeof p.fileName === "string");
    } catch {
        return [];
    }
}

export function getRemovedAssetUrls(existing: UploadPhotoItem[], next: UploadPhotoItem[]): string[] {
    const kept = new Set(next.map((p) => p.base64));

    return existing
        .map((p) => p.base64)
        .filter((url) => url.startsWith("/assets/") || url.startsWith("http://") || url.startsWith("https://"))
        .filter((url) => !kept.has(url));
}

export async function resolvePasswordHash(newPassword: string, confirmPassword: string): Promise<{
    passwordChanged: boolean;
    passwordHash: string | null;
    error: string | null;
}> {
    const passwordChanged = Boolean(newPassword || confirmPassword);

    if (!passwordChanged) {
        return { passwordChanged, passwordHash: null, error: null };
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
        return {
            passwordChanged,
            passwordHash: null,
            error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        };
    }

    if (newPassword !== confirmPassword) {
        return { passwordChanged, passwordHash: null, error: "Passwords do not match" };
    }

    return {
        passwordChanged,
        passwordHash: await hashPassword(newPassword),
        error: null,
    };
}
