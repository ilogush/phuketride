import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import FormSection from "~/components/dashboard/FormSection";
import FormInput from "~/components/dashboard/FormInput";
import FormSelect from "~/components/dashboard/FormSelect";
import { Textarea } from "~/components/dashboard/Textarea";
import FormActions from "~/components/dashboard/FormActions";
import BackButton from "~/components/dashboard/BackButton";
import { BanknotesIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import { useEffect } from "react";
import { paymentSchema } from "~/schemas/payment";

export async function loader({ request, context }: LoaderFunctionArgs) {
    await requireAuth(request);
    const [contractsResult, paymentTypesResult, carsResult, currenciesList] = await Promise.all([
        context.cloudflare.env.DB.prepare("SELECT * FROM contracts LIMIT 100").all(),
        context.cloudflare.env.DB.prepare("SELECT * FROM payment_types LIMIT 100").all(),
        context.cloudflare.env.DB.prepare("SELECT id, license_plate AS licensePlate FROM company_cars LIMIT 100").all(),
        // Mock currencies data
        Promise.resolve([
            { id: 1, code: "THB", symbol: "฿" },
            { id: 2, code: "USD", symbol: "$" },
            { id: 3, code: "EUR", symbol: "€" },
            { id: 7, code: "RUB", symbol: "₽" },
        ])
    ]);
    const contractsList = (contractsResult.results ?? []) as Array<{ id: number }>;
    const paymentTypesList = (paymentTypesResult.results ?? []) as Array<{ id: number; name: string }>;
    const carsList = (carsResult.results ?? []) as Array<{ id: number; licensePlate: string }>;
    return { contracts: contractsList, paymentTypes: paymentTypesList, cars: carsList, currencies: currenciesList };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const formData = await request.formData();

    // Parse form data
    const rawData = {
        contractId: formData.get("contractId") ? Number(formData.get("contractId")) : 0,
        paymentTypeId: Number(formData.get("paymentTypeId")),
        amount: Number(formData.get("amount")),
        currency: (formData.get("currency") as string) || "THB",
        paymentMethod: formData.get("paymentMethod") as "cash" | "bank_transfer" | "card",
        status: (formData.get("status") as "pending" | "completed" | "cancelled") || "completed",
        notes: (formData.get("notes") as string) || null,
        createdBy: user.id,
    };

    // Validate with Zod
    const validation = paymentSchema.safeParse(rawData);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return redirect(`/payments/create?error=${encodeURIComponent(firstError.message)}`);
    }

    const validData = validation.data;

    try {
        await context.cloudflare.env.DB
            .prepare(
                `
                INSERT INTO payments (
                    contract_id, payment_type_id, amount, currency,
                    payment_method, status, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `
            )
            .bind(
                validData.contractId,
                validData.paymentTypeId,
                validData.amount,
                validData.currency,
                validData.paymentMethod,
                validData.status,
                validData.notes,
                user.id
            )
            .run();

        return redirect(`/payments?success=${encodeURIComponent("Payment created successfully")}`);
    } catch {
        return redirect(`/payments/create?error=${encodeURIComponent("Failed to create payment")}`);
    }
}

export default function RecordPaymentPage() {
    const { contracts, paymentTypes, cars, currencies } = useLoaderData<typeof loader>();
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
        <div className="space-y-6">
            <PageHeader
                title="Record Payment"
                leftActions={<BackButton to="/payments" />}
            />

            <Form method="post" className="space-y-4">
                <FormSection title="Payment Details" icon={<BanknotesIcon />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormSelect
                            label="Auto"
                            name="carId"
                            options={cars.map(c => ({ id: c.id, name: c.licensePlate }))}
                            placeholder="Select Auto"
                        />
                        <FormSelect
                            label="Contract (Optional)"
                            name="contractId"
                            options={contracts.map(c => ({ id: c.id, name: `Contract #${c.id}` }))}
                            placeholder="Select contract"
                        />
                        <FormSelect
                            label="Payment Type"
                            name="paymentTypeId"
                            options={paymentTypes.map(t => ({ id: t.id, name: t.name }))}
                            placeholder="Select type"
                            required
                        />
                        <FormSelect
                            label="Method"
                            name="paymentMethod"
                            options={[
                                { id: "cash", name: "Cash" },
                                { id: "card", name: "Card" },
                                { id: "bank_transfer", name: "Bank Transfer" },
                            ]}
                            defaultValue="cash"
                            required
                        />
                        <FormSelect
                            label="Status"
                            name="status"
                            options={[
                                { id: "pending", name: "Pending" },
                                { id: "completed", name: "Completed" },
                                { id: "cancelled", name: "Cancelled" }
                            ]}
                            placeholder="Select status"
                            required
                        />
                        <FormInput
                            label="Amount"
                            name="amount"
                            type="number"
                            placeholder="Enter amount"
                            required
                        />
                        <FormSelect
                            label="Currency"
                            name="currency"
                            options={currencies.map(c => ({ id: c.code, name: `${c.code} (${c.symbol})` }))}
                            placeholder="Select currency"
                            required
                        />
                    </div>
                </FormSection>

                <FormSection title="Additional Information" icon={<DocumentTextIcon />}>
                    <Textarea
                        label="Notes"
                        name="notes"
                        rows={3}
                        placeholder="Optional notes..."
                    />
                </FormSection>

                <FormActions submitLabel="Create Payment" cancelTo="/payments" />
            </Form>
        </div>
    );
}
