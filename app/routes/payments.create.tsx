import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireScopedDashboardAccess } from "~/lib/access-policy.server";
import PageHeader from "~/components/dashboard/PageHeader";
import FormSection from "~/components/dashboard/FormSection";
import FormInput from "~/components/dashboard/FormInput";
import FormSelect from "~/components/dashboard/FormSelect";
import { Textarea } from "~/components/dashboard/Textarea";
import FormActions from "~/components/dashboard/FormActions";
import BackButton from "~/components/dashboard/BackButton";
import { BanknotesIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { trackServerOperation } from "~/lib/telemetry.server";
import { createPaymentRecord, loadPaymentCreatePageData } from "~/lib/payments-create.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId } = await requireScopedDashboardAccess(request, { allowAdminGlobal: true });
    return trackServerOperation({
        event: "payments.create.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "payments.create" },
        run: async () => loadPaymentCreatePageData({ db: context.cloudflare.env.DB, companyId }),
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId } = await requireScopedDashboardAccess(request, { allowAdminGlobal: true });
    return trackServerOperation({
        event: "payments.create",
        scope: "route.action",
        request,
        userId: user.id,
        companyId,
        details: { route: "payments.create" },
        run: async () => {
            const formData = await request.formData();
            // parseWithSchema(paymentSchema, ...) is delegated to createPaymentRecord.
            return createPaymentRecord({
                db: context.cloudflare.env.DB,
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

                <FormActions submitLabel="Create Payment" />
            </Form>
        </div>
    );
}
