import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import { Input } from "~/components/dashboard/Input";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";
import FormSection from "~/components/dashboard/FormSection";
import { TagIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import { useEffect } from "react";
import { brandSchema } from "~/schemas/dictionary";

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
    const formData = await request.formData();

    const rawData = {
        name: formData.get("name") as string,
    };

    // Validate with Zod
    const validation = brandSchema.safeParse(rawData);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return redirect(`/brands/create?error=${encodeURIComponent(firstError.message)}`);
    }

    const validData = validation.data;

    try {
        const logoUrl = formData.get("logoUrl") as string;
        await context.cloudflare.env.DB
            .prepare("INSERT INTO car_brands (name, logo_url) VALUES (?, ?)")
            .bind(validData.name, logoUrl || null)
            .run();

        return redirect(`/brands?success=${encodeURIComponent("Brand created successfully")}`);
    } catch {
        return redirect(`/brands/create?error=${encodeURIComponent("Failed to create brand")}`);
    }
}

export default function CreateBrandPage() {
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
                title="Add New Brand"
                leftActions={<BackButton to="/brands" />}
                rightActions={
                    <Button type="submit" variant="primary" form="brand-form">
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
