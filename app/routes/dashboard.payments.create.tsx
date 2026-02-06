import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import PageHeader from "~/components/ui/PageHeader";
import Card from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import Button from "~/components/ui/Button";
import BackButton from "~/components/ui/BackButton";

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

    return redirect("/dashboard/payments");
}

export default function RecordPaymentPage() {
    const { contracts, paymentTypes } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <BackButton to="/dashboard/payments" />
                <PageHeader title="Record Payment" />
            </div>

            <Card className="max-w-2xl p-8 border-gray-200">
                <Form method="post" className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Contract / Booking</label>
                            <select
                                name="contractId"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                                required
                            >
                                <option value="">Select Contract</option>
                                {contracts.map(c => (
                                    <option key={c.id} value={c.id}>Contract #{c.id}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Payment Type</label>
                            <select
                                name="paymentTypeId"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                                required
                            >
                                <option value="">Select Type</option>
                                {paymentTypes.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.sign})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Amount (THB)"
                            name="amount"
                            type="number"
                            placeholder="5000"
                            required
                        />
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Method</label>
                            <select
                                name="paymentMethod"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-all font-medium"
                                required
                            >
                                <option value="cash">Cash</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="card">Credit/Debit Card</option>
                            </select>
                        </div>
                    </div>

                    <Input
                        label="Notes / Transaction ID"
                        name="notes"
                        placeholder="Any additional info..."
                    />

                    <div className="flex justify-end gap-4 pt-6">
                        <Button variant="secondary" onClick={() => window.history.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            Record Payment
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
