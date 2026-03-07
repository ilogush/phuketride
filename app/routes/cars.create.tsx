import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import { useState } from "react";
import { requireScopedDashboardAccess } from "~/lib/access-policy.server";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import FormSection from "~/components/dashboard/FormSection";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import { Textarea } from "~/components/dashboard/Textarea";
import Toggle from "~/components/dashboard/Toggle";
import CarPhotosUpload from "~/components/dashboard/CarPhotosUpload";
import DocumentPhotosUpload from "~/components/dashboard/DocumentPhotosUpload";
import CarTemplateDetails from "~/components/dashboard/cars/CarTemplateDetails";
import { useUrlToast } from "~/lib/useUrlToast";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { ExclamationTriangleIcon, Cog6ToothIcon, PhotoIcon, WrenchScrewdriverIcon, BanknotesIcon, ShieldCheckIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import SeasonalPricingMatrix from "~/components/dashboard/cars/SeasonalPricingMatrix";
import { handleCreateCarAction } from "~/lib/cars-create-action.server";
import { formatDateInput, getCarTemplateDisplayName } from "~/lib/car-form-display";
import { type CarTemplateOption } from "~/lib/cars-create-types";
import { trackServerOperation } from "~/lib/telemetry.server";
import { loadCreateCarPageData } from "~/lib/cars-create-page.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId } = await requireScopedDashboardAccess(request);
    return trackServerOperation({
        event: "cars.create.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: companyId!,
        details: { route: "cars.create" },
        run: async () => loadCreateCarPageData(context.cloudflare.env.DB),
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId } = await requireScopedDashboardAccess(request);
    const formData = await request.formData();
    return trackServerOperation({
        event: "cars.create",
        scope: "route.action",
        request,
        userId: user.id,
        companyId: companyId!,
        details: { route: "cars.create" },
        run: async () => handleCreateCarAction({ request, context, user, formData }),
    });
}

export default function CreateCarPage() {
    const { templates, colors, seasons, durations } = useLoaderData<typeof loader>();
    useUrlToast();
    const { validateLatinInput } = useLatinValidation();
    const [photos, setPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [pricePerDay, setPricePerDay] = useState(2343);
    const [fullInsuranceEnabled, setFullInsuranceEnabled] = useState(false);
    const [greenBookPhotos, setGreenBookPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [insurancePhotos, setInsurancePhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [taxRoadPhotos, setTaxRoadPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [currentMileage, setCurrentMileage] = useState(20321);
    const [nextOilChange, setNextOilChange] = useState(27986);

    // Template selection state
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const selectedTemplate = templates.find((t: { id: number }) => t.id === selectedTemplateId);

    // Check if oil change is due soon
    const kmUntilOilChange = nextOilChange - currentMileage;
    const isOilChangeDueSoon = kmUntilOilChange < 1000 && kmUntilOilChange >= 0;

    return (
        <div className="space-y-4">
            <PageHeader
                leftActions={<BackButton to="/cars" />}
                title="Add"
                rightActions={
                    <Button type="submit" form="create-car-form" variant="primary">
                        Create
                    </Button>
                }
            />

            <Form id="create-car-form" method="post" className="space-y-4">
                <FormSection title="Specifications" icon={<Cog6ToothIcon className="w-5 h-5" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select
                            label="Car Template"
                            name="templateId"
                            required
                            options={templates.map((t: CarTemplateOption) => ({
                                id: t.id,
                                name: getCarTemplateDisplayName(t)
                            }))}
                            placeholder="Select a template"
                            onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                        />
                        <Input
                            label="License Plate"
                            name="licensePlate"
                            required
                            placeholder="ABC-1234"
                            onChange={(e) => {
                                e.target.value = e.target.value.toUpperCase();
                                validateLatinInput(e, 'License Plate');
                            }}
                        />
                        <Select
                            label="Color"
                            name="colorId"
                            required
                            options={colors}
                            placeholder="Select color"
                        />
                        <Select
                            label="Status"
                            name="status"
                            required
                            options={[
                                { id: "available", name: "Available" },
                                { id: "maintenance", name: "Maintenance" },
                            ]}
                            defaultValue="available"
                        />
                    </div>
                </FormSection>
                {selectedTemplate && (
                    <CarTemplateDetails template={selectedTemplate} mode="compact" />
                )}

                <input type="hidden" name="transmission" value={selectedTemplate?.transmission || 'automatic'} />
                <input type="hidden" name="engineVolume" value={selectedTemplate?.engineVolume || 1.5} />
                <input type="hidden" name="fuelType" value={(selectedTemplate?.fuelType?.name || 'Petrol').toLowerCase()} />
                <input type="hidden" name="photos" value={JSON.stringify(photos)} />
                <FormSection title="Photos" icon={<PhotoIcon className="w-5 h-5" />}>
                    <div className="space-y-2">
                        <h4 className="block text-sm text-gray-500 mb-1">Car Photos (max 12)</h4>
                        <CarPhotosUpload
                            currentPhotos={[]}
                            onPhotosChange={setPhotos}
                            maxPhotos={12}
                        />
                    </div>
                </FormSection>

                <FormSection title="Maintenance" icon={<WrenchScrewdriverIcon className="w-5 h-5" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            label="Current Mileage"
                            name="currentMileage"
                            type="number"
                            required
                            min={0}
                            value={currentMileage}
                            onChange={(e) => setCurrentMileage(Number(e.target.value))}
                            addonRight="km"
                        />
                        <div>
                            <Input
                                label="Next Oil Change Mileage"
                                name="nextOilChangeMileage"
                                type="number"
                                required
                                min={0}
                                placeholder="e.g. 50000"
                                value={nextOilChange}
                                onChange={(e) => setNextOilChange(Number(e.target.value))}
                                addonRight="km"
                                className={isOilChangeDueSoon ? 'bg-gray-100 font-bold' : ''}
                            />
                            {isOilChangeDueSoon && (
                                <div className="mt-2 flex items-center gap-2 text-orange-600 animate-pulse">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    <span className="text-xs font-medium">Maintenance Due Soon! ({kmUntilOilChange} km left)</span>
                                </div>
                            )}
                        </div>
                        <Input
                            label="Oil Change Interval (km)"
                            name="oilChangeInterval"
                            type="number"
                            min={1000}
                            step={1000}
                            placeholder="10000"
                            defaultValue="10000"
                            addonRight="km"
                        />
                    </div>
                </FormSection>

                <FormSection title="Pricing" icon={<BanknotesIcon className="w-5 h-5" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            label="Price per Day"
                            name="pricePerDay"
                            type="number"
                            required
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            value={pricePerDay}
                            onChange={(e) => setPricePerDay(Number(e.target.value))}
                            addonRight="฿"
                        />
                        <Input
                            label="Deposit"
                            name="deposit"
                            type="number"
                            required
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            defaultValue="13330"
                            addonRight="฿"
                        />
                    </div>

                    <div className="mt-4">
                        <div>
                            <h4 className="block text-sm text-gray-500 mb-1">Seasonal Pricing Matrix</h4>
                            <SeasonalPricingMatrix
                                pricePerDay={pricePerDay}
                                seasons={seasons}
                                durations={durations}
                            />
                            <p className="mt-3 text-xs text-gray-400 italic">* Prices may be automatically adjusted based on market demand.</p>
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Insurance" icon={<ShieldCheckIcon className="w-5 h-5" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select
                            label="Insurance Type"
                            name="insuranceType"
                            hidePlaceholderOption
                            options={[
                                { id: "First Class Insurance", name: "First Class Insurance" },
                                { id: "Business Insurance", name: "Business Insurance" },
                            ]}
                            defaultValue="First Class Insurance"
                        />
                        <Input
                            label="Insurance Expiry"
                            name="insuranceExpiry"
                            placeholder="DD-MM-YYYY"
                            maxLength={10}
                            defaultValue={formatDateInput(new Date(new Date().setFullYear(new Date().getFullYear() + 3)))}
                        />
                        <Input
                            label="Registration Expiry"
                            name="registrationExpiry"
                            placeholder="DD-MM-YYYY"
                            maxLength={10}
                            defaultValue={formatDateInput(new Date(new Date().setFullYear(new Date().getFullYear() + 1)))}
                        />
                        <Input
                            label="Tax Road Expiry"
                            name="taxRoadExpiry"
                            placeholder="DD-MM-YYYY"
                            maxLength={10}
                            defaultValue={formatDateInput(new Date(new Date().setFullYear(new Date().getFullYear() + 3)))}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            label="Min Rental Days"
                            name="minRentalDays"
                            type="number"
                            min={1}
                            step={1}
                            placeholder="1"
                            defaultValue="1"
                        />
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Full Insurance</label>
                            <div className="flex items-center justify-between px-4 border border-gray-200 rounded-xl h-[38px] bg-white">
                                <span className="text-sm text-gray-900">{fullInsuranceEnabled ? "Enabled" : "Disabled"}</span>
                                <Toggle enabled={fullInsuranceEnabled} onChange={setFullInsuranceEnabled} />
                            </div>
                        </div>
                        <input type="hidden" name="fullInsuranceEnabled" value={fullInsuranceEnabled ? "true" : "false"} />
                        {fullInsuranceEnabled && (
                            <>
                                <Input
                                    label="Insurance Price per day"
                                    name="insurancePricePerDay"
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    placeholder="0.00"
                                    defaultValue="500"
                                    addonRight="฿"
                                />
                                <Input
                                    label="Max Insurance Price"
                                    name="maxInsurancePrice"
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    placeholder="0.00"
                                    defaultValue="300"
                                    addonRight="฿"
                                />
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <h4 className="block text-sm text-gray-500 mb-1">Green Book / Blue Book Photos (max 3)</h4>
                            <DocumentPhotosUpload
                                currentPhotos={[]}
                                onPhotosChange={setGreenBookPhotos}
                                maxPhotos={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <h4 className="block text-sm text-gray-500 mb-1">Insurance Photos (max 3)</h4>
                            <DocumentPhotosUpload
                                currentPhotos={[]}
                                onPhotosChange={setInsurancePhotos}
                                maxPhotos={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <h4 className="block text-sm text-gray-500 mb-1">Tax Road Photos (max 3)</h4>
                            <DocumentPhotosUpload
                                currentPhotos={[]}
                                onPhotosChange={setTaxRoadPhotos}
                                maxPhotos={3}
                            />
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Details" icon={<DocumentTextIcon className="w-5 h-5" />}>
                    <Input
                        label="Marketing Headline"
                        name="marketingHeadline"
                        placeholder="e.g. Perfect for city trips"
                        defaultValue="Comfortable Long-Distance Cruiser"
                    />
                    <Textarea
                        label="Description"
                        name="description"
                        rows={4}
                        placeholder="Optional description"
                        value="Spacious trunk and comfortable seating"
                    />
                </FormSection>
            </Form>
        </div>
    );
}
