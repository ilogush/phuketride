import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import PageHeader from "~/components/ui/PageHeader";
import { Input } from "~/components/ui/Input";
import Button from "~/components/ui/Button";
import BackButton from "~/components/ui/BackButton";
import FormBox from "~/components/ui/FormBox";

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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BackButton to="/dashboard/models" />
                    <PageHeader title="Add New Model" />
                </div>
                <Button type="submit" variant="primary" form="model-form">
                    Create Model
                </Button>
            </div>

            <FormBox>
                <Form id="model-form" method="post" className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Brand</label>
                            <select
                                name="brandId"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300 transition-all"
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
                            <label className="block text-xs text-gray-600 mb-1">Body Type</label>
                            <select
                                name="bodyType"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300 transition-all"
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
                    </div>
                </Form>
            </FormBox>
        </div>
    );
}
