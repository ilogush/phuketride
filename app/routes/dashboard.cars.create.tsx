import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import Card from "~/components/dashboard/Card";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const [templatesList, colorsList, companiesList] = await Promise.all([
        db.select().from(schema.carTemplates).limit(100),
        db.select().from(schema.colors).limit(100),
        db.select().from(schema.companies).limit(50),
    ]);

    return { templates: templatesList, colors: colorsList, companies: companiesList, user };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    const companyId = user.role === "admin" ? Number(formData.get("companyId")) : user.companyId!;
    const templateId = Number(formData.get("templateId"));
    const colorId = Number(formData.get("colorId"));
    const licensePlate = formData.get("licensePlate") as string;
    const vin = formData.get("vin") as string;
    const pricePerDay = Number(formData.get("pricePerDay"));

    await db.insert(schema.companyCars).values({
        companyId,
        templateId,
        colorId,
        licensePlate,
        vin,
        pricePerDay,
        status: "available",
    });

    return redirect("/cars");
}

export default function CreateCarPage() {
    const { templates, colors, companies, user } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <BackButton to="/cars" />
                <PageHeader title="Add New Car" />
            </div>

            <Card className="max-w-4xl p-8 border-gray-200">
                <Form method="post" className="space-y-8">
                    {user.role === "admin" && (
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-4">
                                <Select
                                    label="Company"
                                    name="companyId"
                                    options={companies}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                        <div className="col-span-2">
                            <Select
                                label="Car Template"
                                name="templateId"
                                options={templates.map(t => ({
                                    id: t.id,
                                    name: `Template #${t.id} (BrandID ${t.brandId}, ModelID ${t.modelId})`
                                }))}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <Select
                                label="Color"
                                name="colorId"
                                options={colors}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <Input
                                label="License Plate"
                                name="licensePlate"
                                placeholder="777"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <Input
                                label="VIN"
                                name="vin"
                                placeholder="ZFA..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <Input
                                label="Price Per Day (THB)"
                                name="pricePerDay"
                                type="number"
                                placeholder="1200"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6">
                        <Button variant="secondary" onClick={() => window.history.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            Add to Fleet
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
