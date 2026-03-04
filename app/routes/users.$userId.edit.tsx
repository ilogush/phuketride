import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import ProfileForm from "~/components/dashboard/ProfileForm";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { userSchema } from "~/schemas/user";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { PASSWORD_MIN_LENGTH } from "~/lib/password";
import { hashPassword } from "~/lib/password.server";
import {
    uploadAvatarFromBase64,
    deleteAvatar,
    deleteAssetUrls,
    uploadPhotoItemsToR2,
    type UploadPhotoItem,
} from "~/lib/r2.server";

interface EditableUserRow {
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

function parseUploadPhotoItems(value: FormDataEntryValue | null): UploadPhotoItem[] {
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

function parseStoredPhotoItems(value: string | null | undefined): UploadPhotoItem[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((p) => p && typeof p.base64 === "string" && typeof p.fileName === "string");
    } catch {
        return [];
    }
}

function getRemovedAssetUrls(existing: UploadPhotoItem[], next: UploadPhotoItem[]): string[] {
    const kept = new Set(next.map((p) => p.base64));
    return existing
        .map((p) => p.base64)
        .filter((url) => url.startsWith("/assets/") || url.startsWith("http://") || url.startsWith("https://"))
        .filter((url) => !kept.has(url));
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    if (sessionUser.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }

    const userId = params.userId;
    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    const user = (await context.cloudflare.env.DB
        .prepare(`
            SELECT id, email, role, name, surname, phone, whatsapp, telegram,
                   passport_number AS passportNumber,
                   passport_photos AS passportPhotos, driver_license_photos AS driverLicensePhotos,
                   avatar_url AS avatarUrl,
                   hotel_id AS hotelId, room_number AS roomNumber, location_id AS locationId,
                   district_id AS districtId, address
            FROM users
            WHERE id = ?
            LIMIT 1
        `)
        .bind(userId)
        .first()) as EditableUserRow | null;
    if (!user) {
        throw new Response("User not found", { status: 404 });
    }

    const [hotels, locations, districts] = await Promise.all([
        context.cloudflare.env.DB.prepare("SELECT id, name FROM hotels ORDER BY name ASC").all().then((r: { results?: Array<{ id: number; name: string }> }) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT id, name FROM locations ORDER BY name ASC").all().then((r: { results?: Array<{ id: number; name: string }> }) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT id, name, location_id AS locationId FROM districts ORDER BY name ASC").all().then((r: { results?: Array<{ id: number; name: string; locationId: number }> }) => r.results || []),
    ]);

    return { user, currentUserRole: sessionUser.role, hotels, locations, districts };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const sessionUser = await requireAuth(request);
    if (sessionUser.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }

    const formData = await request.formData();
    const intent = formData.get("intent");

    const userId = params.userId;
    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    const currentUser = (await context.cloudflare.env.DB
        .prepare(`
            SELECT id, email, role, name, surname, phone, whatsapp, telegram,
                   passport_number AS passportNumber,
                   passport_photos AS passportPhotos, driver_license_photos AS driverLicensePhotos,
                   avatar_url AS avatarUrl,
                   hotel_id AS hotelId, room_number AS roomNumber,
                   location_id AS locationId, district_id AS districtId, address
            FROM users
            WHERE id = ?
            LIMIT 1
        `)
        .bind(userId)
        .first()) as EditableUserRow | null;
    if (!currentUser) {
        throw new Response("User not found", { status: 404 });
    }
    let avatarUrl = currentUser.avatarUrl ?? null;

    if (intent === "deleteUser") {
        if (currentUser.id === sessionUser.id) {
            return redirect(`/users/${userId}/edit?error=${encodeURIComponent("You cannot delete your own account")}`);
        }

        try {
            await context.cloudflare.env.DB.prepare("DELETE FROM managers WHERE user_id = ?").bind(userId).run();
            await context.cloudflare.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();

            const metadata = getRequestMetadata(request);
            quickAudit({
                db: context.cloudflare.env.DB,
                userId: sessionUser.id,
                role: sessionUser.role,
                companyId: sessionUser.companyId,
                entityType: "user",
                entityId: userId,
                action: "delete",
                beforeState: currentUser,
                afterState: { id: userId, deleted: true },
                ...metadata,
            });

            return redirect(`/users?success=${encodeURIComponent("User deleted successfully")}`);
        } catch {
            return redirect(`/users/${userId}/edit?error=${encodeURIComponent("Failed to delete user (record is linked to other data)")}`);
        }
    }

    const rawData = {
        email: formData.get("email") as string,
        role: formData.get("role") as "admin" | "partner" | "manager" | "user",
        name: (formData.get("name") as string) || null,
        surname: (formData.get("surname") as string) || null,
        phone: (formData.get("phone") as string) || null,
        whatsapp: (formData.get("whatsapp") as string) || null,
        telegram: (formData.get("telegram") as string) || null,
        passportNumber: (formData.get("passportNumber") as string) || null,
        hotelId: formData.get("hotelId") ? parseInt(formData.get("hotelId") as string) : null,
        roomNumber: (formData.get("roomNumber") as string) || null,
        locationId: formData.get("locationId") ? parseInt(formData.get("locationId") as string) : null,
        districtId: formData.get("districtId") ? parseInt(formData.get("districtId") as string) : null,
        address: (formData.get("address") as string) || null,
    };

    const newPassword = (formData.get("newPassword") as string | null) || "";
    const confirmPassword = (formData.get("confirmPassword") as string | null) || "";
    const avatarBase64 = formData.get("avatarBase64") as string | null;
    const avatarFileName = formData.get("avatarFileName") as string | null;
    const removeAvatar = formData.get("removeAvatar") === "true";

    const passportPhotosInput = parseUploadPhotoItems(formData.get("passportPhotos"));
    const driverLicensePhotosInput = parseUploadPhotoItems(formData.get("driverLicensePhotos"));
    const fallbackDocumentPhotosInput = parseUploadPhotoItems(formData.get("documentPhotos"));
    const nextPassportInput = passportPhotosInput.length > 0 ? passportPhotosInput : fallbackDocumentPhotosInput;

    const existingPassportPhotos = parseStoredPhotoItems(currentUser.passportPhotos);
    const existingDriverLicensePhotos = parseStoredPhotoItems(currentUser.driverLicensePhotos);

    const validation = userSchema.safeParse(rawData);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return redirect(`/users/${userId}/edit?error=${encodeURIComponent(firstError.message)}`);
    }

    const validData = validation.data;

    try {
        const passwordChanged = !!(newPassword || confirmPassword);
        let passwordHash: string | null = null;
        if (passwordChanged) {
            if (newPassword.length < PASSWORD_MIN_LENGTH) {
                return redirect(`/users/${userId}/edit?error=${encodeURIComponent(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)}`);
            }
            if (newPassword !== confirmPassword) {
                return redirect(`/users/${userId}/edit?error=${encodeURIComponent("Passwords do not match")}`);
            }
            passwordHash = await hashPassword(newPassword);
        }

        if (avatarBase64 && avatarFileName) {
            if (currentUser.avatarUrl) {
                try {
                    await deleteAvatar(context.cloudflare.env.ASSETS, currentUser.avatarUrl);
                } catch {
                }
            }
            avatarUrl = await uploadAvatarFromBase64(context.cloudflare.env.ASSETS, userId, avatarBase64, avatarFileName);
        } else if (removeAvatar && currentUser.avatarUrl) {
            try {
                await deleteAvatar(context.cloudflare.env.ASSETS, currentUser.avatarUrl);
            } catch {
            }
            avatarUrl = null;
        }

        const [uploadedPassportPhotos, uploadedDriverLicensePhotos] = await Promise.all([
            uploadPhotoItemsToR2(context.cloudflare.env.ASSETS, nextPassportInput, `users/${userId}/passport`),
            uploadPhotoItemsToR2(context.cloudflare.env.ASSETS, driverLicensePhotosInput, `users/${userId}/driver-license`),
        ]);

        const passportPhotos = uploadedPassportPhotos.length > 0 ? JSON.stringify(uploadedPassportPhotos) : null;
        const driverLicensePhotos = uploadedDriverLicensePhotos.length > 0 ? JSON.stringify(uploadedDriverLicensePhotos) : null;

        const removedPassportUrls = getRemovedAssetUrls(existingPassportPhotos, uploadedPassportPhotos);
        const removedDriverUrls = getRemovedAssetUrls(existingDriverLicensePhotos, uploadedDriverLicensePhotos);
        if (removedPassportUrls.length > 0 || removedDriverUrls.length > 0) {
            await deleteAssetUrls(context.cloudflare.env.ASSETS, [...removedPassportUrls, ...removedDriverUrls]);
        }

        await context.cloudflare.env.DB
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
                validData.email,
                validData.role,
                validData.name,
                validData.surname,
                validData.phone,
                validData.whatsapp,
                validData.telegram,
                validData.passportNumber,
                passportPhotos,
                driverLicensePhotos,
                avatarUrl,
                validData.hotelId,
                validData.roomNumber,
                validData.locationId,
                validData.districtId,
                validData.address,
                passwordHash,
                new Date().toISOString(),
                userId
            )
            .run();

        const metadata = getRequestMetadata(request);
        quickAudit({
            db: context.cloudflare.env.DB,
            userId: sessionUser.id,
            role: sessionUser.role,
            companyId: sessionUser.companyId,
            entityType: "user",
            entityId: userId,
            action: "update",
            beforeState: currentUser,
            afterState: { ...validData, id: userId, passwordChanged },
            ...metadata,
        });

        return redirect(`/users/${userId}/edit?success=${encodeURIComponent("User updated successfully")}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update user";
        return redirect(`/users/${userId}/edit?error=${encodeURIComponent(message)}`);
    }
}

export default function EditUserPage() {
    const { user, currentUserRole, hotels, locations, districts } = useLoaderData<typeof loader>();
    useUrlToast();

    return (
        <div className="space-y-4">
            <PageHeader
                title="Edit User"
                leftActions={<BackButton to="/users" />}
                rightActions={
                    <div className="flex items-center gap-2">
                        <Button type="submit" variant="primary" form="profile-form">
                            Save
                        </Button>
                        <Form method="post">
                            <input type="hidden" name="intent" value="deleteUser" />
                            <Button type="submit" variant="secondary" title="Delete user">
                                <TrashIcon className="w-5 h-5" />
                            </Button>
                        </Form>
                    </div>
                }
            />
            <ProfileForm
                user={user}
                currentUserRole={currentUserRole}
                hotels={hotels}
                locations={locations}
                districts={districts}
                isEdit={true}
            />
        </div>
    );
}
