import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, Form } from "react-router";
import PageHeader from "~/components/dashboard/PageHeader";
import FormSection from "~/components/dashboard/FormSection";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import { Textarea } from "~/components/dashboard/Textarea";
import FormActions from "~/components/dashboard/FormActions";
import BackButton from "~/components/dashboard/BackButton";
import { BanknotesIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { trackServerOperation } from "~/lib/telemetry.server";
import { createPaymentRecord } from "~/lib/payments-create.server";

import { getScopedDb } from "~/lib/db-factory.server";

export const meta: MetaFunction = () => [
    { title: "Create Payment — Phuket Ride Admin" },
    { name: "robots", content: "noindex, nofollow" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);
    return trackServerOperation({
        event: "payments.create.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "payments.create" },
        run: async () => sdb.payments.getCreateData(),
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);
    return trackServerOperation({
        event: "payments.create",
        scope: "route.action",
        request,
        userId: user.id,
        companyId,
        details: { route: "payments.create" },
        run: async () => {
            const formData = await request.formData();
            return createPaymentRecord({
                db: sdb.db,
                request,
                user,
                companyId,
                formData,
            });
        },
    });
}

export default function RecordPaymentPage() {
    const { contracts, paymentTypes, currencies } = useLoaderData<typeof loader>();
    useUrlToast();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Record Payment"
                leftActions={<BackButton to="/payments" />}
            />

            <Form method="post" className="space-y-4">
                <FormSection title="Payment Details" icon={<BanknotesIcon />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select
                            label="Contract (Optional)"
                            name="contractId"
                            options={contracts.map(c => ({ id: c.id, name: `Contract #${c.id}` }))}
                            placeholder="Select contract"
                            showPlaceholderOption
                        />
                        <Select
                            label="Payment Type"
                            name="paymentTypeId"
                            options={paymentTypes.map(t => ({ id: t.id, name: t.name }))}
                            placeholder="Select type"
                            showPlaceholderOption
                            required
                        />
                        <Select
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
                        <Select
                            label="Status"
                            name="status"
                            options={[
                                { id: "pending", name: "Pending" },
                                { id: "completed", name: "Completed" },
                                { id: "cancelled", name: "Cancelled" }
                            ]}
                            placeholder="Select status"
                            showPlaceholderOption
                            required
                        />
                        <Input
                            label="Amount"
                            name="amount"
                            type="number"
                            placeholder="Enter amount"
                            required
                        />
                        <Select
                            label="Currency"
                            name="currency"
                            options={currencies.map(c => ({ id: c.code, name: `${c.code} (${c.symbol})` }))}
                            placeholder="Select currency"
                            showPlaceholderOption
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

                <FormActions submitLabel="Create Payment" />
            </Form>
        </div>
    );
}
