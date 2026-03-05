import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAdmin } from "~/lib/auth.server";
import ProfileForm from "~/components/dashboard/ProfileForm";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import { useUrlToast } from "~/lib/useUrlToast";
import { userSchema } from "~/schemas/user";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { loadProfileReferenceData, resolvePasswordHash } from "~/lib/user-profile.server";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError, redirectWithSuccess } from "~/lib/route-feedback";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAdmin(request);

    // Load reference data
    const { hotels, locations, districts } = await loadProfileReferenceData(context.cloudflare.env.DB);

    return { user, hotels, locations, districts };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAdmin(request);
    const formData = await request.formData();

    // Parse form data
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

    // Validate with Zod
    const validation = parseWithSchema(userSchema, rawData, "Validation failed");
    if (!validation.ok) {
        return redirectWithError("/users/create", validation.error);
    }

    const validData = validation.data;

    try {
        const id = crypto.randomUUID();
        const { passwordHash, error } = await resolvePasswordHash(newPassword, confirmPassword);
        if (error) {
            return redirectWithError("/users/create", error);
        }

        await context.cloudflare.env.DB
            .prepare(`
                INSERT INTO users (
                    id, email, role, name, surname, phone, whatsapp, telegram,
                    passport_number,
                    hotel_id, room_number, location_id, district_id, address,
                    avatar_url, passport_photos, driver_license_photos, password_hash,
                    is_first_login, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
                id,
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
                new Date().toISOString(),
                new Date().toISOString()
            )
            .run();

        // Audit log
        const metadata = getRequestMetadata(request);
        quickAudit({
            db: context.cloudflare.env.DB,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: "user",
            entityId: id,
            action: "create",
            afterState: { ...validData, id },
            ...metadata,
        });

        return redirectWithSuccess("/users", "User created successfully");
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create user";
        return redirectWithError("/users/create", message);
    }
}

export default function CreateUserPage() {
    const { user, hotels, locations, districts } = useLoaderData<typeof loader>();
    useUrlToast();

    // Empty user object for create mode
    const emptyUser = {
        id: "",
        email: "",
        name: null,
        surname: null,
        phone: null,
        whatsapp: null,
        telegram: null,
        passportNumber: null,
        hotelId: null,
        roomNumber: null,
        locationId: null,
        districtId: null,
        address: null,
        avatarUrl: null,
        role: "user",
        passportPhotos: null,
        driverLicensePhotos: null,
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title="Add New User"
                leftActions={<BackButton to="/users" />}
                rightActions={
                    <Button type="submit" variant="primary" form="profile-form">
                        Create User
                    </Button>
                }
            />
            <ProfileForm
                user={emptyUser}
                currentUserRole={user.role}
                hotels={hotels}
                locations={locations}
                districts={districts}
                isEdit={true}
            />
        </div>
    );
}
