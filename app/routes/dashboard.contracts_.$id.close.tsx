import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useLoaderData, useNavigate, useParams } from "react-router";
import { useState } from "react";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "~/lib/auth.server";
import * as schema from "~/db/schema";
import Modal from "~/components/dashboard/Modal";
import FormSection from "~/components/dashboard/FormSection";
import FormInput from "~/components/dashboard/FormInput";
import FormSelect from "~/components/dashboard/FormSelect";
import { Input } from "~/components/dashboard/Input";
import { Textarea } from "~/components/dashboard/Textarea";
import Button from "~/components/dashboard/Button";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { BanknotesIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const contractId = Number(params.id);

    // Get contract with car details
    const contract = await db.query.contracts.findFirst({
        where: (c, { eq }) => eq(c.id, contractId),
        with: {
            companyCar: {
                with: {
                    template: {
                        with: {
                            brand: true,
                            model: true,
                        }
                    }
                }
            },
            client: true,
        }
    });

    if (!contract) {
        throw new Response("Contract not found", { status: 404 });
    }

    // Get payment templates for contract closing (show_on_close = 1)
    const paymentTemplates = await db.query.paymentTypes.findMany({
        where: (pt, { eq, and, or, isNull }) => and(
            eq(pt.isActive, true),
            eq(pt.showOnClose, true),
            or(
                isNull(pt.companyId),
                eq(pt.companyId, user.companyId!)
            )
        ),
    });

    // Get active currencies
    const currencies = await db.query.currencies.findMany({
        where: (c, { eq, and, or, isNull }) => and(
            eq(c.isActive, true),
            or(
                isNull(c.companyId),
                eq(c.companyId, user.companyId!)
            )
        ),
    });

    return { contract, paymentTemplates, currencies };
}

export async function action({ request, params, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const contractId = Number(params.id);
    const formData = await request.formData();

    try {
        // Parse closing data
        const actualEndDate = new Date(formData.get("actualEndDate") as string);
        const endMileage = Number(formData.get("endMileage"));
        const fuelLevel = formData.get("fuelLevel") as string;
        const cleanliness = formData.get("cleanliness") as string;
        const notes = formData.get("notes") as string || null;

        // Get contract to update car status
        const contract = await db.query.contracts.findFirst({
            where: (c, { eq }) => eq(c.id, contractId),
        });

        if (!contract) {
            return redirect(`/contracts?error=${encodeURIComponent("Contract not found")}`);
        }

        // Update contract status to completed
        await db.update(schema.contracts)
            .set({
                status: "completed",
                actualEndDate,
                endMileage,
                fuelLevel,
                cleanliness,
                notes,
            })
            .where(eq(schema.contracts.id, contractId));

        // Create payments from selected templates
        const paymentCount = Number(formData.get("paymentCount")) || 0;
        for (let i = 0; i < paymentCount; i++) {
            const paymentTypeId = Number(formData.get(`payment_${i}_type`));
            const amount = Number(formData.get(`payment_${i}_amount`));
            const currencyId = Number(formData.get(`payment_${i}_currency`));
            const paymentMethod = formData.get(`payment_${i}_method`) as string;

            if (paymentTypeId && amount > 0) {
                await db.insert(schema.payments).values({
                    contractId,
                    paymentTypeId,
                    amount,
                    currencyId,
                    paymentMethod: paymentMethod as any,
                    status: "completed",
                    createdBy: user.id,
                });
            }
        }

        // Update car status to available
        await db.update(schema.companyCars)
            .set({ status: 'available' })
            .where(eq(schema.companyCars.id, contract.companyCarId));

        // Audit log
        const metadata = getRequestMetadata(request);
        quickAudit({
            db,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: "contract",
            entityId: contractId,
            action: "update",
            beforeState: { status: contract.status },
            afterState: { status: "completed", actualEndDate, endMileage },
            ...metadata,
        });

        return redirect(`/contracts?success=${encodeURIComponent("Contract closed successfully")}`);
    } catch (error) {
        console.error("Failed to close contract:", error);
        return redirect(`/contracts/${contractId}/close?error=${encodeURIComponent("Failed to close contract")}`);
    }
}

export default function CloseContract() {
    const { contract, paymentTemplates, currencies } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const [selectedPayments, setSelectedPayments] = useState<Array<{ templateId: number; amount: number; currencyId: number; method: string }>>([]);

    const fuelLevels = [
        { id: "full", name: "Full (8/8)" },
        { id: "7/8", name: "7/8 (87.5%)" },
        { id: "6/8", name: "6/8 (75%)" },
        { id: "5/8", name: "5/8 (62.5%)" },
        { id: "half", name: "Half (4/8)" },
        { id: "3/8", name: "3/8 (37.5%)" },
        { id: "2/8", name: "2/8 (25%)" },
        { id: "1/8", name: "1/8 (12.5%)" },
        { id: "empty", name: "Empty" },
    ];

    const cleanlinessOptions = [
        { id: "clean", name: "Clean" },
        { id: "dirty", name: "Dirty" },
    ];

    const paymentMethods = [
        { id: "cash", name: "Cash" },
        { id: "bank_transfer", name: "Bank Transfer" },
        { id: "card", name: "Card" },
    ];

    return (
        <Modal
            isOpen={true}
            onClose={() => navigate("/contracts")}
            title="Close Contract"
            size="large"
        >
            <Form method="post" className="space-y-6">
                {/* Contract Info */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Contract Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-gray-500">Car:</span>
                            <span className="ml-2 font-medium">
                                {contract.companyCar.template?.brand?.name} {contract.companyCar.template?.model?.name}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Client:</span>
                            <span className="ml-2 font-medium">
                                {contract.client.name} {contract.client.surname}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Start:</span>
                            <span className="ml-2 font-medium">
                                {new Date(contract.startDate).toLocaleDateString()}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">End:</span>
                            <span className="ml-2 font-medium">
                                {new Date(contract.endDate).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Return Details */}
                <FormSection
                    title="Return Details"
                    icon={<DocumentTextIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            label="Actual End Date & Time"
                            type="datetime-local"
                            name="actualEndDate"
                            required
                            defaultValue={new Date().toISOString().slice(0, 16)}
                        />
                        <FormInput
                            label="End Mileage"
                            name="endMileage"
                            type="number"
                            placeholder="0"
                            defaultValue={contract.startMileage || 0}
                            required
                        />
                        <FormSelect
                            label="Fuel Level"
                            name="fuelLevel"
                            options={fuelLevels}
                            defaultValue={contract.fuelLevel || "full"}
                            required
                        />
                        <FormSelect
                            label="Cleanliness"
                            name="cleanliness"
                            options={cleanlinessOptions}
                            defaultValue={contract.cleanliness || "clean"}
                            required
                        />
                    </div>
                </FormSection>

                {/* Payments */}
                <FormSection
                    title="Payments"
                    icon={<BanknotesIcon className="w-6 h-6" />}
                >
                    <div className="space-y-3">
                        {paymentTemplates.map((template, index) => (
                            <div key={template.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`payment_${index}`}
                                        className="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-800"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedPayments([...selectedPayments, { 
                                                    templateId: template.id, 
                                                    amount: 0, 
                                                    currencyId: currencies[0]?.id || 1,
                                                    method: 'cash'
                                                }]);
                                            } else {
                                                setSelectedPayments(selectedPayments.filter(p => p.templateId !== template.id));
                                            }
                                        }}
                                    />
                                    <label htmlFor={`payment_${index}`} className="ml-2 text-sm font-medium text-gray-700">
                                        {template.name} ({template.sign})
                                    </label>
                                </div>
                                <FormInput
                                    label="Amount"
                                    name={`payment_${index}_amount`}
                                    type="number"
                                    placeholder="0.00"
                                    disabled={!selectedPayments.find(p => p.templateId === template.id)}
                                />
                                <FormSelect
                                    label="Currency"
                                    name={`payment_${index}_currency`}
                                    options={currencies.map(c => ({ id: c.id, name: `${c.code} (${c.symbol})` }))}
                                    disabled={!selectedPayments.find(p => p.templateId === template.id)}
                                />
                                <FormSelect
                                    label="Method"
                                    name={`payment_${index}_method`}
                                    options={paymentMethods}
                                    disabled={!selectedPayments.find(p => p.templateId === template.id)}
                                />
                                <input type="hidden" name={`payment_${index}_type`} value={template.id} />
                            </div>
                        ))}
                        <input type="hidden" name="paymentCount" value={paymentTemplates.length} />
                    </div>
                </FormSection>

                {/* Notes */}
                <div>
                    <Textarea
                        label="Closing Notes"
                        name="notes"
                        rows={3}
                        placeholder="Add any notes about the return (damages, issues, etc.)"
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate("/contracts")}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        Close Contract
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
