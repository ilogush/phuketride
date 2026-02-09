import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useLoaderData, useActionData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { companies } from "~/db/schema";
import { eq } from "drizzle-orm";
import PageHeader from "~/components/dashboard/PageHeader";
import { Input } from "~/components/dashboard/Input";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";
import FormSection from "~/components/dashboard/FormSection";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);
    const companyId = parseInt(params.companyId || "0");

    let company: any = null;

    try {
        const companyData = await db
            .select()
            .from(companies)
            .where(eq(companies.id, companyId))
            .limit(1);

        company = companyData[0] || null;

        if (!company) {
            throw new Response("Company not found", { status: 404 });
        }
    } catch (error) {
        console.error("Error loading company:", error);
    }

    return { user, company };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);
    const companyId = parseInt(params.companyId || "0");
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const telegram = formData.get("telegram") as string;
    const street = formData.get("street") as string;
    const houseNumber = formData.get("houseNumber") as string;
    const address = formData.get("address") as string;
    const bankName = formData.get("bankName") as string;
    const accountNumber = formData.get("accountNumber") as string;
    const accountName = formData.get("accountName") as string;
    const swiftCode = formData.get("swiftCode") as string;
    const preparationTime = parseInt(formData.get("preparationTime") as string) || 30;
    const deliveryFeeAfterHours = parseFloat(formData.get("deliveryFeeAfterHours") as string) || 0;

    const errors: Record<string, string> = {};

    if (!name) errors.name = "Company name is required";
    if (!email) errors.email = "Email is required";
    if (!phone) errors.phone = "Phone is required";

    if (Object.keys(errors).length > 0) {
        return { errors };
    }

    try {
        await db
            .update(companies)
            .set({
                name,
                email,
                phone,
                telegram,
                street,
                houseNumber,
                address,
                bankName,
                accountNumber,
                accountName,
                swiftCode,
                preparationTime,
                deliveryFeeAfterHours,
                updatedAt: new Date(),
            })
            .where(eq(companies.id, companyId));

        return redirect(`/companies/${companyId}`);
    } catch (error) {
        console.error("Error updating company:", error);
        return { errors: { form: "Failed to update company. Please try again." } };
    }
}

export default function CompanyEditPage() {
    const { company } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const errors = actionData?.errors || {};

    if (!company) {
        return (
            <div className="space-y-4">
                <PageHeader title="Company Not Found" />
                <div className="text-center py-12">
                    <p className="text-gray-500">The company you are looking for does not exist.</p>
                    <Link to="/companies" className="mt-4 inline-block">
                        <Button variant="primary">Back to Companies</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title={`Edit: ${company.name}`}
                leftActions={
                    <Link to={`/companies/${company.id}`}>
                        <BackButton />
                    </Link>
                }
            />

            <Form method="post">
                <div className="bg-white rounded-3xl border border-gray-200 p-6">
                    {errors.form && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                            {errors.form}
                        </div>
                    )}

                    <input type="hidden" name="companyId" value={company.id} />

                    <FormSection title="Basic Information">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Input
                                label="Company Name"
                                name="name"
                                type="text"
                                placeholder="Enter company name"
                                required
                                defaultValue={company.name}
                                error={errors.name}
                                onChange={(e) => validateLatinInput(e, 'Company Name')}
                            />

                            <Input
                                label="Email"
                                name="email"
                                type="email"
                                placeholder="Enter email"
                                required
                                defaultValue={company.email}
                                error={errors.email}
                            />

                            <Input
                                label="Phone"
                                name="phone"
                                type="tel"
                                placeholder="Enter phone number"
                                required
                                defaultValue={company.phone}
                                error={errors.phone}
                            />

                            <Input
                                label="Telegram"
                                name="telegram"
                                type="text"
                                placeholder="Enter Telegram username"
                                defaultValue={company.telegram}
                            />
                        </div>
                    </FormSection>

                    <FormSection title="Address">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Input
                                label="Street"
                                name="street"
                                type="text"
                                placeholder="Enter street name"
                                defaultValue={company.street}
                                onChange={(e) => validateLatinInput(e, 'Street')}
                            />

                            <Input
                                label="House Number"
                                name="houseNumber"
                                type="text"
                                placeholder="Enter house number"
                                defaultValue={company.houseNumber}
                            />

                            <Input
                                label="Full Address"
                                name="address"
                                type="text"
                                placeholder="Enter full address"
                                defaultValue={company.address}
                                onChange={(e) => validateLatinInput(e, 'Address')}
                            />
                        </div>
                    </FormSection>

                    <FormSection title="Bank Details">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Input
                                label="Bank Name"
                                name="bankName"
                                type="text"
                                placeholder="Enter bank name"
                                defaultValue={company.bankName}
                            />

                            <Input
                                label="Account Number"
                                name="accountNumber"
                                type="text"
                                placeholder="Enter account number"
                                defaultValue={company.accountNumber}
                            />

                            <Input
                                label="Account Name"
                                name="accountName"
                                type="text"
                                placeholder="Enter account name"
                                defaultValue={company.accountName}
                            />

                            <Input
                                label="SWIFT Code"
                                name="swiftCode"
                                type="text"
                                placeholder="Enter SWIFT code"
                                defaultValue={company.swiftCode}
                            />
                        </div>
                    </FormSection>

                    <FormSection title="Settings">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Input
                                label="Preparation Time (minutes)"
                                name="preparationTime"
                                type="number"
                                placeholder="30"
                                defaultValue={company.preparationTime || 30}
                            />

                            <Input
                                label="Delivery Fee After Hours"
                                name="deliveryFeeAfterHours"
                                type="number"
                                step="0.01"
                                placeholder="0"
                                defaultValue={company.deliveryFeeAfterHours || 0}
                            />
                        </div>
                    </FormSection>

                    <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-100">
                        <Link to={`/companies/${company.id}`}>
                            <Button variant="secondary" type="button">
                                Cancel
                            </Button>
                        </Link>
                        <Button variant="primary" type="submit">
                            Save Changes
                        </Button>
                    </div>
                </div>
            </Form>
        </div>
    );
}
