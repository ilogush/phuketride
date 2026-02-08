import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import PageHeader from "~/components/ui/PageHeader";
import { Input } from "~/components/ui/Input";
import { Select } from "~/components/ui/Select";
import Button from "~/components/ui/Button";
import BackButton from "~/components/ui/BackButton";
import FormSection from "~/components/ui/FormSection";
import { UserIcon, BuildingOfficeIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    if (sessionUser.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }

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
    const [countries, hotels, locations, districts] = await Promise.all([
        db.select().from(schema.countries).all(),
        db.select().from(schema.hotels).all(),
        db.select().from(schema.locations).all(),
        db.select().from(schema.districts).all(),
    ]);

    return { user, countries, hotels, locations, districts };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const sessionUser = await requireAuth(request);
    if (sessionUser.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }

    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    const userId = params.userId;
    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    await db.update(schema.users)
        .set({
            email: formData.get("email") as string,
            role: formData.get("role") as "admin" | "partner" | "manager" | "user",
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
            updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));

    return redirect(`/users/${userId}`);
}

export default function EditUserPage() {
    const { user, countries, hotels, locations, districts } = useLoaderData<typeof loader>();

    const initials = `${user.name?.[0] || ''}${user.surname?.[0] || ''}`.toUpperCase() || user.email[0].toUpperCase();

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BackButton to={`/users/${user.id}`} />
                    <PageHeader title="Edit User" />
                </div>
                <Button type="submit" variant="primary" form="user-form">
                    Save Changes
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

                    <div className="grid grid-cols-4 gap-4">
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

                    <div className="grid grid-cols-4 gap-4">
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
                        />
                    </div>
                </FormSection>

                <FormSection title="Accommodation" icon={<BuildingOfficeIcon />}>
                    <div className="grid grid-cols-4 gap-4">
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

                <FormSection title="Document Photos" icon={<DocumentTextIcon />}>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                        <p className="text-sm text-gray-400">No photos uploaded</p>
                    </div>
                </FormSection>
            </Form>
        </div>
    );
}
