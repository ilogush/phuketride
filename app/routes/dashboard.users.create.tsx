import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import ProfileForm from "~/components/dashboard/ProfileForm";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import { useToast } from "~/lib/toast";
import { useEffect } from "react";
import { userSchema } from "~/schemas/user";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { PASSWORD_MIN_LENGTH } from "~/lib/password";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }

    // Load reference data
    const [countries, hotels, locations, districts] = await Promise.all([
        context.cloudflare.env.DB.prepare("SELECT * FROM countries ORDER BY name ASC").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT * FROM hotels ORDER BY name ASC").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT * FROM locations ORDER BY name ASC").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT * FROM districts ORDER BY name ASC").all().then((r: any) => r.results || []),
    ]);

    return { user, countries, hotels, locations, districts };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
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

    const newPassword = (formData.get("newPassword") as string | null) || "";
    const confirmPassword = (formData.get("confirmPassword") as string | null) || "";

    // Validate with Zod
    const validation = userSchema.safeParse(rawData);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return redirect(`/users/create?error=${encodeURIComponent(firstError.message)}`);
    }

    const validData = validation.data;

    try {
        const id = crypto.randomUUID();
        let passwordHash: string | null = null;

        if (newPassword || confirmPassword) {
            if (newPassword.length < PASSWORD_MIN_LENGTH) {
                return redirect(`/users/create?error=${encodeURIComponent(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)}`);
            }
            if (newPassword !== confirmPassword) {
                return redirect(`/users/create?error=${encodeURIComponent("Passwords do not match")}`);
            }
            const { hashPassword } = await import("~/lib/password.server");
            passwordHash = await hashPassword(newPassword);
        }

        const dateOfBirth = validData.dateOfBirth ? new Date(validData.dateOfBirth).toISOString() : null;
        await context.cloudflare.env.DB
            .prepare(`
                INSERT INTO users (
                    id, email, role, name, surname, phone, whatsapp, telegram,
                    passport_number, citizenship, city, country_id, date_of_birth, gender,
                    hotel_id, room_number, location_id, district_id, address,
                    avatar_url, passport_photos, driver_license_photos, password_hash,
                    is_first_login, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                validData.citizenship,
                validData.city,
                validData.countryId,
                dateOfBirth,
                validData.gender,
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

        return redirect(`/users?success=${encodeURIComponent("User created successfully")}`);
    } catch {
        return redirect(`/users/create?error=${encodeURIComponent("Failed to create user")}`);
    }
}

export default function CreateUserPage() {
    const { user, countries, hotels, locations, districts } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();

    // Toast notifications
    useEffect(() => {
        const error = searchParams.get("error");
        if (error) {
            toast.error(error);
        }
    }, [searchParams, toast]);

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
        citizenship: null,
        city: null,
        countryId: null,
        dateOfBirth: null,
        gender: null as "male" | "female" | "other" | null,
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
                countries={countries}
                hotels={hotels}
                locations={locations}
                districts={districts}
                isEdit={true}
            />
        </div>
    );
}
