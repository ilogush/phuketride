import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { useState } from "react";
import FormSection from "~/components/dashboard/FormSection";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import ExtrasPaymentsSection from "~/components/dashboard/contracts/ExtrasPaymentsSection";
import ContractFinancialFields from "~/components/dashboard/contracts/ContractFinancialFields";
import ContractDocumentPhotosRow from "~/components/dashboard/contracts/ContractDocumentPhotosRow";
import ContractNotesField from "~/components/dashboard/contracts/ContractNotesField";
import ContractRentalDetailsFields from "~/components/dashboard/contracts/ContractRentalDetailsFields";
import ContractClientDetailsFields from "~/components/dashboard/contracts/ContractClientDetailsFields";
import ContractCarDetailsFields from "~/components/dashboard/contracts/ContractCarDetailsFields";
import ContractCarPhotosCard from "~/components/dashboard/contracts/ContractCarPhotosCard";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { useDateMasking } from "~/lib/useDateMasking";
import { useUrlToast } from "~/lib/useUrlToast";
import { trackServerOperation } from "~/lib/telemetry.server";
import { loadContractCreatePageData } from "~/lib/rental-create-page.server";
import { requireScopedDashboardAccess } from "~/lib/access-policy.server";
import { getScopedDb } from "~/lib/db-factory.server";
import {
    TruckIcon,
    CalendarIcon,
    UserIcon,
    BanknotesIcon,
} from "@heroicons/react/24/outline";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context, requireScopedDashboardAccess);
    const scopedCompanyId = companyId!;
    return trackServerOperation({
        event: "contracts.new.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: scopedCompanyId,
        details: { route: "contracts.new" },
        run: async () => loadContractCreatePageData(sdb.db, scopedCompanyId),
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context, requireScopedDashboardAccess);
    const formData = await request.formData();
    return trackServerOperation({
        event: "contracts.create",
        scope: "route.action",
        request,
        userId: user.id,
        companyId: companyId!,
        details: { route: "contracts.new" },
        run: async () => sdb.contracts.newAction({
            assets: context.cloudflare.env.ASSETS,
            request,
            user,
            formData
        }),
    });
}

export default function NewContract() {
    const { cars, districts, currencies } = useLoaderData<typeof loader>();
    useUrlToast();
    const { validateLatinInput } = useLatinValidation();
    const { maskDateTimeInput } = useDateMasking();

    const [fullInsurance, setFullInsurance] = useState(false);
    const [islandTrip, setIslandTrip] = useState(false);
    const [krabiTrip, setKrabiTrip] = useState(false);
    const [babySeat, setBabySeat] = useState(false);
    const [carPhotos, setCarPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [passportPhotos, setPassportPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [driverLicensePhotos, setDriverLicensePhotos] = useState<Array<{ base64: string; fileName: string }>>([]);

    const extraPaymentItems = [
        { key: "full_insurance", title: "Full Insurance", enabled: fullInsurance, onToggle: setFullInsurance },
        { key: "island_trip", title: "Island Trip", enabled: islandTrip, onToggle: setIslandTrip },
        { key: "krabi_trip", title: "Krabi Trip", enabled: krabiTrip, onToggle: setKrabiTrip },
        { key: "baby_seat", title: "Baby Seat", enabled: babySeat, onToggle: setBabySeat },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="New Contract"
                leftActions={<BackButton />}
                rightActions={
                    <Button type="submit" variant="solid" form="new-contract-form">
                        Create
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Form - Left Side */}
                <div className="lg:col-span-2 space-y-4">
                    <Form id="new-contract-form" method="post" className="space-y-4">
                        <input type="hidden" name="passportPhotos" value={JSON.stringify(passportPhotos)} />
                        <input type="hidden" name="driverLicensePhotos" value={JSON.stringify(driverLicensePhotos)} />
                        <input type="hidden" name="photos" value={JSON.stringify(carPhotos.map((p) => p.base64))} />
                        <input type="hidden" name="fullInsurance" value={fullInsurance ? "true" : "false"} />
                        <input type="hidden" name="islandTrip" value={islandTrip ? "true" : "false"} />
                        <input type="hidden" name="krabiTrip" value={krabiTrip ? "true" : "false"} />
                        <input type="hidden" name="babySeat" value={babySeat ? "true" : "false"} />
                        
                        {/* Car Details */}
                        <FormSection
                            title="Car Details"
                            icon={<TruckIcon className="w-6 h-6" />}
                        >
                            <ContractCarDetailsFields cars={cars} />
                        </FormSection>

                        {/* Rental Details */}
                        <FormSection
                            title="Rental Details"
                            icon={<CalendarIcon className="w-6 h-6" />}
                        >
                            <ContractRentalDetailsFields
                                districts={districts}
                                onDateChange={maskDateTimeInput}
                            />
                        </FormSection>

                        {/* User Details */}
                        <FormSection
                            title="User Details"
                            icon={<UserIcon className="w-6 h-6" />}
                        >
                            <ContractClientDetailsFields onLatinNameInput={validateLatinInput} />
                        </FormSection>

                        {/* Payments */}
                        <FormSection
                            title="Payments"
                            icon={<BanknotesIcon className="w-6 h-6" />}
                        >
                            <ExtrasPaymentsSection currencies={currencies} items={extraPaymentItems} />
                        </FormSection>
                    </Form>
                </div>

                {/* Right Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Financial Summary */}
                    <div className="bg-white rounded-3xl border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Financial Summary</h3>
                        <div className="space-y-3">
                            <ContractFinancialFields />
                        </div>
                    </div>

                    {/* Car Photos */}
                    <ContractCarPhotosCard onPhotosChange={setCarPhotos} />

                    {/* Document Photos */}
                    <div className="bg-white rounded-3xl border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Document Photos</h3>
                        <ContractDocumentPhotosRow
                            passportPhotos={passportPhotos}
                            onPassportPhotosChange={setPassportPhotos}
                            driverLicensePhotos={driverLicensePhotos}
                            onDriverLicensePhotosChange={setDriverLicensePhotos}
                        />
                    </div>

                    {/* Notes & Terms */}
                    <div className="bg-white rounded-3xl border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Notes & Terms</h3>
                        <ContractNotesField />
                    </div>

                </div>
            </div>
        </div>
    );
}
