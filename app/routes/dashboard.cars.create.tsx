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
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Car Template *</label>
                                <select
                                    name="templateId"
                                    required
                                    className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors"
                                >
                                    <option value="">Select a template</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {getTemplateName(t)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">License Plate *</label>
                                <input
                                    name="licensePlate"
                                    required
                                    className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors"
                                    placeholder="ABC-1234"
                                    type="text"
                                    defaultValue="UY-6787"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Production Year *</label>
                                <input
                                    name="productionYear"
                                    min="1900"
                                    max="2027"
                                    className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors"
                                    placeholder="e.g. 2024"
                                    required
                                    type="number"
                                    defaultValue="2026"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Color *</label>
                                <select
                                    name="colorId"
                                    required
                                    className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors"
                                >
                                    <option value="">Select color</option>
                                    {colors.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Transmission *</label>
                                <select
                                    name="transmission"
                                    required
                                    className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors"
                                >
                                    <option value="Automatic">Automatic</option>
                                    <option value="Manual">Manual</option>
                                    <option value="CVT">CVT</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Engine Volume (L) *</label>
                                <input
                                    name="engineVolume"
                                    step="0.1"
                                    min="0.5"
                                    max="10"
                                    required
                                    className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors"
                                    placeholder="e.g. 1.5"
                                    type="number"
                                    defaultValue="1.5"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Fuel Type *</label>
                                <select
                                    name="fuelType"
                                    required
                                    className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors"
                                >
                                    <option value="Gasoline">Gasoline</option>
                                    <option value="Diesel">Diesel</option>
                                    <option value="Hybrid">Hybrid</option>
                                    <option value="Electric">Electric</option>
                                    <option value="LPG">LPG</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Status *</label>
                                <select
                                    name="status"
                                    required
                                    className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors"
                                >
                                    <option value="available">Available</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="rented">Rented</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">VIN Number</label>
                                <input
                                    name="vin"
                                    maxLength={17}
                                    className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors font-mono"
                                    placeholder="Optional"
                                    type="text"
                                    defaultValue="7X7I4EIQ2OMQRU9SW"
                                />
                            </div>
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
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Daily Mileage Limit</label>
                                <div className="relative">
                                    <input
                                        name="dailyMileageLimit"
                                        min="0"
                                        className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors pr-16"
                                        placeholder="Optional"
                                        type="number"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">km/day</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Current Mileage *</label>
                                <div className="relative">
                                    <input
                                        name="currentMileage"
                                        required
                                        min="0"
                                        className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors pr-8"
                                        placeholder="0"
                                        type="number"
                                        value={currentMileage}
                                        onChange={(e) => setCurrentMileage(Number(e.target.value))}
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">km</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Next Oil Change Mileage *</label>
                                <div className="relative">
                                    <input
                                        name="nextOilChangeMileage"
                                        min="0"
                                        className={`block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors pr-8 ${
                                            isOilChangeDueSoon ? 'bg-gray-100 font-bold' : 'bg-white'
                                        }`}
                                        placeholder="e.g. 50000"
                                        required
                                        type="number"
                                        value={nextOilChange}
                                        onChange={(e) => setNextOilChange(Number(e.target.value))}
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">km</span>
                                </div>
                                {isOilChangeDueSoon && (
                                    <div className="mt-2 flex items-center gap-2 text-orange-600 animate-pulse">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                        </svg>
                                        <span className="text-xs font-medium">Maintenance Due Soon! ({kmUntilOilChange} km left)</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Oil Change Interval (km)</label>
                                <div className="relative">
                                    <input
                                        name="oilChangeInterval"
                                        min="1000"
                                        step="1000"
                                        className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors pr-8"
                                        placeholder="10000"
                                        type="number"
                                        defaultValue="10000"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">km</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "pricing" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Price per Day *</label>
                                <div className="relative">
                                    <input
                                        name="pricePerDay"
                                        min="0"
                                        className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors pr-8"
                                        placeholder="0.00"
                                        type="number"
                                        value={pricePerDay}
                                        onChange={(e) => setPricePerDay(Number(e.target.value))}
                                        required
                                        step="0.01"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">฿</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Deposit *</label>
                                <div className="relative">
                                    <input
                                        name="deposit"
                                        required
                                        min="0"
                                        className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors pr-8"
                                        placeholder="0.00"
                                        type="number"
                                        defaultValue="13330"
                                        step="0.01"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">฿</span>
                                </div>
                            </div>
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
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Insurance Type</label>
                                <select
                                    name="insuranceType"
                                    className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors"
                                >
                                    <option value="">Select Insurance Type</option>
                                    <option value="Business Insurance">Business Insurance</option>
                                    <option value="First Class Insurance">First Class Insurance</option>
                                </select>
                            </div>
                            <div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1.5">Insurance Expiry</label>
                                    <input
                                        name="insuranceExpiry"
                                        placeholder="DD-MM-YYYY"
                                        maxLength={10}
                                        className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-700 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors placeholder:text-xs placeholder:text-gray-500"
                                        type="text"
                                        defaultValue={formatDateInput(new Date(new Date().setFullYear(new Date().getFullYear() + 3)))}
                                    />
                                </div>
                            </div>
                            <div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1.5">Registration Expiry</label>
                                    <input
                                        name="registrationExpiry"
                                        placeholder="DD-MM-YYYY"
                                        maxLength={10}
                                        className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-700 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors placeholder:text-xs placeholder:text-gray-500"
                                        type="text"
                                        defaultValue={formatDateInput(new Date(new Date().setFullYear(new Date().getFullYear() + 1)))}
                                    />
                                </div>
                            </div>
                            <div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1.5">Tax Road Expiry</label>
                                    <input
                                        name="taxRoadExpiry"
                                        placeholder="DD-MM-YYYY"
                                        maxLength={10}
                                        className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-700 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors placeholder:text-xs placeholder:text-gray-500"
                                        type="text"
                                        defaultValue={formatDateInput(new Date(new Date().setFullYear(new Date().getFullYear() + 3)))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Full Insurance</label>
                                <div className="flex items-center justify-between px-4 border border-gray-200 rounded-xl h-[38px] bg-white">
                                    <span className="text-sm text-gray-900">Enabled</span>
                                    <button
                                        type="button"
                                        onClick={() => setFullInsuranceEnabled(!fullInsuranceEnabled)}
                                        className={`relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 h-5 w-9 ${
                                            fullInsuranceEnabled ? 'bg-gray-800' : 'bg-gray-200'
                                        }`}
                                        role="switch"
                                        aria-checked={fullInsuranceEnabled}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out h-4 w-4 ${
                                                fullInsuranceEnabled ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                            {fullInsuranceEnabled && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Min Days</label>
                                        <input
                                            name="fullInsuranceMinDays"
                                            min="1"
                                            step="1"
                                            className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors"
                                            placeholder="5"
                                            type="number"
                                            defaultValue="5"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Price (short term)</label>
                                        <div className="relative">
                                            <input
                                                name="minInsurancePrice"
                                                min="0"
                                                step="0.01"
                                                className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors pr-8"
                                                placeholder="0.00"
                                                type="number"
                                                defaultValue="500"
                                            />
                                            <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">฿</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Price (long term)</label>
                                        <div className="relative">
                                            <input
                                                name="maxInsurancePrice"
                                                min="0"
                                                step="0.01"
                                                className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors pr-8"
                                                placeholder="0.00"
                                                type="number"
                                                defaultValue="300"
                                            />
                                            <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">฿</span>
                                        </div>
                                    </div>
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
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Marketing Headline</label>
                            <input
                                name="marketingHeadline"
                                className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors"
                                placeholder="e.g. Perfect for city trips"
                                type="text"
                                defaultValue="Comfortable Long-Distance Cruiser"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                            <textarea
                                name="description"
                                rows={4}
                                className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-400 transition-colors"
                                placeholder="Optional description"
                                defaultValue="Spacious trunk and comfortable seating"
                            />
                        </div>
                    </div>
                )}
            </Form>
        </div>
    );
}
