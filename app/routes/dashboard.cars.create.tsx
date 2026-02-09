import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { useState } from "react";
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

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const [templatesList, colorsList, seasonsList, durationsList, brandsList, modelsList, bodyTypesList] = await Promise.all([
        db.select().from(schema.carTemplates).limit(100),
        db.select().from(schema.colors).limit(100),
        db.select().from(schema.seasons).where(eq(schema.seasons.companyId, user.companyId!)).limit(10),
        db.select().from(schema.rentalDurations).where(eq(schema.rentalDurations.companyId, user.companyId!)).limit(10),
        db.select().from(schema.carBrands).limit(100),
        db.select().from(schema.carModels).limit(200),
        db.select().from(schema.bodyTypes).limit(50),
    ]);

    return { 
        templates: templatesList, 
        colors: colorsList, 
        seasons: seasonsList, 
        durations: durationsList,
        brands: brandsList,
        models: modelsList,
        bodyTypes: bodyTypesList,
        user 
    };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    const companyId = user.companyId!;
    
    // Parse all form fields
    const templateId = Number(formData.get("templateId"));
    const colorId = Number(formData.get("colorId"));
    const licensePlate = (formData.get("licensePlate") as string).toUpperCase();
    const productionYear = Number(formData.get("productionYear"));
    const transmission = formData.get("transmission") as string;
    const engineVolume = Number(formData.get("engineVolume"));
    const fuelType = formData.get("fuelType") as string;
    const status = formData.get("status") as string;
    const vin = formData.get("vin") as string;
    
    // Maintenance fields
    const mileage = Number(formData.get("currentMileage"));
    const nextOilChangeMileage = Number(formData.get("nextOilChangeMileage"));
    const oilChangeInterval = Number(formData.get("oilChangeInterval")) || 10000;
    const dailyMileageLimit = formData.get("dailyMileageLimit") ? Number(formData.get("dailyMileageLimit")) : null;
    
    // Pricing fields
    const pricePerDay = Number(formData.get("pricePerDay"));
    const deposit = Number(formData.get("deposit"));
    
    // Insurance fields
    const insuranceType = formData.get("insuranceType") as string || null;
    const insuranceExpiry = formData.get("insuranceExpiry") as string || null;
    const registrationExpiry = formData.get("registrationExpiry") as string || null;
    const taxRoadExpiry = formData.get("taxRoadExpiry") as string || null;
    const fullInsuranceMinDays = formData.get("fullInsuranceMinDays") ? Number(formData.get("fullInsuranceMinDays")) : null;
    const minInsurancePrice = formData.get("minInsurancePrice") ? Number(formData.get("minInsurancePrice")) : null;
    const maxInsurancePrice = formData.get("maxInsurancePrice") ? Number(formData.get("maxInsurancePrice")) : null;
    
    // Details fields
    const marketingHeadline = formData.get("marketingHeadline") as string || null;
    const description = formData.get("description") as string || null;

    try {
        await db.insert(schema.companyCars).values({
            companyId,
            templateId,
            colorId,
            licensePlate,
            year: productionYear,
            transmission,
            engineVolume,
            fuelTypeId: null, // TODO: map fuelType to fuelTypeId
            vin: vin || null,
            status,
            mileage,
            nextOilChangeMileage,
            oilChangeInterval,
            pricePerDay,
            deposit,
            insuranceType,
            insuranceExpiryDate: insuranceExpiry ? new Date(insuranceExpiry.split('-').reverse().join('-')) : null,
            registrationExpiry: registrationExpiry ? new Date(registrationExpiry.split('-').reverse().join('-')) : null,
            taxRoadExpiryDate: taxRoadExpiry ? new Date(taxRoadExpiry.split('-').reverse().join('-')) : null,
            minInsurancePrice,
            maxInsurancePrice,
            marketingHeadline,
            description,
        });

        return redirect("/dashboard/cars");
    } catch (error: any) {
        // Handle duplicate license plate error
        if (error.message?.includes('UNIQUE constraint failed') && error.message?.includes('license_plate')) {
            throw new Error(`License plate "${licensePlate}" is already in use. Please use a different license plate.`);
        }
        throw error;
    }
}

export default function CreateCarPage() {
    const { templates, colors, seasons, durations, brands, models, bodyTypes } = useLoaderData<typeof loader>();
    const [activeTab, setActiveTab] = useState("specifications");
    const [photos, setPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [pricePerDay, setPricePerDay] = useState(2343);
    const [fullInsuranceEnabled, setFullInsuranceEnabled] = useState(false);
    const [greenBookPhotos, setGreenBookPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [insurancePhotos, setInsurancePhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [taxRoadPhotos, setTaxRoadPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [currentMileage, setCurrentMileage] = useState(20321);
    const [nextOilChange, setNextOilChange] = useState(27986);

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
        const brand = brands.find(b => b.id === template.brandId);
        const model = models.find(m => m.id === template.modelId);
        const bodyType = bodyTypes.find(bt => bt.id === template.bodyTypeId);
        return `${brand?.name || 'Unknown'} ${model?.name || 'Unknown'} - ${bodyType?.name || 'Unknown'}`;
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Select
                                label="Car Template"
                                name="templateId"
                                required
                                options={templates.map(t => ({
                                    id: t.id,
                                    name: getTemplateName(t)
                                }))}
                                placeholder="Select a template"
                            />
                            <Input
                                label="License Plate"
                                name="licensePlate"
                                required
                                placeholder="ABC-1234"
                                defaultValue="UY-6787"
                            />
                            <Input
                                label="Production Year"
                                name="productionYear"
                                type="number"
                                min={1900}
                                max={2027}
                                required
                                placeholder="e.g. 2024"
                                defaultValue="2026"
                            />
                            <Select
                                label="Color"
                                name="colorId"
                                required
                                options={colors}
                                placeholder="Select color"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Select
                                label="Transmission"
                                name="transmission"
                                required
                                options={[
                                    { id: "Automatic", name: "Automatic" },
                                    { id: "Manual", name: "Manual" },
                                    { id: "CVT", name: "CVT" },
                                ]}
                                defaultValue="Automatic"
                            />
                            <Input
                                label="Engine Volume (L)"
                                name="engineVolume"
                                type="number"
                                step={0.1}
                                min={0.5}
                                max={10}
                                required
                                placeholder="e.g. 1.5"
                                defaultValue="1.5"
                            />
                            <Select
                                label="Fuel Type"
                                name="fuelType"
                                required
                                options={[
                                    { id: "Gasoline", name: "Gasoline" },
                                    { id: "Diesel", name: "Diesel" },
                                    { id: "Hybrid", name: "Hybrid" },
                                    { id: "Electric", name: "Electric" },
                                    { id: "LPG", name: "LPG" },
                                ]}
                                defaultValue="Gasoline"
                            />
                            <Select
                                label="Status"
                                name="status"
                                required
                                options={[
                                    { id: "available", name: "Available" },
                                    { id: "maintenance", name: "Maintenance" },
                                    { id: "rented", name: "Rented" },
                                ]}
                                defaultValue="available"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Input
                                label="VIN Number"
                                name="vin"
                                maxLength={17}
                                className="font-mono"
                                placeholder="Optional"
                                defaultValue="7X7I4EIQ2OMQRU9SW"
                            />
                        </div>

                        <div className="space-y-2">
                            <h4 className="block text-xs font-medium text-gray-500 mb-1">Car Photos (max 12)</h4>
                            <CarPhotosUpload
                                currentPhotos={[]}
                                onPhotosChange={setPhotos}
                                maxPhotos={12}
                            />
                        </div>
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
