import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";
import { Input } from "~/components/dashboard/Input";
import FormSection from "~/components/dashboard/FormSection";
import PhotoUpload from "~/components/dashboard/PhotoUpload";
import DocumentPhotosUpload from "~/components/dashboard/DocumentPhotosUpload";
import { UserIcon, BuildingOfficeIcon, DocumentTextIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { uploadAvatarFromBase64, deleteAvatar } from "~/lib/r2.server";
import ProfileForm from "~/components/dashboard/ProfileForm";
import { useToast } from "~/lib/toast";
import { useEffect } from "react";
import { userSchema } from "~/schemas/user";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { PASSWORD_MIN_LENGTH } from "~/lib/password";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const fullUser = await db.query.users.findFirst({
        where: eq(schema.users.id, sessionUser.id),
        columns: { passwordHash: false },
    });
    if (!fullUser) throw new Response("User not found", { status: 404 });

    // Load reference data
    const [countries, hotels, locations, districts] = await Promise.all([
        db.select().from(schema.countries).all(),
        db.select().from(schema.hotels).all(),
        db.select().from(schema.locations).all(),
        db.select().from(schema.districts).all(),
    ]);

    return {
        user: fullUser,
        currentUserRole: sessionUser.role,
        countries,
        hotels,
        locations,
        districts
    };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    // Get current user data
    const currentUser = await db.query.users.findFirst({
        where: eq(schema.users.id, user.id),
        columns: { passwordHash: false },
    });
    if (!currentUser) throw new Response("User not found", { status: 404 });

    let avatarUrl = currentUser.avatarUrl;

    // Handle avatar upload
    const avatarBase64 = formData.get("avatarBase64") as string | null;
    const avatarFileName = formData.get("avatarFileName") as string | null;

    if (avatarBase64 && avatarFileName) {
        if (currentUser.avatarUrl) {
            try {
                await deleteAvatar(context.cloudflare.env.ASSETS, currentUser.avatarUrl);
            } catch (error) {
                console.error("Failed to delete old avatar:", error);
            }
        }
        avatarUrl = await uploadAvatarFromBase64(
            context.cloudflare.env.ASSETS,
            user.id,
            avatarBase64,
            avatarFileName
        );
    }

    // Handle avatar removal
    const removeAvatar = formData.get("removeAvatar") === "true";
    if (removeAvatar && currentUser.avatarUrl) {
        try {
            await deleteAvatar(context.cloudflare.env.ASSETS, currentUser.avatarUrl);
            avatarUrl = null;
        } catch (error) {
            console.error("Failed to delete avatar:", error);
        }
    }

    // Parse form data
    const rawData = {
        email: currentUser.email, // Email cannot be changed
        role: currentUser.role, // Role handled separately
        name: (formData.get("name") as string) || null,
        surname: (formData.get("surname") as string) || null,
        phone: (formData.get("phone") as string) || null,
        whatsapp: (formData.get("whatsapp") as string) || null,
        telegram: (formData.get("telegram") as string) || null,
        passportNumber: (formData.get("passportNumber") as string) || null,
        citizenship: (formData.get("citizenship") as string) || null,
        city: (formData.get("city") as string) || null,
        countryId: formData.get("countryId") ? parseInt(formData.get("countryId") as string) : null,
        dateOfBirth: (formData.get("dateOfBirth") as string) || null,
        gender: (formData.get("gender") as "male" | "female" | "other") || null,
        hotelId: formData.get("hotelId") ? parseInt(formData.get("hotelId") as string) : null,
        roomNumber: (formData.get("roomNumber") as string) || null,
        locationId: formData.get("locationId") ? parseInt(formData.get("locationId") as string) : null,
        districtId: formData.get("districtId") ? parseInt(formData.get("districtId") as string) : null,
        address: (formData.get("address") as string) || null,
    };

    const parseDocPhotos = (value: FormDataEntryValue | null): string | null => {
        if (typeof value !== "string") return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed) && parsed.length === 0) return null;
            return JSON.stringify(parsed);
        } catch {
            return null;
        }
    };

    const passportPhotos = parseDocPhotos(formData.get("passportPhotos"));
    const driverLicensePhotos = parseDocPhotos(formData.get("driverLicensePhotos"));
    const newPassword = (formData.get("newPassword") as string | null) || "";
    const confirmPassword = (formData.get("confirmPassword") as string | null) || "";

    // Validate with Zod
    const validation = userSchema.safeParse(rawData);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return redirect(`/profile/edit?error=${encodeURIComponent(firstError.message)}`);
    }

    const validData = validation.data;

    try {
        const updateData: any = {
            ...validData,
            dateOfBirth: validData.dateOfBirth ? new Date(validData.dateOfBirth) : null,
            avatarUrl,
            passportPhotos,
            driverLicensePhotos,
            updatedAt: new Date(),
        };

        const passwordChanged = !!(newPassword || confirmPassword);
        if (newPassword || confirmPassword) {
            if (newPassword.length < PASSWORD_MIN_LENGTH) {
                return redirect(`/profile/edit?error=${encodeURIComponent(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)}`);
            }
            if (newPassword !== confirmPassword) {
                return redirect(`/profile/edit?error=${encodeURIComponent("Passwords do not match")}`);
            }
            const { hashPassword } = await import("~/lib/password.server");
            updateData.passwordHash = await hashPassword(newPassword);
        }

        // Only admin can change role
        if (user.role === "admin") {
            const newRole = formData.get("role") as string;
            if (newRole && ["admin", "partner", "manager", "user"].includes(newRole)) {
                updateData.role = newRole;
            }
        }

        await db.update(schema.users)
            .set(updateData)
            .where(eq(schema.users.id, user.id));

        // Audit log
        const metadata = getRequestMetadata(request);
        quickAudit({
            db,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: "user",
            entityId: user.id,
            action: "update",
            beforeState: currentUser,
            afterState: { ...validData, id: user.id, passwordChanged },
            ...metadata,
        });

        return redirect(`/profile?success=${encodeURIComponent("Profile updated successfully")}`);
    } catch (error) {
        console.error("Failed to update profile:", error);
        return redirect(`/profile/edit?error=${encodeURIComponent("Failed to update profile")}`);
    }
}

export default function EditProfilePage() {
    const { user, currentUserRole, countries, hotels, locations, districts } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();

    // Toast notifications
    useEffect(() => {
        const error = searchParams.get("error");
        if (error) {
            toast.error(error);
        }
    }, [searchParams, toast]);

    return (
        <div className="space-y-4">
            <PageHeader
                title="Edit Profile"
                leftActions={<BackButton to="/profile" />}
                rightActions={
                    <Button type="submit" variant="primary" form="profile-form">
                        Save Changes
                    </Button>
                }
            />
            <ProfileForm
                user={user}
                currentUserRole={currentUserRole}
                countries={countries}
                hotels={hotels}
                locations={locations}
                districts={districts}
                isEdit={true}
            />
        </div>
    );
}
