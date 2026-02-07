import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import PageHeader from "~/components/ui/PageHeader";
import { Input } from "~/components/ui/Input";
import Button from "~/components/ui/Button";
import BackButton from "~/components/ui/BackButton";
import FormSection from "~/components/ui/FormSection";
import PhotoUpload from "~/components/ui/PhotoUpload";
import DocumentPhotosUpload from "~/components/ui/DocumentPhotosUpload";
import { UserIcon, BuildingOfficeIcon, DocumentTextIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { uploadAvatarFromBase64, deleteAvatar } from "~/lib/r2.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const fullUser = await db.select().from(schema.users).where(eq(schema.users.id, sessionUser.id)).get();
    if (!fullUser) throw new Response("User not found", { status: 404 });

    // Load reference data
    const [countries, hotels, locations, districts] = await Promise.all([
        db.select().from(schema.countries).all(),
        db.select().from(schema.hotels).all(),
        db.select().from(schema.locations).all(),
        db.select().from(schema.districts).all(),
    ]);

    return { user: fullUser, countries, hotels, locations, districts };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    // Get current user data
    const currentUser = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).get();
    if (!currentUser) throw new Response("User not found", { status: 404 });

    let avatarUrl = currentUser.avatarUrl;

    // Handle avatar upload
    const avatarBase64 = formData.get("avatarBase64") as string | null;
    const avatarFileName = formData.get("avatarFileName") as string | null;

    if (avatarBase64 && avatarFileName) {
        // Delete old avatar if exists
        if (currentUser.avatarUrl) {
            try {
                await deleteAvatar(context.cloudflare.env.ASSETS, currentUser.avatarUrl);
            } catch (error) {
                console.error("Failed to delete old avatar:", error);
            }
        }

        // Upload new avatar
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

    await db.update(schema.users)
        .set({
            name: formData.get("name") as string || null,
            surname: formData.get("surname") as string || null,
            phone: formData.get("phone") as string || null,
            whatsapp: formData.get("whatsapp") as string || null,
            telegram: formData.get("telegram") as string || null,
            passportNumber: formData.get("passportNumber") as string || null,
            citizenship: formData.get("citizenship") as string || null,
            city: formData.get("city") as string || null,
            countryId: formData.get("countryId") ? parseInt(formData.get("countryId") as string) : null,
            dateOfBirth: formData.get("dateOfBirth") ? new Date(formData.get("dateOfBirth") as string) : null,
            gender: formData.get("gender") as "male" | "female" | "other" || null,
            hotelId: formData.get("hotelId") ? parseInt(formData.get("hotelId") as string) : null,
            roomNumber: formData.get("roomNumber") as string || null,
            locationId: formData.get("locationId") ? parseInt(formData.get("locationId") as string) : null,
            districtId: formData.get("districtId") ? parseInt(formData.get("districtId") as string) : null,
            address: formData.get("address") as string || null,
            avatarUrl,
            updatedAt: new Date(),
        })
        .where(eq(schema.users.id, user.id));

    return redirect("/profile");
}

export default function EditProfilePage() {
    const { user, countries, hotels, locations, districts } = useLoaderData<typeof loader>();
    const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
    const [avatarFileName, setAvatarFileName] = useState<string | null>(null);
    const [removeAvatar, setRemoveAvatar] = useState(false);

    const initials = `${user.name?.[0] || ''}${user.surname?.[0] || ''}`.toUpperCase() || user.email[0].toUpperCase();

    const handlePhotoChange = (base64: string | null, fileName: string | null) => {
        setAvatarBase64(base64);
        setAvatarFileName(fileName);
        if (base64) {
            setRemoveAvatar(false);
        } else {
            setRemoveAvatar(true);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BackButton to="/profile" />
                    <PageHeader title="Edit Profile" />
                </div>
                <Button type="submit" variant="primary" form="profile-form">
                    Save Changes
                </Button>
            </div>

            {/* Profile Photo Section */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-4">
                    <PhotoUpload
                        currentPhotoUrl={user.avatarUrl}
                        onPhotoChange={handlePhotoChange}
                        initials={initials}
                    />
                </div>
            </div>

            <Form id="profile-form" method="post" className="space-y-4">
                <input type="hidden" name="removeAvatar" value={removeAvatar ? "true" : "false"} />
                {avatarBase64 && (
                    <>
                        <input type="hidden" name="avatarBase64" value={avatarBase64} />
                        <input type="hidden" name="avatarFileName" value={avatarFileName || ""} />
                    </>
                )}
                <FormSection title="Profile Information" icon={<UserIcon />}>
                    <div className="grid grid-cols-4 gap-4">
                        <Input
                            label="First Name"
                            name="name"
                            defaultValue={user.name || ""}
                            placeholder="Tom"
                            required
                        />
                        <Input
                            label="Last Name"
                            name="surname"
                            defaultValue={user.surname || ""}
                            placeholder="Carlson"
                            required
                        />
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Gender</label>
                            <select
                                name="gender"
                                defaultValue={user.gender || ""}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300 transition-all"
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <Input
                            label="Date of Birth"
                            name="dateOfBirth"
                            type="date"
                            defaultValue={user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ""}
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <Input
                            label="Role"
                            name="role"
                            defaultValue={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
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
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <Input
                            label="Telegram"
                            name="telegram"
                            defaultValue={user.telegram || ""}
                            placeholder="@user_471322f2"
                        />
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Country</label>
                            <select
                                name="countryId"
                                defaultValue={user.countryId || ""}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300 transition-all"
                            >
                                <option value="">Select Country</option>
                                {countries.map((country) => (
                                    <option key={country.id} value={country.id}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>
                        </div>
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
                        />
                    </div>
                </FormSection>

                <FormSection title="Accommodation" icon={<BuildingOfficeIcon />}>
                    <div className="grid grid-cols-4 gap-4">
                        <Input
                            label="Location"
                            name="accommodationLocation"
                            defaultValue="Phuket"
                            placeholder="Phuket"
                        />
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Hotel</label>
                            <select
                                name="hotelId"
                                defaultValue={user.hotelId || ""}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300 transition-all"
                            >
                                <option value="">Select Hotel</option>
                                {hotels.map((hotel) => (
                                    <option key={hotel.id} value={hotel.id}>
                                        {hotel.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Input
                            label="Room Number"
                            name="roomNumber"
                            defaultValue={user.roomNumber || ""}
                            placeholder="900"
                        />
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Location</label>
                            <select
                                name="locationId"
                                defaultValue={user.locationId || ""}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300 transition-all"
                            >
                                <option value="">Select Location</option>
                                {locations.map((location) => (
                                    <option key={location.id} value={location.id}>
                                        {location.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Document Photos" icon={<DocumentTextIcon />}>
                    <DocumentPhotosUpload
                        onPassportPhotosChange={(photos) => {
                            console.log('Passport photos:', photos);
                        }}
                        onDriverLicensePhotosChange={(photos) => {
                            console.log('Driver license photos:', photos);
                        }}
                    />
                </FormSection>

                <FormSection title="Change Password" icon={<LockClosedIcon />}>
                    <div className="grid grid-cols-4 gap-4">
                        <Input
                            label="New Password"
                            name="newPassword"
                            type="password"
                            placeholder="Enter new password"
                        />
                        <Input
                            label="Confirm Password"
                            name="confirmPassword"
                            type="password"
                            placeholder="Confirm new password"
                        />
                        <div />
                        <div />
                    </div>
                </FormSection>
            </Form>
        </div>
    );
}
