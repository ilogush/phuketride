import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import PageHeader from "~/components/ui/PageHeader";
import { Input } from "~/components/ui/Input";
import Button from "~/components/ui/Button";
import BackButton from "~/components/ui/BackButton";
import FormBox from "~/components/ui/FormBox";

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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BackButton to="/dashboard/brands" />
                    <PageHeader title="Add New Brand" />
                </div>
                <Button type="submit" variant="primary" form="brand-form">
                    Create Brand
                </Button>
            </div>

            <FormBox>
                <Form id="brand-form" method="post" className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
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
                    </div>
                </Form>
            </FormBox>
        </div>
    );
}
