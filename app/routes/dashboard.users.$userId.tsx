import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import PageHeader from "~/components/ui/PageHeader";
import BackButton from "~/components/ui/BackButton";
import Button from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import FormSection from "~/components/ui/FormSection";
import { UserIcon, BuildingOfficeIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const userId = params.userId;
    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
    if (!user) {
        throw new Response("User not found", { status: 404 });
    }

    // Load reference data
    const [country, hotel, location, district] = await Promise.all([
        user.countryId ? db.select().from(schema.countries).where(eq(schema.countries.id, user.countryId)).get() : null,
        user.hotelId ? db.select().from(schema.hotels).where(eq(schema.hotels.id, user.hotelId)).get() : null,
        user.locationId ? db.select().from(schema.locations).where(eq(schema.locations.id, user.locationId)).get() : null,
        user.districtId ? db.select().from(schema.districts).where(eq(schema.districts.id, user.districtId)).get() : null,
    ]);

    return { user, country, hotel, location, district };
}

export default function UserDetailPage() {
    const { user, country, hotel, location, district } = useLoaderData<typeof loader>();

    const initials = `${user.name?.[0] || ''}${user.surname?.[0] || ''}`.toUpperCase() || user.email[0].toUpperCase();

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BackButton to="/users" />
                    <PageHeader title="Profile" />
                </div>
                <Link to={`/users/${user.id}/edit`}>
                    <Button variant="primary">Edit</Button>
                </Link>
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

            <div className="space-y-4">
                <FormSection title="Profile Information" icon={<UserIcon />}>
                    <div className="grid grid-cols-4 gap-4">
                        <Input
                            label="First Name"
                            name="name"
                            value={user.name || ""}
                            disabled
                        />
                        <Input
                            label="Last Name"
                            name="surname"
                            value={user.surname || ""}
                            disabled
                        />
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Gender</label>
                            <select
                                value={user.gender || ""}
                                disabled
                                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl sm:text-sm text-gray-500 cursor-not-allowed"
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
                            value={user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ""}
                            disabled
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Role</label>
                            <input
                                type="text"
                                value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                disabled
                                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl sm:text-sm text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <Input
                            label="Phone"
                            name="phone"
                            value={user.phone || ""}
                            disabled
                        />
                        <Input
                            label="WhatsApp"
                            name="whatsapp"
                            value={user.whatsapp || ""}
                            disabled
                        />
                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            value={user.email}
                            disabled
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <Input
                            label="Telegram"
                            name="telegram"
                            value={user.telegram || ""}
                            disabled
                        />
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Country</label>
                            <input
                                type="text"
                                value={country?.name || ""}
                                disabled
                                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl sm:text-sm text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <Input
                            label="City"
                            name="city"
                            value={user.city || ""}
                            disabled
                        />
                        <Input
                            label="Passport / ID Number"
                            name="passportNumber"
                            value={user.passportNumber || ""}
                            disabled
                        />
                    </div>
                </FormSection>

                <FormSection title="Accommodation" icon={<BuildingOfficeIcon />}>
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Hotel</label>
                            <input
                                type="text"
                                value={hotel?.name || ""}
                                disabled
                                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl sm:text-sm text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <Input
                            label="Room Number"
                            name="roomNumber"
                            value={user.roomNumber || ""}
                            disabled
                        />
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Location</label>
                            <input
                                type="text"
                                value={location?.name || ""}
                                disabled
                                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl sm:text-sm text-gray-500 cursor-not-allowed"
                            />
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Document Photos" icon={<DocumentTextIcon />}>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                        <p className="text-sm text-gray-400">No photos uploaded</p>
                    </div>
                </FormSection>
            </div>
        </div>
    );
}
