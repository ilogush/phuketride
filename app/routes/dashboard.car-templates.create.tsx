import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import PageHeader from "~/components/ui/PageHeader";
import { Input } from "~/components/ui/Input";
import { Select } from "~/components/ui/Select";
import { Textarea } from "~/components/ui/Textarea";
import Button from "~/components/ui/Button";
import BackButton from "~/components/ui/BackButton";
import FormSection from "~/components/ui/FormSection";
import { useState } from "react";
import { TruckIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";

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
            <PageHeader
                title="Add New Car Template"
                leftActions={<BackButton to="/car-templates" />}
                rightActions={
                    <Button type="submit" variant="primary" form="template-form">
                        Create Template
                    </Button>
                }
            />

            <Form id="template-form" method="post" className="space-y-4">
                <FormSection title="Basic Information" icon={<TruckIcon />} grid="cols-4">
                    <Select
                        label="Brand"
                        name="brandId"
                        value={selectedBrandId}
                        onChange={(e) => setSelectedBrandId(Number(e.target.value))}
                        options={brands}
                        required
                    />
                    <Select
                        label="Model"
                        name="modelId"
                        options={filteredModels}
                        required
                    />
                    <Input
                        label="Year"
                        name="productionYear"
                        type="number"
                        placeholder="2023"
                        required
                    />
                    <Select
                        label="Transmission"
                        name="transmission"
                        options={[
                            { id: "automatic", name: "Automatic" },
                            { id: "manual", name: "Manual" }
                        ]}
                        required
                    />
                </FormSection>

                <FormSection title="Technical Specifications" icon={<Cog6ToothIcon />} grid="cols-4">
                    <Input
                        label="Engine (CC)"
                        name="engineVolume"
                        type="number"
                        step="0.1"
                        placeholder="1.5"
                        required
                    />
                    <Select
                        label="Fuel"
                        name="fuelType"
                        options={[
                            { id: "gasoline", name: "Gasoline 91/95" },
                            { id: "diesel", name: "Diesel" },
                            { id: "electric", name: "Electric" },
                            { id: "hybrid", name: "Hybrid" }
                        ]}
                        required
                    />
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
                    <Input
                        label="Doors"
                        name="doors"
                        type="number"
                        placeholder="4"
                        required
                    />
                </FormSection>

                <FormSection title="Description" icon={<TruckIcon />}>
                    <Textarea
                        label="Description"
                        name="description"
                        rows={4}
                        placeholder="Detailed car characteristics..."
                    />
                </FormSection>
            </Form>
        </div>
    );
}
