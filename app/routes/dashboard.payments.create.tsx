import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
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
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const [contractsList, paymentTypesList, carsList, currenciesList] = await Promise.all([
        db.select().from(schema.contracts).limit(100),
        db.select().from(schema.paymentTypes).limit(100),
        db.select({
            id: schema.companyCars.id,
            licensePlate: schema.companyCars.licensePlate,
        }).from(schema.companyCars).limit(100),
        // Mock currencies data
        Promise.resolve([
            { id: 1, code: "THB", symbol: "฿" },
            { id: 2, code: "USD", symbol: "$" },
            { id: 3, code: "EUR", symbol: "€" },
            { id: 7, code: "RUB", symbol: "₽" },
        ])
    ]);

    return { contracts: contractsList, paymentTypes: paymentTypesList, cars: carsList, currencies: currenciesList };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
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
        const [newPayment] = await db.insert(schema.payments).values({
            contractId: validData.contractId,
            paymentTypeId: validData.paymentTypeId,
            amount: validData.amount,
            currency: validData.currency,
            paymentMethod: validData.paymentMethod,
            status: validData.status,
            notes: validData.notes,
            createdBy: user.id,
        }).returning({ id: schema.payments.id });

        // Audit log
        const metadata = getRequestMetadata(request);
        quickAudit({
            db,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: "payment",
            entityId: newPayment.id,
            action: "create",
            afterState: { ...validData, id: newPayment.id },
            ...metadata,
        });

        return redirect(`/payments?success=${encodeURIComponent("Payment created successfully")}`);
    } catch (error) {
        console.error("Failed to create payment:", error);
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
