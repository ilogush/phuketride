import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { Form } from "react-router";
import { requireAdmin } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import { Input } from "~/components/dashboard/Input";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";
import FormSection from "~/components/dashboard/FormSection";
import { TagIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { brandSchema } from "~/schemas/dictionary";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError, redirectWithSuccess } from "~/lib/route-feedback";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAdmin(request);
    return { user };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAdmin(request);
    const formData = await request.formData();

    const rawData = {
        name: formData.get("name") as string,
    };

    // Validate with Zod
    const validation = parseWithSchema(brandSchema, rawData, "Validation failed");
    if (!validation.ok) {
        return redirectWithError("/brands/create", validation.error);
    }

    const validData = validation.data;

    try {
        const logoUrl = formData.get("logoUrl") as string;
        await context.cloudflare.env.DB
            .prepare("INSERT INTO car_brands (name, logo_url) VALUES (?, ?)")
            .bind(validData.name, logoUrl || null)
            .run();

        return redirectWithSuccess("/brands", "Brand created successfully");
    } catch {
        return redirectWithError("/brands/create", "Failed to create brand");
    }
}

export default function CreateBrandPage() {
    useUrlToast();
    return (
        <div className="space-y-4">
            <PageHeader
                title="Add New Brand"
                leftActions={<BackButton to="/brands" />}
                rightActions={
                    <Button type="submit" variant="solid" form="brand-form">
                        Create Brand
                    </Button>
                }
            />

            <FormSection title="Brand Information" icon={<TagIcon />} grid="cols-4">
                <Form id="brand-form" method="post">
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
                </Form>
            </FormSection>
        </div>
    );
}
