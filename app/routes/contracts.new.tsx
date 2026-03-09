import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { useState } from "react";
import FormSection from '~/components/shared/ui/FormSection';
import PageHeader from '~/components/shared/ui/PageHeader';
import BackButton from '~/components/shared/ui/BackButton';
import Button from '~/components/shared/ui/Button';
import ExtrasPaymentsSection from "~/components/dashboard/contracts/ExtrasPaymentsSection";
import ContractFinancialFields from "~/components/dashboard/contracts/ContractFinancialFields";
import ContractDocumentPhotosRow from "~/components/dashboard/contracts/ContractDocumentPhotosRow";
import ContractNotesField from "~/components/dashboard/contracts/ContractNotesField";
import ContractRentalDetailsFields from "~/components/dashboard/contracts/ContractRentalDetailsFields";
import ContractClientDetailsFields from "~/components/dashboard/contracts/ContractClientDetailsFields";
import AdminCard from '~/components/shared/ui/AdminCard';
import ContractCarDetailsFields from "~/components/dashboard/contracts/ContractCarDetailsFields";
import ContractCarPhotosCard from "~/components/dashboard/contracts/ContractCarPhotosCard";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { useDateMasking } from "~/lib/useDateMasking";
import { trackServerOperation } from "~/lib/telemetry.server";
import { loadContractCreatePageData } from "~/lib/rental-create-page.server";
import { requireScopedDashboardAccess } from "~/lib/access-policy.server";
import { getScopedDb } from "~/lib/db-factory.server";
import { checkRateLimit, getClientIdentifier } from "~/lib/rate-limit.server";
import {
    TruckIcon,
    CalendarIcon,
    UserIcon,
    BanknotesIcon,
    DocumentTextIcon,
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
        run: async () => loadContractCreatePageData(sdb.rawDb, scopedCompanyId),
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context, requireScopedDashboardAccess);

    // Rate-limit contract creation (10 per minute per user)
    const rateLimit = await checkRateLimit(
        (context.cloudflare.env as { RATE_LIMIT?: KVNamespace }).RATE_LIMIT,
        getClientIdentifier(request, user.id),
        "form"
    );
    if (!rateLimit.allowed) {
        return { error: "Too many requests. Please wait and try again." };
    }

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
            companyId: companyId!,
            formData
        }),
    });
}

export default function NewContract() {
    const { cars, districts, currencies } = useLoaderData<typeof loader>();
    const { validateLatinInput } = useLatinValidation();
    const { maskDateTimeInput } = useDateMasking();

    const [fullInsurance, setFullInsurance] = useState(false);
    const [islandTrip, setIslandTrip] = useState(false);
    const [krabiTrip, setKrabiTrip] = useState(false);
    const [babySeat, setBabySeat] = useState(false);
    const [carPhotos, setCarPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [passportPhotos, setPassportPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [driverLicensePhotos, setDriverLicensePhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [deliveryCost, setDeliveryCost] = useState<string | number>("");
    const [returnCost, setReturnCost] = useState<string | number>("");
    const [rentalAmount, setRentalAmount] = useState<string | number>("");
    const [extraAmounts, setExtraAmounts] = useState<Record<string, string | number>>({
        full_insurance: "",
        island_trip: "",
        krabi_trip: "",
        baby_seat: "",
    });
    const [extraMethods, setExtraMethods] = useState<Record<string, string>>({
        full_insurance: "",
        island_trip: "",
        krabi_trip: "",
        baby_seat: "",
    });

    const handleExtraAmountChange = (key: string, value: string) => {
        setExtraAmounts(prev => ({ ...prev, [key]: value }));
    };

    const handleExtraMethodChange = (key: string, value: string) => {
        setExtraMethods(prev => ({ ...prev, [key]: value }));
    };

    const handlePickupDistrictChange = (id: string) => {
        const district = districts.find(d => String(d.id) === id);
        if (district) {
            setDeliveryCost(district.deliveryPrice ?? 0);
        }
    };

    const handleReturnDistrictChange = (id: string) => {
        const district = districts.find(d => String(d.id) === id);
        if (district) {
            setReturnCost(district.deliveryPrice ?? 0);
        }
    };

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
                leftSlot={<BackButton />}
                rightSlot={
                    <Button type="submit" variant="primary" form="new-contract-form">
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
                                onPickupDistrictChange={handlePickupDistrictChange}
                                onReturnDistrictChange={handleReturnDistrictChange}
                            />
                        </FormSection>

                        {/* User Details */}
                        <FormSection
                            title="User Details"
                            icon={<UserIcon className="w-6 h-6" />}
                        >
                            <ContractClientDetailsFields onLatinNameInput={validateLatinInput} />
                        </FormSection>

                        {/* Financial Summary */}
                        <FormSection
                            title="Financial Summary"
                            icon={<BanknotesIcon className="w-6 h-6" />}
                        >
                            <div className="space-y-6">
                                <ExtrasPaymentsSection items={extraPaymentItems} />
                                <div className="pt-6 border-t border-gray-100">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Pricing Details</h3>
                                    <ContractFinancialFields 
                                        currencies={currencies} 
                                        values={{ 
                                            rentalAmount,
                                            deliveryCost, 
                                            returnCost,
                                            // Always pass all extras so the DOM stays stable (no layout shift).
                                            // Disabled extras get an empty string — ContractFinancialFields shows them dimmed.
                                            extras: extraPaymentItems.map(i => ({
                                                key: i.key,
                                                title: i.title,
                                                amount: i.enabled ? (extraAmounts[i.key] || "") : "",
                                                method: extraMethods[i.key] || ""
                                            }))
                                        }}
                                        onRentalAmountChange={setRentalAmount}
                                        onDeliveryCostChange={setDeliveryCost}
                                        onReturnCostChange={setReturnCost}
                                        onExtraAmountChange={handleExtraAmountChange}
                                    />
                                </div>
                            </div>
                        </FormSection>
                    </Form>
                </div>

                {/* Right Sidebar */}
                <div className="lg:col-span-1 space-y-4">


                    {/* Car Photos */}
                    <ContractCarPhotosCard onPhotosChange={setCarPhotos} />

                    {/* Document Photos */}
                        <ContractDocumentPhotosRow
                            passportPhotos={passportPhotos}
                            onPassportPhotosChange={setPassportPhotos}
                            driverLicensePhotos={driverLicensePhotos}
                            onDriverLicensePhotosChange={setDriverLicensePhotos}
                        />

                    {/* Notes & Terms */}
                    <AdminCard title="Notes & Terms" icon={<DocumentTextIcon className="w-5 h-5" />}>
                        <ContractNotesField />
                    </AdminCard>

                </div>
            </div>
        </div>
    );
}
