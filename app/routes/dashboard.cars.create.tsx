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
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Company</label>
                            <select
                                name="companyId"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                                required
                            >
                                <option value="">Select Company</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Car Template</label>
                            <select
                                name="templateId"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                                required
                            >
                                <option value="">Select Template</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>
                                        Template #{t.id} (BrandID {t.brandId}, ModelID {t.modelId})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Color</label>
                            <select
                                name="colorId"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                                required
                            >
                                <option value="">Select Color</option>
                                {colors.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="License Plate"
                            name="licensePlate"
                            placeholder="777"
                            required
                        />
                        <Input
                            label="VIN"
                            name="vin"
                            placeholder="ZFA..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Price Per Day (THB)"
                            name="pricePerDay"
                            type="number"
                            placeholder="1200"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-6">
                        <Button variant="secondary" onClick={() => window.history.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            Add Car to Fleet
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
