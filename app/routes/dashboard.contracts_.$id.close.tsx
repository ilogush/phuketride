import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useLoaderData, useNavigate, useParams } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
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
    const contractId = Number(params.id);

    const contract = await context.cloudflare.env.DB
        .prepare(`
            SELECT
                c.*,
                cc.company_id AS companyId,
                cb.name AS brandName,
                cm.name AS modelName,
                u.name AS clientName,
                u.surname AS clientSurname
            FROM contracts c
            JOIN company_cars cc ON cc.id = c.company_car_id
            LEFT JOIN car_templates ct ON ct.id = cc.template_id
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            LEFT JOIN users u ON u.id = c.client_id
            WHERE c.id = ?
            LIMIT 1
        `)
        .bind(contractId)
        .first<any>();

    if (!contract) {
        throw new Response("Contract not found", { status: 404 });
    }

    // SECURITY: Verify contract belongs to user's company
    if (user.role !== "admin" && contract.companyId !== user.companyId) {
        throw new Response("Forbidden", { status: 403 });
    }

    // Get payment templates for contract closing (show_on_close = 1)
    const paymentTemplates = await context.cloudflare.env.DB
        .prepare(`
            SELECT * FROM payment_types
            WHERE is_active = 1 AND show_on_close = 1 AND (company_id IS NULL OR company_id = ?)
        `)
        .bind(user.companyId ?? null)
        .all()
        .then((r: any) => r.results || []);

    // Get active currencies
    const currencies = await context.cloudflare.env.DB
        .prepare(`
            SELECT * FROM currencies
            WHERE is_active = 1 AND (company_id IS NULL OR company_id = ?)
        `)
        .bind(user.companyId ?? null)
        .all()
        .then((r: any) => r.results || []);

    return {
        contract: {
            ...contract,
            companyCar: {
                id: contract.company_car_id,
                companyId: contract.companyId,
                template: {
                    brand: { name: contract.brandName },
                    model: { name: contract.modelName },
                },
            },
            client: { name: contract.clientName, surname: contract.clientSurname },
        },
        paymentTemplates,
        currencies,
    };
}

export async function action({ request, params, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
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
        const contract = await context.cloudflare.env.DB
            .prepare("SELECT id, status, company_car_id AS companyCarId FROM contracts WHERE id = ? LIMIT 1")
            .bind(contractId)
            .first<any>();
        const carCompany = await context.cloudflare.env.DB
            .prepare("SELECT company_id AS companyId FROM company_cars WHERE id = ? LIMIT 1")
            .bind(contract?.companyCarId || 0)
            .first<any>();

        if (!contract) {
            return redirect(`/contracts?error=${encodeURIComponent("Contract not found")}`);
        }

        // SECURITY: Verify contract belongs to user's company
        if (user.role !== "admin" && carCompany?.companyId !== user.companyId) {
            return redirect(`/contracts?error=${encodeURIComponent("Forbidden")}`);
        }

        // Update contract status to closed
        await context.cloudflare.env.DB
            .prepare(`
                UPDATE contracts
                SET status = 'closed', actual_end_date = ?, end_mileage = ?, fuel_level = ?, cleanliness = ?, notes = ?, updated_at = ?
                WHERE id = ?
            `)
            .bind(actualEndDate.toISOString(), endMileage, fuelLevel, cleanliness, notes, new Date().toISOString(), contractId)
            .run();

        // Create payments from selected templates
        const paymentCount = Number(formData.get("paymentCount")) || 0;
        for (let i = 0; i < paymentCount; i++) {
            const paymentTypeId = Number(formData.get(`payment_${i}_type`));
            const amount = Number(formData.get(`payment_${i}_amount`));
            const currencyId = Number(formData.get(`payment_${i}_currency`));
            const paymentMethod = formData.get(`payment_${i}_method`) as string;

            if (paymentTypeId && amount > 0) {
                await context.cloudflare.env.DB
                    .prepare(`
                        INSERT INTO payments (
                            contract_id, payment_type_id, amount, currency_id, payment_method, status, created_by, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?)
                    `)
                    .bind(
                        contractId,
                        paymentTypeId,
                        amount,
                        currencyId || null,
                        paymentMethod || null,
                        user.id,
                        new Date().toISOString(),
                        new Date().toISOString()
                    )
                    .run();
            }
        }

        // Update car status to available
        const { updateCarStatus } = await import("~/lib/contract-helpers.server");
        await updateCarStatus(context.cloudflare.env.DB, contract.companyCarId, 'available', 'Contract closed');

        // Audit log
        const metadata = getRequestMetadata(request);
        quickAudit({
            db: context.cloudflare.env.DB,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: "contract",
            entityId: contractId,
            action: "update",
            beforeState: { status: contract.status },
            afterState: { status: "closed", actualEndDate, endMileage },
            ...metadata,
        });

        return redirect(`/contracts?success=${encodeURIComponent("Contract closed successfully")}`);
    } catch {
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
