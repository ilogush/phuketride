import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useSearchParams } from "react-router";
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
import { useToast } from "~/lib/toast";
import { useEffect } from "react";
import { modelSchema } from "~/schemas/dictionary";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const [brandsList, bodyTypesList] = await Promise.all([
        db.select().from(schema.carBrands).limit(100),
        db.select().from(schema.bodyTypes).limit(100),
    ]);

    return { brands: brandsList, bodyTypes: bodyTypesList };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    const rawData = {
        name: formData.get("name") as string,
        brandId: Number(formData.get("brandId")),
    };

    // Validate with Zod
    const validation = modelSchema.safeParse(rawData);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return redirect(`/models/create?error=${encodeURIComponent(firstError.message)}`);
    }

    const validData = validation.data;

    try {
        const bodyTypeId = formData.get("bodyTypeId") ? Number(formData.get("bodyTypeId")) : null;

        const [newModel] = await db.insert(schema.carModels).values({
            name: validData.name,
            brandId: validData.brandId,
            bodyTypeId,
        }).returning({ id: schema.carModels.id });

        // Audit log
        const metadata = getRequestMetadata(request);
        quickAudit({
            db,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: "model",
            entityId: newModel.id,
            action: "create",
            afterState: { ...validData, id: newModel.id, bodyTypeId },
            ...metadata,
        });

        return redirect(`/models?success=${encodeURIComponent("Model created successfully")}`);
    } catch (error) {
        console.error("Failed to create model:", error);
        return redirect(`/models/create?error=${encodeURIComponent("Failed to create model")}`);
    }
}

export default function CreateModelPage() {
    const { brands, bodyTypes } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();

    // Toast notifications
    useEffect(() => {
        const error = searchParams.get("error");
        if (error) {
            toast.error(error);
        }
    }, [searchParams, toast]);

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
                        name="bodyTypeId"
                        options={bodyTypes}
                    />
                </Form>
            </FormSection>
        </div>
    );
}
