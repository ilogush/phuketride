import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import PageHeader from "~/components/ui/PageHeader";
import Card from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import Button from "~/components/ui/Button";
import BackButton from "~/components/ui/BackButton";
import { useState } from "react";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const [locationsList, districtsList, usersList] = await Promise.all([
        db.select().from(schema.locations).limit(100),
        db.select().from(schema.districts).limit(200),
        db.select().from(schema.users).limit(100),
    ]);

    return { locations: locationsList, districts: districtsList, users: usersList };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const ownerId = formData.get("ownerId") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const telegram = formData.get("telegram") as string;
    const locationId = Number(formData.get("locationId"));
    const districtId = Number(formData.get("districtId"));
    const street = formData.get("street") as string;
    const houseNumber = formData.get("houseNumber") as string;

    await db.insert(schema.companies).values({
        name,
        ownerId,
        email,
        phone,
        telegram,
        locationId,
        districtId,
        street,
        houseNumber,
    });

    return redirect("/companies");
}

export default function CreateCompanyPage() {
    const { locations, districts, users } = useLoaderData<typeof loader>();
    const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || 1);

    const filteredDistricts = districts.filter(d => d.locationId === selectedLocationId);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <BackButton to="/companies" />
                <PageHeader title="Add New Company" />
            </div>

            <Card className="max-w-4xl p-8 border-gray-200">
                <Form method="post" className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Company Name"
                            name="name"
                            placeholder="e.g., Andaman Rentals"
                            required
                        />
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Owner</label>
                            <select
                                name="ownerId"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                                required
                            >
                                <option value="">Select Owner</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} {u.surname} ({u.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            placeholder="company@example.com"
                            required
                        />
                        <Input
                            label="Phone"
                            name="phone"
                            placeholder="+66..."
                            required
                        />
                        <Input
                            label="Telegram"
                            name="telegram"
                            placeholder="@company_bot"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
                            <select
                                name="locationId"
                                value={selectedLocationId}
                                onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                                required
                            >
                                {locations.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">District</label>
                            <select
                                name="districtId"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                                required
                            >
                                {filteredDistricts.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2">
                            <Input
                                label="Street"
                                name="street"
                                placeholder="e.g., 123 Beach Road"
                                required
                            />
                        </div>
                        <Input
                            label="House Number"
                            name="houseNumber"
                            placeholder="e.g., 45/1"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-6">
                        <Button variant="secondary" onClick={() => window.history.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            Create Company
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
