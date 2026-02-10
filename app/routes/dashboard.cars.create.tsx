import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import Tabs from "~/components/dashboard/Tabs";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import { Textarea } from "~/components/dashboard/Textarea";
import Toggle from "~/components/dashboard/Toggle";
import CarPhotosUpload from "~/components/dashboard/CarPhotosUpload";
import DocumentPhotosUpload from "~/components/dashboard/DocumentPhotosUpload";
import { useToast } from "~/lib/toast";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { carSchema } from "~/schemas/car";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    // Load templates with related data using relations
    const templatesList = await db.query.carTemplates.findMany({
        with: {
            brand: true,
            model: true,
            bodyType: true,
            fuelType: true,
        },
        limit: 100,
    });

    const [colorsList, seasonsList, durationsList, fuelTypesList] = await Promise.all([
        db.select().from(schema.colors).limit(100),
        db.select().from(schema.seasons).where(eq(schema.seasons.companyId, user.companyId!)).limit(10),
        db.select().from(schema.rentalDurations).where(eq(schema.rentalDurations.companyId, user.companyId!)).limit(10),
        db.select().from(schema.fuelTypes).limit(20),
    ]);

    return { 
        templates: templatesList, 
        colors: colorsList, 
        seasons: seasonsList, 
        durations: durationsList,
        fuelTypes: fuelTypesList,
        user 
    };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    const companyId = user.companyId!;
    
    // Parse form data
    const rawData = {
        templateId: Number(formData.get("templateId")),
        colorId: Number(formData.get("colorId")),
        licensePlate: (formData.get("licensePlate") as string).toUpperCase(),
        productionYear: Number(formData.get("productionYear")),
        transmission: formData.get("transmission") as "automatic" | "manual",
        engineVolume: Number(formData.get("engineVolume")),
        fuelType: formData.get("fuelType") as "petrol" | "diesel" | "electric" | "hybrid",
        status: (formData.get("status") as "available" | "rented" | "maintenance" | "inactive") || "available",
        vin: (formData.get("vin") as string) || null,
        currentMileage: Number(formData.get("currentMileage")),
        nextOilChangeMileage: Number(formData.get("nextOilChangeMileage")),
        oilChangeInterval: Number(formData.get("oilChangeInterval")) || 10000,
        dailyMileageLimit: formData.get("dailyMileageLimit") ? Number(formData.get("dailyMileageLimit")) : null,
        pricePerDay: Number(formData.get("pricePerDay")),
        deposit: Number(formData.get("deposit")),
        insuranceType: (formData.get("insuranceType") as string) || null,
        insuranceExpiry: (formData.get("insuranceExpiry") as string) || null,
        registrationExpiry: (formData.get("registrationExpiry") as string) || null,
        taxRoadExpiry: (formData.get("taxRoadExpiry") as string) || null,
        fullInsuranceMinDays: formData.get("fullInsuranceMinDays") ? Number(formData.get("fullInsuranceMinDays")) : null,
        minInsurancePrice: formData.get("minInsurancePrice") ? Number(formData.get("minInsurancePrice")) : null,
        maxInsurancePrice: formData.get("maxInsurancePrice") ? Number(formData.get("maxInsurancePrice")) : null,
    };

    // Validate with Zod
    const validation = carSchema.safeParse(rawData);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return redirect(`/cars/create?error=${encodeURIComponent(firstError.message)}`);
    }

    const validData = validation.data;

    try {
        const marketingHeadline = formData.get("marketingHeadline") as string || null;
        const description = formData.get("description") as string || null;

        const [newCar] = await db.insert(schema.companyCars).values({
            companyId,
            templateId: validData.templateId,
            colorId: validData.colorId,
            licensePlate: validData.licensePlate,
            year: validData.productionYear,
            transmission: validData.transmission,
            engineVolume: validData.engineVolume,
            fuelTypeId: null,
            vin: validData.vin,
            status: validData.status,
            mileage: validData.currentMileage,
            nextOilChangeMileage: validData.nextOilChangeMileage,
            oilChangeInterval: validData.oilChangeInterval,
            pricePerDay: validData.pricePerDay,
            deposit: validData.deposit,
            insuranceType: validData.insuranceType,
            insuranceExpiryDate: validData.insuranceExpiry ? new Date(validData.insuranceExpiry.split('-').reverse().join('-')) : null,
            registrationExpiry: validData.registrationExpiry ? new Date(validData.registrationExpiry.split('-').reverse().join('-')) : null,
            taxRoadExpiryDate: validData.taxRoadExpiry ? new Date(validData.taxRoadExpiry.split('-').reverse().join('-')) : null,
            minInsurancePrice: validData.minInsurancePrice,
            maxInsurancePrice: validData.maxInsurancePrice,
            marketingHeadline,
            description,
        }).returning({ id: schema.companyCars.id });

        // Audit log
        const metadata = getRequestMetadata(request);
        quickAudit({
            db,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: "car",
            entityId: newCar.id,
            action: "create",
            afterState: { ...validData, id: newCar.id },
            ...metadata,
        });

        return redirect(`/cars?success=${encodeURIComponent("Car created successfully")}`);
    } catch (error: any) {
        console.error("Failed to create car:", error);
        if (error.message?.includes('UNIQUE constraint failed') && error.message?.includes('license_plate')) {
            return redirect(`/cars/create?error=${encodeURIComponent(`License plate "${validData.licensePlate}" is already in use`)}`);
        }
        return redirect(`/cars/create?error=${encodeURIComponent("Failed to create car")}`);
    }
}

export default function CreateCarPage() {
    const { templates, colors, seasons, durations, fuelTypes } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const { validateLatinInput } = useLatinValidation();
    const [activeTab, setActiveTab] = useState("specifications");
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
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

    // Toast notifications
    useEffect(() => {
        const error = searchParams.get("error");
        if (error) {
            toast.error(error);
        }
    }, [searchParams, toast]);

    const tabs = [
        { id: "specifications", label: "Specifications" },
        { id: "maintenance", label: "Maintenance" },
        { id: "pricing", label: "Pricing" },
        { id: "insurance", label: "Insurance" },
        { id: "details", label: "Details" },
    ];

    // Calculate seasonal pricing
    const calculateSeasonalPrice = (basePrice: number, multiplier: number, days: number, durationMultiplier: number) => {
        const dailyPrice = basePrice * multiplier;
        const totalPrice = dailyPrice * days * durationMultiplier;
        return { dailyPrice, totalPrice };
    };

    // Format date for input (DD-MM-YYYY)
    const formatDateInput = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    // Get template display name
    const getTemplateName = (template: any) => {
        return `${template.brand?.name || 'Unknown'} ${template.model?.name || 'Unknown'} ${template.productionYear ? `(${template.productionYear})` : ''}`;
    };

    // Check if oil change is due soon
    const kmUntilOilChange = nextOilChange - currentMileage;
    const isOilChangeDueSoon = kmUntilOilChange < 1000 && kmUntilOilChange >= 0;

    return (
        <div className="space-y-4">
            <PageHeader
                leftActions={<BackButton to="/dashboard/cars" />}
                title="Add"
                rightActions={
                    <Button type="submit" form="create-car-form" variant="primary">
                        Create
                    </Button>
                }
            />

            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} className="mb-4" />

            <Form id="create-car-form" method="post" className="bg-white rounded-3xl shadow-sm p-4">
                {activeTab === "specifications" && (
                    <div className="space-y-6">
                        {/* Template Selection */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Step 1: Select Car Template</h3>
                            <Select
                                label="Car Template"
                                name="templateId"
                                required
                                options={templates.map(t => ({
                                    id: t.id,
                                    name: getTemplateName(t)
                                }))}
                                placeholder="Select a template"
                                onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                            />
                            {selectedTemplate && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <p className="text-xs font-medium text-gray-500 mb-2">Template Details:</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div><span className="text-gray-500">Body Type:</span> <span className="font-medium">{selectedTemplate.bodyType?.name || 'N/A'}</span></div>
                                        <div><span className="text-gray-500">Transmission:</span> <span className="font-medium">{selectedTemplate.transmission || 'N/A'}</span></div>
                                        <div><span className="text-gray-500">Engine:</span> <span className="font-medium">{selectedTemplate.engineVolume}L</span></div>
                                        <div><span className="text-gray-500">Seats:</span> <span className="font-medium">{selectedTemplate.seats}</span></div>
                                        <div><span className="text-gray-500">Doors:</span> <span className="font-medium">{selectedTemplate.doors}</span></div>
                                        <div><span className="text-gray-500">Fuel:</span> <span className="font-medium">{selectedTemplate.fuelType?.name || 'N/A'}</span></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Unique Car Data */}
                        {selectedTemplateId && (
                            <>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Step 2: Add Unique Car Details</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                        <Input
                                            label="Production Year"
                                            name="productionYear"
                                            type="number"
                                            min={1900}
                                            max={new Date().getFullYear() + 1}
                                            required
                                            placeholder="e.g. 2024"
                                            defaultValue={selectedTemplate?.productionYear || new Date().getFullYear()}
                                        />
                                        <Select
                                            label="Color"
                                            name="colorId"
                                            required
                                            options={colors}
                                            placeholder="Select color"
                                        />
                                        <Input
                                            label="VIN Number"
                                            name="vin"
                                            maxLength={17}
                                            className="font-mono"
                                            placeholder="Optional (17 chars)"
                                            onChange={(e) => {
                                                e.target.value = e.target.value.toUpperCase();
                                                validateLatinInput(e, 'VIN');
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Hidden fields from template */}
                                <input type="hidden" name="transmission" value={selectedTemplate?.transmission || 'automatic'} />
                                <input type="hidden" name="engineVolume" value={selectedTemplate?.engineVolume || 1.5} />
                                <input type="hidden" name="fuelType" value={selectedTemplate?.fuelType?.name || 'Gasoline'} />

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                                <div className="space-y-2">
                                    <h4 className="block text-xs font-medium text-gray-500 mb-1">Car Photos (max 12) *</h4>
                                    <CarPhotosUpload
                                        currentPhotos={[]}
                                        onPhotosChange={setPhotos}
                                        maxPhotos={12}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === "maintenance" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Input
                                label="Daily Mileage Limit"
                                name="dailyMileageLimit"
                                type="number"
                                min={0}
                                placeholder="Optional"
                                addonRight="km/day"
                            />
                            <Input
                                label="Current Mileage"
                                name="currentMileage"
                                type="number"
                                required
                                min={0}
                                placeholder="0"
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
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                        </svg>
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
                    </div>
                )}

                {activeTab === "pricing" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

                        <div className="mt-6">
                            <div>
                                <h4 className="block text-xs font-medium text-gray-500 mb-1">Seasonal Pricing Matrix</h4>
                                <div className="overflow-hidden">
                                    <div className="border border-gray-200 rounded-3xl overflow-hidden bg-white">
                                        <div className="overflow-x-auto sm:mx-0">
                                            <table className="min-w-full divide-y divide-gray-100 bg-transparent">
                                                <thead>
                                                    <tr className="bg-gray-50/50">
                                                        <th scope="col" className="pl-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight">
                                                            <span>Season</span>
                                                        </th>
                                                        {durations.map((duration) => (
                                                            <th
                                                                key={duration.id}
                                                                scope="col"
                                                                className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight hidden sm:table-cell"
                                                            >
                                                                <span>{duration.rangeName}</span>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {seasons.map((season) => (
                                                        <tr key={season.id} className="group hover:bg-white transition-all">
                                                            <td className="pl-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-gray-900">{season.seasonName}</span>
                                                                    <span className="text-xs text-gray-500 mt-0.5">
                                                                        {String(season.startMonth).padStart(2, '0')}/{String(season.startDay).padStart(2, '0')} - {String(season.endMonth).padStart(2, '0')}/{String(season.endDay).padStart(2, '0')}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500 mt-0.5">
                                                                        {season.discountLabel || `${season.priceMultiplier > 1 ? '+' : ''}${Math.round((season.priceMultiplier - 1) * 100)}%`}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            {durations.map((duration) => {
                                                                const avgDays = duration.maxDays 
                                                                    ? Math.ceil((duration.minDays + duration.maxDays) / 2)
                                                                    : duration.minDays + 2;
                                                                const { dailyPrice, totalPrice } = calculateSeasonalPrice(
                                                                    pricePerDay,
                                                                    season.priceMultiplier,
                                                                    avgDays,
                                                                    duration.priceMultiplier
                                                                );
                                                                return (
                                                                    <td
                                                                        key={duration.id}
                                                                        className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap hidden sm:table-cell text-left"
                                                                    >
                                                                        <div className="flex flex-col items-start">
                                                                            <span className="font-bold text-gray-900">{Math.round(dailyPrice)}฿</span>
                                                                            <span className="text-xs text-gray-500">per day</span>
                                                                            <div className="mt-1 pt-1 border-t border-gray-200 w-full text-left">
                                                                                <span className="font-semibold text-gray-900">{Math.round(totalPrice)}฿</span>
                                                                                <span className="text-xs text-gray-500 block">for {avgDays} days</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-gray-400 italic">* Prices may be automatically adjusted based on market demand.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "insurance" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Select
                                label="Insurance Type"
                                name="insuranceType"
                                options={[
                                    { id: "Business Insurance", name: "Business Insurance" },
                                    { id: "First Class Insurance", name: "First Class Insurance" },
                                ]}
                                placeholder="Select Insurance Type"
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Full Insurance</label>
                                <div className="flex items-center justify-between px-4 border border-gray-200 rounded-xl h-[38px] bg-white">
                                    <span className="text-sm text-gray-900">Enabled</span>
                                    <Toggle
                                        enabled={fullInsuranceEnabled}
                                        onChange={setFullInsuranceEnabled}
                                    />
                                </div>
                            </div>
                            {fullInsuranceEnabled && (
                                <>
                                    <Input
                                        label="Min Days"
                                        name="fullInsuranceMinDays"
                                        type="number"
                                        min={1}
                                        step={1}
                                        placeholder="5"
                                        defaultValue="5"
                                    />
                                    <Input
                                        label="Price (short term)"
                                        name="minInsurancePrice"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        placeholder="0.00"
                                        defaultValue="500"
                                        addonRight="฿"
                                    />
                                    <Input
                                        label="Price (long term)"
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

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <h4 className="block text-xs font-medium text-gray-500 mb-1">Green Book / Blue Book Photos (max 3)</h4>
                                <DocumentPhotosUpload
                                    currentPhotos={[]}
                                    onPhotosChange={setGreenBookPhotos}
                                    maxPhotos={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <h4 className="block text-xs font-medium text-gray-500 mb-1">Insurance Photos (max 3)</h4>
                                <DocumentPhotosUpload
                                    currentPhotos={[]}
                                    onPhotosChange={setInsurancePhotos}
                                    maxPhotos={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <h4 className="block text-xs font-medium text-gray-500 mb-1">Tax Road Photos (max 3)</h4>
                                <DocumentPhotosUpload
                                    currentPhotos={[]}
                                    onPhotosChange={setTaxRoadPhotos}
                                    maxPhotos={3}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "details" && (
                    <div className="space-y-6">
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
                    </div>
                )}
            </Form>
        </div>
    );
}
