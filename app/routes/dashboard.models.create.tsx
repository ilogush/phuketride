import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";
import FormSection from "~/components/dashboard/FormSection";
import { CubeIcon } from "@heroicons/react/24/outline";

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
            <PageHeader
                title="Add New Model"
                leftActions={<BackButton to="/models" />}
                rightActions={
                    <Button type="submit" variant="primary" form="model-form">
                        Create Model
                    </Button>
                }
            />

            <FormSection title="Model Information" icon={<CubeIcon />} grid="cols-4">
                <Form id="model-form" method="post">
                    <Select
                        label="Brand"
                        name="brandId"
                        options={brands}
                        required
                    />

                    <Input
                        label="Model Name"
                        name="name"
                        placeholder="e.g., Camry, X5"
                        required
                    />

                    <Select
                        label="Body Type"
                        name="bodyType"
                        options={[
                            { id: "sedan", name: "Sedan" },
                            { id: "suv", name: "SUV" },
                            { id: "hatchback", name: "Hatchback" },
                            { id: "convertible", name: "Convertible" },
                            { id: "pickup", name: "Pickup" },
                            { id: "van", name: "Van" }
                        ]}
                        required
                    />
                </Form>
            </FormSection>
        </div>
    );
}
