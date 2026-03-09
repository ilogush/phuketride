import { PASSWORD_MIN_LENGTH } from "~/lib/password";
import { hashPassword } from "~/lib/password.server";
import { quickAudit, getRequestMetadata, type AuditAction } from "~/lib/audit-logger";
import {
    deleteAssetUrls,
    deleteAvatar,
    uploadAvatarFromBase64,
    uploadPhotoItemsToR2,
    type UploadPhotoItem,
} from "~/lib/r2.server";
import {
    getCachedDistricts,
    getCachedHotels,
    getCachedLocations,
    type CachedDistrictRow,
    type CachedHotelRow,
    type CachedLocationRow,
} from "~/lib/dictionaries-cache.server";
import { userSchema, type UserFormData } from "~/schemas/user";
import type { SessionUser } from "~/lib/auth.server";
import { parseWithSchema } from "~/lib/validation.server";

export interface LookupOption {
    id: number;
    name: string;
}

export interface DistrictLookupOption extends LookupOption {
    locationId: number;
}

export interface EditableProfileUserRow {
    id: string;
    email: string;
    role: "admin" | "partner" | "manager" | "user";
    name: string | null;
    surname: string | null;
    phone: string | null;
    whatsapp: string | null;
    telegram: string | null;
    passportNumber: string | null;
    passportPhotos: string | null;
    driverLicensePhotos: string | null;
    avatarUrl: string | null;
    hotelId: number | null;
    roomNumber: string | null;
    locationId: number | null;
    districtId: number | null;
    address: string | null;
}

type UserMutationActor = Pick<SessionUser, "id" | "role" | "companyId">;
type UserMutationResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ParsedUserMutationForm {
    validData: UserFormData;
    newPassword: string;
    confirmPassword: string;
    avatarBase64: string | null;
    avatarFileName: string | null;
    removeAvatar: boolean;
    passportPhotosInput: UploadPhotoItem[];
    driverLicensePhotosInput: UploadPhotoItem[];
    fallbackDocumentPhotosInput: UploadPhotoItem[];
}

function getOptionalString(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" && value.length > 0 ? value : null;
}

function getOptionalInt(formData: FormData, key: string) {
    const value = getOptionalString(formData, key);
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

export async function loadProfileReferenceData(db: D1Database) {
    const [hotels, locations, districts] = await Promise.all([
        getCachedHotels(db) as Promise<CachedHotelRow[]>,
        getCachedLocations(db) as Promise<CachedLocationRow[]>,
        getCachedDistricts(db) as Promise<CachedDistrictRow[]>,
    ]);

    return { hotels, locations, districts };
}

export async function loadEditableProfileUser(
    db: D1Database,
    userId: string,
    companyId?: number | null
): Promise<EditableProfileUserRow | null> {
    if (!userId) {
        return null;
    }

    if (companyId) {
        return (await db
            .prepare(`
                SELECT DISTINCT
                    u.id,
                    u.email,
                    u.role,
                    u.name,
                    u.surname,
                    u.phone,
                    u.whatsapp,
                    u.telegram,
                    u.passport_number AS passportNumber,
                    u.passport_photos AS passportPhotos,
                    u.driver_license_photos AS driverLicensePhotos,
                    u.avatar_url AS avatarUrl,
                    u.hotel_id AS hotelId,
                    u.room_number AS roomNumber,
                    u.location_id AS locationId,
                    u.district_id AS districtId,
                    u.address
                FROM users u
                LEFT JOIN managers m ON u.id = m.user_id AND m.company_id = ? AND m.is_active = 1
                LEFT JOIN contracts c ON u.id = c.client_id
                LEFT JOIN company_cars cc ON c.company_car_id = cc.id AND cc.company_id = ?
                WHERE u.id = ? AND (m.id IS NOT NULL OR cc.id IS NOT NULL) AND u.archived_at IS NULL
                LIMIT 1
            `)
            .bind(companyId, companyId, userId)
            .first()) as EditableProfileUserRow | null;
    }

    return (await db
        .prepare(`
            SELECT id, email, role, name, surname, phone, whatsapp, telegram,
                   passport_number AS passportNumber,
                   passport_photos AS passportPhotos, driver_license_photos AS driverLicensePhotos,
                   avatar_url AS avatarUrl,
                   hotel_id AS hotelId, room_number AS roomNumber, location_id AS locationId,
                   district_id AS districtId, address
            FROM users
            WHERE id = ? AND archived_at IS NULL
            LIMIT 1
        `)
        .bind(userId)
        .first()) as EditableProfileUserRow | null;
}

export async function loadEditableProfilePageData(db: D1Database, userId: string, companyId?: number | null) {
    const [user, references] = await Promise.all([loadEditableProfileUser(db, userId, companyId), loadProfileReferenceData(db)]);
    return { user, ...references };
}

export function parseUserMutationForm(
    formData: FormData,
    options: {
        email: string;
        role: EditableProfileUserRow["role"];
    }
): UserMutationResult<ParsedUserMutationForm> {
    const rawData = {
        email: getOptionalString(formData, "email") ?? options.email,
        role: (getOptionalString(formData, "role") as EditableProfileUserRow["role"] | null) ?? options.role,
        name: getOptionalString(formData, "name"),
        surname: getOptionalString(formData, "surname"),
        phone: getOptionalString(formData, "phone"),
        whatsapp: getOptionalString(formData, "whatsapp"),
        telegram: getOptionalString(formData, "telegram"),
        passportNumber: getOptionalString(formData, "passportNumber"),
        hotelId: getOptionalInt(formData, "hotelId"),
        roomNumber: getOptionalString(formData, "roomNumber"),
        locationId: getOptionalInt(formData, "locationId"),
        districtId: getOptionalInt(formData, "districtId"),
        address: getOptionalString(formData, "address"),
    };

    const validation = parseWithSchema(userSchema, rawData, "Validation failed");
    if (!validation.ok) {
        return { ok: false, error: validation.error };
    }

    return {
        ok: true,
        data: {
            validData: validation.data,
            newPassword: getOptionalString(formData, "newPassword") ?? "",
            confirmPassword: getOptionalString(formData, "confirmPassword") ?? "",
            avatarBase64: getOptionalString(formData, "avatarBase64"),
            avatarFileName: getOptionalString(formData, "avatarFileName"),
            removeAvatar: formData.get("removeAvatar") === "true",
            passportPhotosInput: parseUploadPhotoItems(formData.get("passportPhotos")),
            driverLicensePhotosInput: parseUploadPhotoItems(formData.get("driverLicensePhotos")),
            fallbackDocumentPhotosInput: parseUploadPhotoItems(formData.get("documentPhotos")),
        },
    };
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

export async function resolveProfileAssets(args: {
    bucket: R2Bucket;
    userId: string;
    currentUser: Pick<EditableProfileUserRow, "avatarUrl" | "passportPhotos" | "driverLicensePhotos">;
    avatarBase64: string | null;
    avatarFileName: string | null;
    removeAvatar: boolean;
    passportPhotosInput: UploadPhotoItem[];
    driverLicensePhotosInput: UploadPhotoItem[];
    fallbackDocumentPhotosInput?: UploadPhotoItem[];
}) {
    let avatarUrl = args.currentUser.avatarUrl ?? null;
    const nextPassportInput =
        args.passportPhotosInput.length > 0
            ? args.passportPhotosInput
            : args.fallbackDocumentPhotosInput && args.fallbackDocumentPhotosInput.length > 0
              ? args.fallbackDocumentPhotosInput
              : parseStoredPhotoItems(args.currentUser.passportPhotos);
    const nextDriverLicenseInput =
        args.driverLicensePhotosInput.length > 0
            ? args.driverLicensePhotosInput
            : parseStoredPhotoItems(args.currentUser.driverLicensePhotos);

    const existingPassportPhotos = parseStoredPhotoItems(args.currentUser.passportPhotos);
    const existingDriverLicensePhotos = parseStoredPhotoItems(args.currentUser.driverLicensePhotos);

    if (args.avatarBase64 && args.avatarFileName) {
        if (args.currentUser.avatarUrl) {
            try {
                await deleteAvatar(args.bucket, args.currentUser.avatarUrl);
            } catch {
            }
        }
        avatarUrl = await uploadAvatarFromBase64(args.bucket, args.userId, args.avatarBase64, args.avatarFileName);
    } else if (args.removeAvatar && args.currentUser.avatarUrl) {
        try {
            await deleteAvatar(args.bucket, args.currentUser.avatarUrl);
        } catch {
        }
        avatarUrl = null;
    }

    const [uploadedPassportPhotos, uploadedDriverLicensePhotos] = await Promise.all([
        uploadPhotoItemsToR2(args.bucket, nextPassportInput, `users/${args.userId}/passport`),
        uploadPhotoItemsToR2(args.bucket, nextDriverLicenseInput, `users/${args.userId}/driver-license`),
    ]);

    const removedPassportUrls = getRemovedAssetUrls(existingPassportPhotos, uploadedPassportPhotos);
    const removedDriverUrls = getRemovedAssetUrls(existingDriverLicensePhotos, uploadedDriverLicensePhotos);
    if (removedPassportUrls.length > 0 || removedDriverUrls.length > 0) {
        await deleteAssetUrls(args.bucket, [...removedPassportUrls, ...removedDriverUrls]);
    }

    return {
        avatarUrl,
        passportPhotos: uploadedPassportPhotos.length > 0 ? JSON.stringify(uploadedPassportPhotos) : null,
        driverLicensePhotos: uploadedDriverLicensePhotos.length > 0 ? JSON.stringify(uploadedDriverLicensePhotos) : null,
    };
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

async function auditUserMutation(args: {
    db: D1Database;
    request: Request;
    actor: UserMutationActor;
    entityId: string;
    action: AuditAction;
    beforeState?: unknown;
    afterState?: unknown;
}) {
    await quickAudit({
        db: args.db,
        userId: args.actor.id,
        role: args.actor.role,
        companyId: args.actor.companyId,
        entityType: "user",
        entityId: args.entityId,
        action: args.action,
        beforeState: (args.beforeState ?? undefined) as Record<string, unknown> | null | undefined,
        afterState: (args.afterState ?? undefined) as Record<string, unknown> | null | undefined,
        ...getRequestMetadata(args.request),
    });
}

export async function createManagedUser(args: {
    db: D1Database;
    request: Request;
    actor: UserMutationActor;
    formData: FormData;
}): Promise<UserMutationResult<{ userId: string }>> {
    const parsed = parseUserMutationForm(args.formData, {
        email: "",
        role: "user",
    });
    if (!parsed.ok) {
        return parsed;
    }

    const { validData, newPassword, confirmPassword } = parsed.data;
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { passwordHash, error } = await resolvePasswordHash(newPassword, confirmPassword);
    if (error) {
        return { ok: false, error };
    }

    await args.db
        .prepare(`
            INSERT INTO users (
                id, email, role, name, surname, phone, whatsapp, telegram,
                passport_number,
                hotel_id, room_number, location_id, district_id, address,
                avatar_url, passport_photos, driver_license_photos, password_hash,
                is_first_login, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
            userId,
            validData.email,
            validData.role,
            validData.name,
            validData.surname,
            validData.phone,
            validData.whatsapp,
            validData.telegram,
            validData.passportNumber,
            validData.hotelId,
            validData.roomNumber,
            validData.locationId,
            validData.districtId,
            validData.address,
            null,
            null,
            null,
            passwordHash,
            1,
            now,
            now
        )
        .run();

    await auditUserMutation({
        db: args.db,
        request: args.request,
        actor: args.actor,
        entityId: userId,
        action: "create",
        afterState: { ...validData, id: userId },
    });

    return { ok: true, data: { userId } };
}

export async function updateManagedUser(args: {
    db: D1Database;
    bucket: R2Bucket;
    request: Request;
    actor: UserMutationActor;
    targetUserId: string;
    currentUser: EditableProfileUserRow;
    formData: FormData;
    allowEmailChange: boolean;
    allowRoleChange: boolean;
}): Promise<UserMutationResult<{ passwordChanged: boolean }>> {
    const parsed = parseUserMutationForm(args.formData, {
        email: args.allowEmailChange ? "" : args.currentUser.email,
        role: args.allowRoleChange ? "user" : args.currentUser.role,
    });
    if (!parsed.ok) {
        return parsed;
    }

    const {
        validData,
        newPassword,
        confirmPassword,
        avatarBase64,
        avatarFileName,
        removeAvatar,
        passportPhotosInput,
        driverLicensePhotosInput,
        fallbackDocumentPhotosInput,
    } = parsed.data;
    const nextEmail = args.allowEmailChange ? validData.email : args.currentUser.email;
    const nextRole = args.allowRoleChange ? validData.role : args.currentUser.role;

    const { passwordChanged, passwordHash, error } = await resolvePasswordHash(newPassword, confirmPassword);
    if (error) {
        return { ok: false, error };
    }

    const assets = await resolveProfileAssets({
        bucket: args.bucket,
        userId: args.targetUserId,
        currentUser: args.currentUser,
        avatarBase64,
        avatarFileName,
        removeAvatar,
        passportPhotosInput,
        driverLicensePhotosInput,
        fallbackDocumentPhotosInput,
    });

    await args.db
        .prepare(`
            UPDATE users
            SET email = ?, role = ?, name = ?, surname = ?, phone = ?, whatsapp = ?, telegram = ?,
                passport_number = ?,
                passport_photos = ?, driver_license_photos = ?, avatar_url = ?,
                hotel_id = ?, room_number = ?, location_id = ?, district_id = ?, address = ?,
                password_hash = COALESCE(?, password_hash), updated_at = ?
            WHERE id = ?
        `)
        .bind(
            nextEmail,
            nextRole,
            validData.name,
            validData.surname,
            validData.phone,
            validData.whatsapp,
            validData.telegram,
            validData.passportNumber,
            assets.passportPhotos,
            assets.driverLicensePhotos,
            assets.avatarUrl,
            validData.hotelId,
            validData.roomNumber,
            validData.locationId,
            validData.districtId,
            validData.address,
            passwordHash,
            new Date().toISOString(),
            args.targetUserId
        )
        .run();

    await auditUserMutation({
        db: args.db,
        request: args.request,
        actor: args.actor,
        entityId: args.targetUserId,
        action: "update",
        beforeState: args.currentUser,
        afterState: { ...validData, id: args.targetUserId, email: nextEmail, role: nextRole, passwordChanged },
    });

    return { ok: true, data: { passwordChanged } };
}

export async function deleteManagedUser(args: {
    db: D1Database;
    request: Request;
    actor: UserMutationActor;
    targetUserId: string;
    currentUser: EditableProfileUserRow;
}): Promise<UserMutationResult<null>> {
    if (args.targetUserId === args.actor.id) {
        return { ok: false, error: "You cannot delete your own account" };
    }

    try {
        await args.db.prepare("DELETE FROM managers WHERE user_id = ?").bind(args.targetUserId).run();
        await args.db.prepare("DELETE FROM users WHERE id = ?").bind(args.targetUserId).run();
    } catch {
        return { ok: false, error: "Failed to delete user (record is linked to other data)" };
    }

    await auditUserMutation({
        db: args.db,
        request: args.request,
        actor: args.actor,
        entityId: args.targetUserId,
        action: "delete",
        beforeState: args.currentUser,
        afterState: { id: args.targetUserId, deleted: true },
    });

    return { ok: true, data: null };
}
