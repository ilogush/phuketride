import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form } from "react-router";
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

    const name = formData.get("name") as string;
    const logoUrl = formData.get("logoUrl") as string;

    await db.insert(schema.carBrands).values({
        name,
        logoUrl,
    });

    return redirect("/brands");
}

export default function CreateBrandPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <BackButton to="/brands" />
                <PageHeader title="Add New Brand" />
            </div>

            <Card className="max-w-2xl p-8 border-gray-200">
                <Form method="post" className="space-y-8">
                    <Input
                        label="Brand Name"
                        name="name"
                        placeholder="e.g., Toyota, BMW"
                        required
                    />
                    <Input
                        label="Logo URL (Optional)"
                        name="logoUrl"
                        placeholder="https://example.com/logo.png"
                    />

                    <div className="flex justify-end gap-4 pt-6">
                        <Button variant="secondary" onClick={() => window.history.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            Create Brand
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
