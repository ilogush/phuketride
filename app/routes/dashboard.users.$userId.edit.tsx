import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";
import FormSection from "~/components/dashboard/FormSection";
import { UserIcon, BuildingOfficeIcon, DocumentTextIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import { useEffect } from "react";
import { userSchema } from "~/schemas/user";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { PASSWORD_MIN_LENGTH } from "~/lib/password";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    if (sessionUser.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }

    const userId = params.userId;
    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    const user = await context.cloudflare.env.DB
        .prepare(`
            SELECT id, email, role, name, surname, phone, whatsapp, telegram,
                   passport_number AS passportNumber, citizenship, city, country_id AS countryId,
                   date_of_birth AS dateOfBirth, gender, avatar_url AS avatarUrl,
                   hotel_id AS hotelId, room_number AS roomNumber, location_id AS locationId,
                   district_id AS districtId, address
            FROM users
            WHERE id = ?
            LIMIT 1
        `)
        .bind(userId)
        .first<any>();
    if (!user) {
        throw new Response("User not found", { status: 404 });
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

export async function action({ request, context, params }: ActionFunctionArgs) {
    const sessionUser = await requireAuth(request);
    if (sessionUser.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }

    const formData = await request.formData();

    const userId = params.userId;
    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    // Get current user state for audit log
    const currentUser = await context.cloudflare.env.DB
        .prepare(`
            SELECT id, email, role, name, surname, phone, whatsapp, telegram,
                   passport_number AS passportNumber, citizenship, city, country_id AS countryId,
                   date_of_birth AS dateOfBirth, gender, hotel_id AS hotelId, room_number AS roomNumber,
                   location_id AS locationId, district_id AS districtId, address
            FROM users
            WHERE id = ?
            LIMIT 1
        `)
        .bind(userId)
        .first<any>();
    if (!currentUser) {
        throw new Response("User not found", { status: 404 });
    }

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
            const { hashPassword } = await import("~/lib/password.server");
            passwordHash = await hashPassword(newPassword);
        }

        const dateOfBirth = validData.dateOfBirth ? new Date(validData.dateOfBirth).toISOString() : null;
        await context.cloudflare.env.DB
            .prepare(`
                UPDATE users
                SET email = ?, role = ?, name = ?, surname = ?, phone = ?, whatsapp = ?, telegram = ?,
                    passport_number = ?, citizenship = ?, city = ?, country_id = ?, date_of_birth = ?,
                    gender = ?, hotel_id = ?, room_number = ?, location_id = ?, district_id = ?, address = ?,
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
                passwordHash,
                new Date().toISOString(),
                userId
            )
            .run();

        // Audit log
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

        return redirect(`/users/${userId}?success=${encodeURIComponent("User updated successfully")}`);
    } catch {
        return redirect(`/users/${userId}/edit?error=${encodeURIComponent("Failed to update user")}`);
    }
}

export default function EditUserPage() {
    const { user, countries, hotels, locations, districts } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const { validateLatinInput } = useLatinValidation();

    // Toast notifications
    useEffect(() => {
        const error = searchParams.get("error");
        if (error) {
            toast.error(error);
        }
    }, [searchParams, toast]);

    const initials = `${user.name?.[0] || ''}${user.surname?.[0] || ''}`.toUpperCase() || user.email[0].toUpperCase();

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BackButton to={`/users/${user.id}`} />
                    <PageHeader title="Edit User" />
                </div>
                <Button type="submit" variant="primary" form="user-form">
                    Save
                </Button>
            </div>

            {/* Profile Photo Section */}
            <div className="bg-white rounded-3xl shadow-sm p-4">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                        {initials}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-1">Profile Photo</h3>
                        <p className="text-xs text-gray-500">Upload a profile picture (max 2MB)</p>
                    </div>
                </div>
            </div>

            <Form id="user-form" method="post" className="space-y-4">
                <FormSection title="Profile Information" icon={<UserIcon />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            label="First Name"
                            name="name"
                            defaultValue={user.name || ""}
                            placeholder="Tom"
                            required
                            onChange={(e) => validateLatinInput(e, 'First Name')}
                        />
                        <Input
                            label="Last Name"
                            name="surname"
                            defaultValue={user.surname || ""}
                            placeholder="Carlson"
                            required
                            onChange={(e) => validateLatinInput(e, 'Last Name')}
                        />
                        <Select
                            label="Gender"
                            name="gender"
                            defaultValue={user.gender || ""}
                            options={[
                                { id: "male", name: "Male" },
                                { id: "female", name: "Female" },
                                { id: "other", name: "Other" }
                            ]}
                            placeholder="Select Gender"
                        />
                        <Input
                            label="Date of Birth"
                            name="dateOfBirth"
                            type="date"
                            defaultValue={user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ""}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select
                            label="Role"
                            name="role"
                            defaultValue={user.role}
                            options={[
                                { id: "user", name: "User" },
                                { id: "partner", name: "Partner" },
                                { id: "manager", name: "Manager" },
                                { id: "admin", name: "Administrator" }
                            ]}
                            required
                        />
                        <Input
                            label="Phone"
                            name="phone"
                            defaultValue={user.phone || ""}
                            placeholder="+66415484865"
                        />
                        <Input
                            label="WhatsApp"
                            name="whatsapp"
                            defaultValue={user.whatsapp || ""}
                            placeholder="+66 83 881 7057"
                        />
                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            defaultValue={user.email}
                            placeholder="ilogush@icloud.com"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            label="Telegram"
                            name="telegram"
                            defaultValue={user.telegram || ""}
                            placeholder="@user_471322f2"
                        />
                        <Select
                            label="Country"
                            name="countryId"
                            defaultValue={user.countryId || ""}
                            options={countries}
                            placeholder="Select Country"
                        />
                        <Input
                            label="City"
                            name="city"
                            defaultValue={user.city || ""}
                            placeholder="Moscow"
                        />
                        <Input
                            label="Passport / ID Number"
                            name="passportNumber"
                            defaultValue={user.passportNumber || ""}
                            placeholder="758024093"
                            onChange={(e) => validateLatinInput(e, 'Passport Number')}
                        />
                    </div>
                </FormSection>

                <FormSection title="Accommodation" icon={<BuildingOfficeIcon />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select
                            label="Hotel"
                            name="hotelId"
                            defaultValue={user.hotelId || ""}
                            options={hotels}
                            placeholder="Select Hotel"
                        />
                        <Input
                            label="Room Number"
                            name="roomNumber"
                            defaultValue={user.roomNumber || ""}
                            placeholder="900"
                        />
                        <Select
                            label="Location"
                            name="locationId"
                            defaultValue={user.locationId || ""}
                            options={locations}
                            placeholder="Select Location"
                        />
                    </div>
                </FormSection>

                <FormSection title="Change Password" icon={<LockClosedIcon />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            label="New Password"
                            name="newPassword"
                            type="password"
                            autoComplete="new-password"
                            placeholder={`Min ${PASSWORD_MIN_LENGTH} characters`}
                        />
                        <Input
                            label="Confirm Password"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Repeat password"
                        />
                        <div className="col-span-full text-xs text-gray-500">
                            Leave empty to keep current password.
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Document Photos" icon={<DocumentTextIcon />}>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                        <p className="text-sm text-gray-400">No photos uploaded</p>
                    </div>
                </FormSection>
            </Form>
        </div>
    );
}
