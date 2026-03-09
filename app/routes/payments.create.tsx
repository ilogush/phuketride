import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, Form } from "react-router";
import PageHeader from '~/components/shared/ui/PageHeader';
import FormSection from '~/components/shared/ui/FormSection';
import { Input } from '~/components/shared/ui/Input';
import { Select } from '~/components/shared/ui/Select';
import { Textarea } from '~/components/shared/ui/Textarea';
import FormActions from '~/components/shared/ui/FormActions';
import BackButton from '~/components/shared/ui/BackButton';
import { BanknotesIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { trackServerOperation } from "~/lib/telemetry.server";
import { checkRateLimit, getClientIdentifier } from "~/lib/rate-limit.server";

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

    // Rate-limit payment creation
    const rateLimit = await checkRateLimit(
        (context.cloudflare.env as { RATE_LIMIT?: KVNamespace }).RATE_LIMIT,
        getClientIdentifier(request, user.id),
        "form"
    );
    if (!rateLimit.allowed) {
        return { error: "Too many requests. Please wait and try again." };
    }

    return trackServerOperation({
        event: "payments.create",
        scope: "route.action",
        request,
        userId: user.id,
        companyId,
        details: { route: "payments.create" },
        run: async () => {
            const formData = await request.formData();
            return sdb.payments.createAction({
                request,
                user,
                formData,
            });
        },
    });
}

export default function RecordPaymentPage() {
    const { contracts, paymentTypes, currencies } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-4">
            <PageHeader
                title="New Payment"
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
                        />
                        <Select
                            label="Payment Type"
                            name="paymentTypeId"
                            options={paymentTypes.map(t => ({ id: t.id, name: t.name }))}
                            placeholder="Select type"
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
