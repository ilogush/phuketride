import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useLoaderData, useActionData, Link } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";
import FormSection from "~/components/dashboard/FormSection";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { z } from "zod";

interface LocationRow {
    id: number;
    name: string;
}

interface DistrictRow {
    id: number;
    name: string;
    locationId: number;
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const companyId = parseInt(params.companyId || "0");

    let company: any = null;
    const [locationsList, districtsList] = await Promise.all([
        context.cloudflare.env.DB
            .prepare("SELECT id, name FROM locations ORDER BY name ASC LIMIT 100")
            .all()
            .then((r: { results?: LocationRow[] }) => r.results || []),
        context.cloudflare.env.DB
            .prepare("SELECT id, name, location_id AS locationId FROM districts ORDER BY name ASC LIMIT 200")
            .all()
            .then((r: { results?: DistrictRow[] }) => r.results || []),
    ]);

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

    return { user, company, locations: locationsList, districts: districtsList };
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
        locationId: z.coerce.number().int().positive("Location is required"),
        districtId: z.coerce.number().int().positive("District is required"),
        street: z.string().trim().min(1, "Street is required"),
        houseNumber: z.string().trim().min(1, "House number is required"),
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
        locationId: formData.get("locationId"),
        districtId: formData.get("districtId"),
        street: formData.get("street"),
        houseNumber: formData.get("houseNumber"),
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
        locationId,
        districtId,
        street,
        houseNumber,
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
                    location_id = ?,
                    district_id = ?,
                    street = ?,
                    house_number = ?,
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
                locationId,
                districtId,
                street,
                houseNumber,
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
    const { company, locations, districts } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const errors: Record<string, string> = (actionData as { errors?: Record<string, string> } | undefined)?.errors || {};
    const { validateLatinInput } = useLatinValidation();
    const initialLocationId = Number(company?.location_id ?? 0) || Number(locations[0]?.id ?? 0);
    const initialDistrictId = Number(company?.district_id ?? 0);
    const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId);
    const [selectedDistrictId, setSelectedDistrictId] = useState(initialDistrictId);
    const filteredDistricts = districts.filter((district: DistrictRow) => district.locationId === selectedLocationId);

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
                rightActions={
                    <div className="flex gap-2">
                        <Link to="/companies">
                            <Button variant="secondary" type="button">
                                Cancel
                            </Button>
                        </Link>
                        <Button variant="primary" type="submit" form="edit-company-form">
                            Save
                        </Button>
                    </div>
                }
            />

            <Form id="edit-company-form" method="post">
                <div className="py-6 space-y-4">
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
                            <Select
                                label="Location"
                                name="locationId"
                                required
                                value={selectedLocationId ? selectedLocationId.toString() : ""}
                                onChange={(e) => {
                                    const nextLocationId = Number(e.target.value);
                                    setSelectedLocationId(nextLocationId);
                                    const nextDistrict = districts.find((district: DistrictRow) => district.locationId === nextLocationId);
                                    setSelectedDistrictId(nextDistrict ? Number(nextDistrict.id) : 0);
                                }}
                                options={locations}
                            />

                            <Select
                                label="District"
                                name="districtId"
                                required
                                value={selectedDistrictId ? String(selectedDistrictId) : ""}
                                onChange={(e) => setSelectedDistrictId(Number(e.target.value))}
                                options={filteredDistricts}
                                placeholder="Select District"
                            />

                            <Input
                                label="Street"
                                name="street"
                                type="text"
                                placeholder="Enter street name"
                                required
                                defaultValue={company.street}
                                onChange={(e) => validateLatinInput(e, 'Street')}
                            />

                            <Input
                                label="House Number"
                                name="houseNumber"
                                type="text"
                                placeholder="Enter house number"
                                required
                                defaultValue={company.house_number}
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

                </div>
            </Form>
        </div>
    );
}
