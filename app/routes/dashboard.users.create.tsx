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

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    return { user };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    const email = formData.get("email") as string;
    const role = formData.get("role") as "admin" | "partner" | "manager" | "user";
    const name = formData.get("name") as string;
    const surname = formData.get("surname") as string;
    const phone = formData.get("phone") as string;

    // Use a random ID or the email as ID if not using a real auth service yet
    // In a real app, this would be created in the auth service first
    const id = crypto.randomUUID();

    await db.insert(schema.users).values({
        id,
        email,
        role,
        name,
        surname,
        phone,
    });

    return redirect("/users");
}

export default function CreateUserPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <BackButton to="/users" />
                <PageHeader title="Add New User" />
            </div>

            <Card className="max-w-4xl p-8 border-gray-200">
                <Form method="post" className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="First Name"
                            name="name"
                            placeholder="John"
                            required
                        />
                        <Input
                            label="Last Name"
                            name="surname"
                            placeholder="Doe"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                        <Input
                            label="Email Address"
                            name="email"
                            type="email"
                            placeholder="john.doe@example.com"
                            required
                        />
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Role</label>
                            <select
                                name="role"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                                required
                            >
                                <option value="user">User</option>
                                <option value="partner">Partner</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Phone Number"
                            name="phone"
                            placeholder="+66..."
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-6">
                        <Button variant="secondary" onClick={() => window.history.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            Create User
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
