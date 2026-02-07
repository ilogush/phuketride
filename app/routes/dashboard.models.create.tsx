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
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const brandsList = await db.select().from(schema.carBrands).limit(100);

    return { brands: brandsList };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const brandId = Number(formData.get("brandId"));
    const bodyType = formData.get("bodyType") as string;

    await db.insert(schema.carModels).values({
        name,
        brandId,
        bodyType,
    });

    return redirect("/models");
}

export default function CreateModelPage() {
    const { brands } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <BackButton to="/models" />
                <PageHeader title="Add New Model" />
            </div>

            <Card className="max-w-2xl p-8 border-gray-200">
                <Form method="post" className="space-y-8">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Brand</label>
                        <select
                            name="brandId"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                            required
                        >
                            <option value="">Select Brand</option>
                            {brands.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Model Name"
                        name="name"
                        placeholder="e.g., Camry, X5"
                        required
                    />

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Body Type</label>
                        <select
                            name="bodyType"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                            required
                        >
                            <option value="sedan">Sedan</option>
                            <option value="suv">SUV</option>
                            <option value="hatchback">Hatchback</option>
                            <option value="convertible">Convertible</option>
                            <option value="pickup">Pickup</option>
                            <option value="van">Van</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-4 pt-6">
                        <Button variant="secondary" onClick={() => window.history.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            Create Model
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
