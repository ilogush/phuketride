import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useLoaderData, useActionData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import { Input } from "~/components/dashboard/Input";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";
import FormSection from "~/components/dashboard/FormSection";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { z } from "zod";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const companyId = parseInt(params.companyId || "0");

    let company: any = null;

    try {
        const companyData = await context.cloudflare.env.DB
            .prepare("SELECT * FROM companies WHERE id = ? LIMIT 1")
            .bind(companyId)
            .all();

        company = (companyData.results?.[0] as Record<string, unknown>) || null;

        if (!company) {
            throw new Response("Company not found", { status: 404 });
        }
    } catch {
    }

    return { user, company };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    await requireAuth(request);
    const companyId = parseInt(params.companyId || "0");
    const formData = await request.formData();
    const editCompanySchema = z.object({
        name: z.string().trim().min(1, "Company name is required"),
        email: z.string().trim().email("Invalid email format"),
        phone: z.string().trim().min(1, "Phone is required"),
        telegram: z.string().trim().optional(),
        street: z.string().trim().optional(),
        houseNumber: z.string().trim().optional(),
        address: z.string().trim().optional(),
        bankName: z.string().trim().optional(),
        accountNumber: z.string().trim().optional(),
        accountName: z.string().trim().optional(),
        swiftCode: z.string().trim().optional(),
        preparationTime: z.coerce.number().int().min(0).max(1440).default(30),
        deliveryFeeAfterHours: z.coerce.number().min(0).default(0),
    });
    const parsed = editCompanySchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        telegram: formData.get("telegram"),
        street: formData.get("street"),
        houseNumber: formData.get("houseNumber"),
        address: formData.get("address"),
        bankName: formData.get("bankName"),
        accountNumber: formData.get("accountNumber"),
        accountName: formData.get("accountName"),
        swiftCode: formData.get("swiftCode"),
        preparationTime: formData.get("preparationTime") || 30,
        deliveryFeeAfterHours: formData.get("deliveryFeeAfterHours") || 0,
    });
    if (!parsed.success) {
        return { errors: { form: parsed.error.errors[0]?.message || "Validation failed" } };
    }
    const {
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
    } = parsed.data;

    try {
        await context.cloudflare.env.DB
            .prepare(
                `
                UPDATE companies
                SET
                    name = ?,
                    email = ?,
                    phone = ?,
                    telegram = ?,
                    street = ?,
                    house_number = ?,
                    address = ?,
                    bank_name = ?,
                    account_number = ?,
                    account_name = ?,
                    swift_code = ?,
                    preparation_time = ?,
                    delivery_fee_after_hours = ?,
                    updated_at = ?
                WHERE id = ?
                `
            )
            .bind(
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
                Date.now(),
                companyId
            )
            .run();

        return redirect(`/companies/${companyId}/edit?success=Company updated successfully`);
    } catch {
        return redirect(`/companies/${companyId}/edit?error=Failed to update company`);
    }
}

export default function CompanyEditPage() {
    const { company } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const errors: Record<string, string> = (actionData as { errors?: Record<string, string> } | undefined)?.errors || {};
    const { validateLatinInput } = useLatinValidation();

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
                    <Link to="/companies">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                                defaultValue={company.deliveryFeeAfterHours || 0}
                            />
                        </div>
                    </FormSection>

                    <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-100">
                        <Link to="/companies">
                            <Button variant="secondary" type="button">
                                Cancel
                            </Button>
                        </Link>
                        <Button variant="primary" type="submit">
                            Save
                        </Button>
                    </div>
                </div>
            </Form>
        </div>
    );
}
