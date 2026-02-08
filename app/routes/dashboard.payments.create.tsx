import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import PageHeader from "~/components/ui/PageHeader";
import Card from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { Select } from "~/components/ui/Select";
import Button from "~/components/ui/Button";
import BackButton from "~/components/ui/BackButton";
import FormActions from "~/components/ui/FormActions";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const [contractsList, paymentTypesList] = await Promise.all([
        db.select().from(schema.contracts).limit(100),
        db.select().from(schema.paymentTypes).limit(100),
    ]);

    return { contracts: contractsList, paymentTypes: paymentTypesList };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    const contractId = Number(formData.get("contractId"));
    const paymentTypeId = Number(formData.get("paymentTypeId"));
    const amount = Number(formData.get("amount"));
    const paymentMethod = formData.get("paymentMethod") as "cash" | "bank_transfer" | "card";
    const notes = formData.get("notes") as string;

    await db.insert(schema.payments).values({
        contractId,
        paymentTypeId,
        amount,
        currency: "THB",
        paymentMethod,
        notes,
        status: "completed",
        createdBy: user.id,
    });

    return redirect("/payments");
}

export default function RecordPaymentPage() {
    const { contracts, paymentTypes } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Record Payment"
                leftActions={<BackButton to="/payments" />}
            />

            <Card className="max-w-2xl p-8 border-gray-200">
                <Form method="post" className="space-y-8">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <Select
                                label="Contract / Booking"
                                name="contractId"
                                options={contracts.map(c => ({ id: c.id, name: `Contract #${c.id}` }))}
                                placeholder="Select Contract"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <Select
                                label="Payment Type"
                                name="paymentTypeId"
                                options={paymentTypes.map(t => ({ id: t.id, name: `${t.name} (${t.sign})` }))}
                                placeholder="Select Type"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <Input
                                label="Amount (THB)"
                                name="amount"
                                type="number"
                                placeholder="5000"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <Select
                                label="Method"
                                name="paymentMethod"
                                options={[
                                    { id: "cash", name: "Cash" },
                                    { id: "bank_transfer", name: "Bank Transfer" },
                                    { id: "card", name: "Credit/Debit Card" }
                                ]}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-4">
                            <Input
                                label="Notes / Transaction ID"
                                name="notes"
                                placeholder="Any additional info..."
                            />
                        </div>
                    </div>

                    <FormActions submitLabel="Record Payment" />
                </Form>
            </Card>
        </div>
    );
}
