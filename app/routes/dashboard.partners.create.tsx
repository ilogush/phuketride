import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useLoaderData, useActionData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { companies } from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import { Input } from "~/components/dashboard/Input";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";
import FormSection from "~/components/dashboard/FormSection";
import {
    BuildingOfficeIcon,
    BanknotesIcon,
    MapPinIcon,
    PhoneIcon,
    EnvelopeIcon,
} from "@heroicons/react/24/outline";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);

    return { user };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);
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
        await db.insert(companies).values({
            name,
            ownerId: user.id,
            email,
            phone,
            telegram,
            locationId: 1,
            districtId: 1,
            street,
            houseNumber,
            address,
            bankName,
            accountNumber,
            accountName,
            swiftCode,
            preparationTime,
            deliveryFeeAfterHours,
            weeklySchedule: JSON.stringify({
                monday: { open: true, start: "08:00", end: "20:00" },
                tuesday: { open: true, start: "08:00", end: "20:00" },
                wednesday: { open: true, start: "08:00", end: "20:00" },
                thursday: { open: true, start: "08:00", end: "20:00" },
                friday: { open: true, start: "08:00", end: "20:00" },
                saturday: { open: true, start: "08:00", end: "20:00" },
                sunday: { open: true, start: "08:00", end: "20:00" },
            }),
        });

        return redirect("/partners");
    } catch (error) {
        console.error("Error creating partner:", error);
        return { errors: { form: "Failed to create partner. Please try again." } };
    }
}

export default function PartnersCreatePage() {
    const actionData = useActionData<typeof action>();
    const errors = actionData?.errors || {};

    return (
        <div className="space-y-4">
            <PageHeader
                title="Add New Partner"
                leftActions={
                    <Link to="/partners">
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

                    <FormSection title="Basic Information">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Input
                                label="Company Name"
                                name="name"
                                type="text"
                                placeholder="Enter company name"
                                required
                                error={errors.name}
                                onChange={(e) => validateLatinInput(e, 'Company Name')}
                            />

                            <Input
                                label="Email"
                                name="email"
                                type="email"
                                placeholder="Enter email"
                                required
                                error={errors.email}
                            />

                            <Input
                                label="Phone"
                                name="phone"
                                type="tel"
                                placeholder="Enter phone number"
                                required
                                error={errors.phone}
                            />

                            <Input
                                label="Telegram"
                                name="telegram"
                                type="text"
                                placeholder="Enter Telegram username"
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
                                onChange={(e) => validateLatinInput(e, 'Street')}
                            />

                            <Input
                                label="House Number"
                                name="houseNumber"
                                type="text"
                                placeholder="Enter house number"
                            />

                            <Input
                                label="Full Address"
                                name="address"
                                type="text"
                                placeholder="Enter full address"
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
                            />

                            <Input
                                label="Account Number"
                                name="accountNumber"
                                type="text"
                                placeholder="Enter account number"
                            />

                            <Input
                                label="Account Name"
                                name="accountName"
                                type="text"
                                placeholder="Enter account name"
                            />

                            <Input
                                label="SWIFT Code"
                                name="swiftCode"
                                type="text"
                                placeholder="Enter SWIFT code"
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
                                defaultValue={30}
                            />

                            <Input
                                label="Delivery Fee After Hours"
                                name="deliveryFeeAfterHours"
                                type="number"
                                step="0.01"
                                placeholder="0"
                            />
                        </div>
                    </FormSection>

                    <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-100">
                        <Link to="/partners">
                            <Button variant="secondary" type="button">
                                Cancel
                            </Button>
                        </Link>
                        <Button variant="primary" type="submit">
                            Create Partner
                        </Button>
                    </div>
                </div>
            </Form>
        </div>
    );
}
