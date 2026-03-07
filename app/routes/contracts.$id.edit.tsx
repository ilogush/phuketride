import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { useState } from "react";
import { requireContractAccess } from "~/lib/access-policy.server";
import FormSection from "~/components/dashboard/FormSection";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import ExtrasToggleGrid from "~/components/dashboard/contracts/ExtrasToggleGrid";
import ContractFinancialFields from "~/components/dashboard/contracts/ContractFinancialFields";
import ContractDocumentPhotosRow from "~/components/dashboard/contracts/ContractDocumentPhotosRow";
import ContractNotesField from "~/components/dashboard/contracts/ContractNotesField";
import ContractRentalDetailsFields from "~/components/dashboard/contracts/ContractRentalDetailsFields";
import ContractClientDetailsFields from "~/components/dashboard/contracts/ContractClientDetailsFields";
import ContractCarDetailsFields from "~/components/dashboard/contracts/ContractCarDetailsFields";
import ContractCarPhotosCard from "~/components/dashboard/contracts/ContractCarPhotosCard";
import { useDateMasking } from "~/lib/useDateMasking";
import { formatDateForDisplay } from "~/lib/formatters";
import { handleEditContractAction } from "~/lib/contracts-edit-action.server";
import { loadEditContractPageData } from "~/lib/contracts-edit-page.server";
import {
    TruckIcon,
    CalendarIcon,
    UserIcon,
    CubeIcon,
    BanknotesIcon,
    DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { useUrlToast } from "~/lib/useUrlToast";
import { trackServerOperation } from "~/lib/telemetry.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const contractId = parseInt(params.id!);
    const { companyId } = await requireContractAccess(request, context.cloudflare.env.DB, contractId);
    return trackServerOperation({
        event: "contracts.edit.load",
        scope: "route.loader",
        request,
        companyId,
        entityId: contractId,
        details: { route: "contracts.$id.edit" },
        run: () => loadEditContractPageData(context.cloudflare.env.DB, contractId, companyId),
    });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const { user, companyId } = await requireContractAccess(request, context.cloudflare.env.DB, Number(params.id));
    const formData = await request.formData();
    return trackServerOperation({
        event: "contracts.edit",
        scope: "route.action",
        request,
        userId: user.id,
        companyId,
        entityId: Number(params.id),
        details: { route: "contracts.$id.edit" },
        run: async () => handleEditContractAction({ request, context, user, companyId, params, formData }),
    });
}

export default function EditContract() {
    useUrlToast();
    const { contract, cars, districts, client } = useLoaderData<typeof loader>();
    const { maskDateTimeInput } = useDateMasking();

    // Safely parse dates
    const getValidDate = (dateValue: unknown) => {
        if (!dateValue) return new Date();
        if (typeof dateValue !== "string" && typeof dateValue !== "number" && !(dateValue instanceof Date)) {
            return new Date();
        }
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? new Date() : date;
    };

    const startDate = getValidDate(contract.startDate);
    const endDate = getValidDate(contract.endDate);
    const [fullInsurance, setFullInsurance] = useState(contract.fullInsuranceEnabled || false);
    const [islandTrip, setIslandTrip] = useState(contract.islandTripEnabled || false);
    const [krabiTrip, setKrabiTrip] = useState(contract.krabiTripEnabled || false);
    const [babySeat, setBabySeat] = useState(contract.babySeatEnabled || false);
    const [carPhotos, setCarPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [passportPhotos, setPassportPhotos] = useState<Array<{ base64: string; fileName: string }>>(() => {
        try {
            return client?.passportPhotos ? JSON.parse(client.passportPhotos) : [];
        } catch {
            return [];
        }
    });
    const [driverLicensePhotos, setDriverLicensePhotos] = useState<Array<{ base64: string; fileName: string }>>(() => {
        try {
            return client?.driverLicensePhotos ? JSON.parse(client.driverLicensePhotos) : [];
        } catch {
            return [];
        }
    });
    const [notes, setNotes] = useState(contract.notes || "");

    const existingContractPhotos: string[] = (() => {
        try {
            return contract.photos ? JSON.parse(contract.photos) : [];
        } catch {
            return [];
        }
    })();

    const extraToggleItems = [
        { key: "full_insurance", label: "Full Insurance", enabled: fullInsurance, onToggle: setFullInsurance },
        { key: "island_trip", label: "Island Trip", enabled: islandTrip, onToggle: setIslandTrip },
        { key: "krabi_trip", label: "Krabi Trip", enabled: krabiTrip, onToggle: setKrabiTrip },
        { key: "baby_seat", label: "Baby Seat", enabled: babySeat, onToggle: setBabySeat },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title={`Edit Contract #${contract.id}`}
                leftActions={<BackButton to="/contracts" />}
                rightActions={
                    <Button type="submit" variant="primary" form="edit-contract-form">
                        Save
                    </Button>
                }
            />

            <Form id="edit-contract-form" method="post" className="space-y-4">
                <input type="hidden" name="passportPhotos" value={JSON.stringify(passportPhotos)} />
                <input type="hidden" name="driverLicensePhotos" value={JSON.stringify(driverLicensePhotos)} />
                <input
                    type="hidden"
                    name="photos"
                    value={JSON.stringify((carPhotos.length > 0 ? carPhotos.map((p) => p.base64) : existingContractPhotos))}
                />
                <input type="hidden" name="fullInsurance" value={fullInsurance ? "true" : "false"} />
                <input type="hidden" name="islandTrip" value={islandTrip ? "true" : "false"} />
                <input type="hidden" name="krabiTrip" value={krabiTrip ? "true" : "false"} />
                <input type="hidden" name="babySeat" value={babySeat ? "true" : "false"} />
                {/* Car Details */}
                <FormSection
                    title="Car Details"
                    icon={<TruckIcon className="w-6 h-6" />}
                >
                    <ContractCarDetailsFields
                        cars={cars}
                        defaults={{
                            companyCarId: contract.companyCarId,
                            fuelLevel: contract.fuelLevel,
                            cleanliness: contract.cleanliness,
                            startMileage: contract.startMileage,
                        }}
                    />
                </FormSection>

                {/* Car Photos */}
                <ContractCarPhotosCard
                    currentPhotos={existingContractPhotos}
                    onPhotosChange={setCarPhotos}
                />

                {/* Rental Details */}
                <FormSection
                    title="Rental Details"
                    icon={<CalendarIcon className="w-6 h-6" />}
                >
                    <ContractRentalDetailsFields
                        districts={districts}
                        onDateChange={maskDateTimeInput}
                        defaults={{
                            startDateTime: formatDateForDisplay(startDate) + " " + format(startDate, "HH:mm"),
                            pickupDistrictId: contract.pickupDistrictId,
                            pickupHotel: contract.pickupHotel,
                            pickupRoom: contract.pickupRoom,
                            endDateTime: formatDateForDisplay(endDate) + " " + format(endDate, "HH:mm"),
                            returnDistrictId: contract.returnDistrictId,
                            returnHotel: contract.returnHotel,
                            returnRoom: contract.returnRoom,
                        }}
                    />
                </FormSection>

                {/* User Details */}
                <FormSection
                    title="User Details"
                    icon={<UserIcon className="w-6 h-6" />}
                >
                    <ContractClientDetailsFields
                        defaults={{
                            passportNumber: client?.passportNumber,
                            name: client?.name,
                            surname: client?.surname,
                            phone: client?.phone,
                            whatsapp: client?.whatsapp,
                            telegram: client?.telegram,
                            email: client?.email,
                        }}
                    />
                </FormSection>

                {/* Document Photos */}
                <div className="bg-white rounded-3xl border border-gray-200 p-4">
                    <ContractDocumentPhotosRow
                        passportPhotos={passportPhotos}
                        onPassportPhotosChange={setPassportPhotos}
                        driverLicensePhotos={driverLicensePhotos}
                        onDriverLicensePhotosChange={setDriverLicensePhotos}
                    />
                </div>

                {/* Extras */}
                <FormSection
                    title="Extras"
                    icon={<CubeIcon className="w-6 h-6" />}
                >
                    <ExtrasToggleGrid items={extraToggleItems} />
                </FormSection>

                {/* Financial Summary */}
                <FormSection
                    title="Financial Summary"
                    icon={<BanknotesIcon className="w-6 h-6" />}
                >
                    <ContractFinancialFields
                        defaults={{
                            deliveryCost: contract.deliveryCost,
                            returnCost: contract.returnCost,
                            depositAmount: contract.depositAmount,
                            depositPaymentMethod: contract.depositPaymentMethod,
                            totalAmount: contract.totalAmount,
                        }}
                    />
                </FormSection>

                {/* Notes */}
                <FormSection
                    title="Notes & Terms"
                    icon={<DocumentTextIcon className="w-6 h-6" />}
                >
                    <ContractNotesField value={notes} onChange={setNotes} />
                </FormSection>

            </Form>
        </div>
    );
}
