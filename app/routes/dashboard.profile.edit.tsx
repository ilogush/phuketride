import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import PageHeader from "~/components/ui/PageHeader";
import Card from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import Button from "~/components/ui/Button";
import BackButton from "~/components/ui/BackButton";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const fullUser = await db.select().from(schema.users).where(eq(schema.users.id, sessionUser.id)).get();
    if (!fullUser) throw new Response("User not found", { status: 404 });
    return { user: fullUser };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const surname = formData.get("surname") as string;
    const phone = formData.get("phone") as string;

    await db.update(schema.users)
        .set({ name, surname, phone })
        .where(eq(schema.users.id, user.id));

    return redirect("/dashboard/profile");
}

export default function EditProfilePage() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <BackButton to="/dashboard/profile" />
                <PageHeader title="Edit Profile" />
            </div>

            <Card className="max-w-2xl p-8 border-gray-200">
                <Form method="post" className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="First Name"
                            name="name"
                            defaultValue={user.name || ""}
                            required
                        />
                        <Input
                            label="Last Name"
                            name="surname"
                            defaultValue={user.surname || ""}
                            required
                        />
                    </div>

                    <Input
                        label="Phone Number"
                        name="phone"
                        type="tel"
                        defaultValue={user.phone || ""}
                        placeholder="+66..."
                    />

                    <div className="flex justify-end gap-4 pt-6">
                        <Button variant="secondary" onClick={() => window.history.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            Save Changes
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
