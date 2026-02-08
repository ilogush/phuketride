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

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const [carsList, usersList] = await Promise.all([
        db.select().from(schema.companyCars).limit(100),
        db.select().from(schema.users).limit(100),
    ]);

    return { cars: carsList, users: usersList };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    // Logic to create booking/contract
    // ...

    return redirect("/bookings");
}

export default function CreateBookingPage() {
    const { cars, users } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <BackButton to="/bookings" />
                <PageHeader title="New Booking" />
            </div>

            <Card className="max-w-4xl p-8 border-gray-200">
                <Form method="post" className="space-y-8">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs text-gray-600 mb-1">Client</label>
                            <select
                                name="clientId"
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                                required
                            >
                                <option value="">Select Client</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} {u.surname}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs text-gray-600 mb-1">Car</label>
                            <select
                                name="carId"
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                                required
                            >
                                <option value="">Select Car</option>
                                {cars.map(c => (
                                    <option key={c.id} value={c.id}>{c.licensePlate} (ID: {c.id})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <Input
                                label="Start Date"
                                name="startDate"
                                type="date"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <Input
                                label="End Date"
                                name="endDate"
                                type="date"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6">
                        <Button variant="secondary" onClick={() => window.history.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            Create Booking
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
