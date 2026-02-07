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
import { useState } from "react";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const [brandsList, modelsList] = await Promise.all([
        db.select().from(schema.carBrands).limit(100),
        db.select().from(schema.carModels).limit(500),
    ]);

    return { brands: brandsList, models: modelsList };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    const brandId = Number(formData.get("brandId"));
    const modelId = Number(formData.get("modelId"));
    const productionYear = Number(formData.get("productionYear"));
    const transmission = formData.get("transmission") as "automatic" | "manual";
    const engineVolume = Number(formData.get("engineVolume"));
    const bodyType = formData.get("bodyType") as string;
    const seats = Number(formData.get("seats"));
    const doors = Number(formData.get("doors"));
    const fuelType = formData.get("fuelType") as string;
    const description = formData.get("description") as string;

    await db.insert(schema.carTemplates).values({
        brandId,
        modelId,
        productionYear,
        transmission,
        engineVolume,
        bodyType,
        seats,
        doors,
        fuelType,
        description,
    });

    return redirect("/car-templates");
}

export default function CreateCarTemplatePage() {
    const { brands, models } = useLoaderData<typeof loader>();
    const [selectedBrandId, setSelectedBrandId] = useState(brands[0]?.id || 0);

    const filteredModels = models.filter(m => m.brandId === selectedBrandId);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BackButton to="/dashboard/car-templates" />
                    <PageHeader title="Add New Car Template" />
                </div>
                <Button type="submit" variant="primary" form="template-form">
                    Create Template
                </Button>
            </div>

            <FormBox>
                <Form id="template-form" method="post" className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Brand</label>
                            <select
                                name="brandId"
                                value={selectedBrandId}
                                onChange={(e) => setSelectedBrandId(Number(e.target.value))}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300 transition-all"
                                required
                            >
                                <option value="">Select Brand</option>
                                {brands.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Model</label>
                            <select
                                name="modelId"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300 transition-all"
                                required
                            >
                                <option value="">Select Model</option>
                                {filteredModels.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                        <Input
                            label="Year"
                            name="productionYear"
                            type="number"
                            placeholder="2023"
                            required
                        />
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Transmission</label>
                            <select
                                name="transmission"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300 transition-all"
                                required
                            >
                                <option value="automatic">Automatic</option>
                                <option value="manual">Manual</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <Input
                            label="Engine (CC)"
                            name="engineVolume"
                            type="number"
                            step="0.1"
                            placeholder="1.5"
                            required
                        />
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Fuel</label>
                            <select
                                name="fuelType"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300 transition-all"
                                required
                            >
                                <option value="gasoline">Gasoline 91/95</option>
                                <option value="diesel">Diesel</option>
                                <option value="electric">Electric</option>
                                <option value="hybrid">Hybrid</option>
                            </select>
                        </div>
                        <Input
                            label="Body Type"
                            name="bodyType"
                            placeholder="e.g., Sedan"
                            required
                        />
                        <Input
                            label="Seats"
                            name="seats"
                            type="number"
                            placeholder="5"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <Input
                            label="Doors"
                            name="doors"
                            type="number"
                            placeholder="4"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Description</label>
                        <textarea
                            name="description"
                            rows={4}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                            placeholder="Detailed car characteristics..."
                        ></textarea>
                    </div>
                </Form>
            </FormBox>
        </div>
    );
}
