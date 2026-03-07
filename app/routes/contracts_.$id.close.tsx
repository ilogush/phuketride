import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { Form, useLoaderData, useNavigate } from "react-router";
import { requireContractAccess } from "~/lib/access-policy.server";
import Modal from "~/components/dashboard/Modal";
import FormSection from "~/components/dashboard/FormSection";
import FormInput from "~/components/dashboard/FormInput";
import FormSelect from "~/components/dashboard/FormSelect";
import { Input } from "~/components/dashboard/Input";
import { Textarea } from "~/components/dashboard/Textarea";
import Button from "~/components/dashboard/Button";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { useDateMasking } from "~/lib/useDateMasking";
import { formatDateForDisplay, parseDateTimeFromDisplay } from "~/lib/formatters";
import { format } from "date-fns";
import { closeContractAction } from "~/lib/contracts-close-action.server";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";
import { useUrlToast } from "~/lib/useUrlToast";
import { trackServerOperation } from "~/lib/telemetry.server";
import { redirectWithRequestError } from "~/lib/route-feedback";
type CloseContractLoaderRow = {
    id: number;
    companyId: number;
    company_car_id: number;
    client_id: string | null;
    start_date: string;
    end_date: string;
    start_mileage: number | null;
    fuel_level: string | null;
    cleanliness: string | null;
    brandName: string | null;
    modelName: string | null;
    clientName: string | null;
    clientSurname: string | null;
};

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const contractId = Number(params.id);
    await requireContractAccess(request, context.cloudflare.env.DB, contractId);

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
        .first() as CloseContractLoaderRow | null;

    if (!contract) {
        throw new Response("Contract not found", { status: 404 });
    }

    return {
        contract: {
            ...contract,
            startDate: contract.start_date,
            endDate: contract.end_date,
            startMileage: contract.start_mileage,
            fuelLevel: contract.fuel_level,
            cleanliness: contract.cleanliness,
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
    };
}

export async function action({ request, params, context }: ActionFunctionArgs) {
    const contractId = Number(params.id);
    const { user, companyId } = await requireContractAccess(request, context.cloudflare.env.DB, contractId);
    return trackServerOperation({
        event: "contracts.close",
        scope: "route.action",
        request,
        userId: user.id,
        companyId,
        entityId: contractId,
        details: { route: "contracts_.$id.close" },
        run: async () => {
            const formData = await request.formData();
            const parsedEnvelope = parseWithSchema(
                z
                .object({
                    actualEndDate: z.string().trim().min(1, "Actual end date is required"),
                    endMileage: z.coerce.number().min(0, "End mileage is required"),
                    fuelLevel: z.string().trim().min(1, "Fuel level is required"),
                    cleanliness: z.string().trim().min(1, "Cleanliness is required"),
                }),
                {
                    actualEndDate: formData.get("actualEndDate"),
                    endMileage: formData.get("endMileage"),
                    fuelLevel: formData.get("fuelLevel"),
                    cleanliness: formData.get("cleanliness"),
                }
            );
            if (!parsedEnvelope.ok) {
                return redirectWithRequestError(request, `/contracts/${contractId}/close`, parsedEnvelope.error);
            }

            const actualEndDate = new Date(parseDateTimeFromDisplay(formData.get("actualEndDate") as string));
            const endMileage = Number(formData.get("endMileage"));
            const fuelLevel = formData.get("fuelLevel") as string;
            const cleanliness = formData.get("cleanliness") as string;
            const notes = formData.get("notes") as string || null;

            return closeContractAction({
                db: context.cloudflare.env.DB,
                request,
                user,
                companyId,
                contractId,
                actualEndDate,
                endMileage,
                fuelLevel,
                cleanliness,
                notes,
            });
        },
    });
}

export default function CloseContract() {
    useUrlToast();
    const { contract } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const { maskDateTimeInput } = useDateMasking();

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
                            type="text"
                            name="actualEndDate"
                            required
                            defaultValue={formatDateForDisplay(new Date()) + " " + format(new Date(), "HH:mm")}
                            placeholder="DD/MM/YYYY HH:mm"
                            onChange={maskDateTimeInput}
                        />
                        <FormInput
                            label="End Mileage"
                            name="endMileage"
                            type="number"

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
                    <Button type="submit" variant="primary">
                        Close Contract
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
