import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
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
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { calculateSeasonalPrice, getAverageDays } from "~/lib/pricing";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const [templatesList, colorsList, seasonsList, durationsList, fuelTypesList] = await Promise.all([
        context.cloudflare.env.DB.prepare(`
            SELECT
                ct.*,
                cb.name AS brandName,
                cm.name AS modelName,
                bt.name AS bodyTypeName,
                ft.name AS fuelTypeName
            FROM car_templates ct
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            LEFT JOIN body_types bt ON bt.id = ct.body_type_id
            LEFT JOIN fuel_types ft ON ft.id = ct.fuel_type_id
            LIMIT 100
        `).all().then((r: any) => (r.results || []).map((t: any) => ({
            ...t,
            brand: { name: t.brandName },
            model: { name: t.modelName },
            bodyType: { name: t.bodyTypeName },
            fuelType: { name: t.fuelTypeName },
            engineVolume: t.engine_volume,
        }))),
        context.cloudflare.env.DB.prepare("SELECT * FROM colors LIMIT 100").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT * FROM seasons LIMIT 10").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT * FROM rental_durations LIMIT 10").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT * FROM fuel_types LIMIT 20").all().then((r: any) => r.results || []),
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
    const formData = await request.formData();

    const companyId = user.companyId!;
    
    // Parse form data
    const rawData = {
        templateId: formData.get("templateId") ? Number(formData.get("templateId")) : null,
        colorId: Number(formData.get("colorId")) || 0,
        licensePlate: (formData.get("licensePlate") as string)?.toUpperCase() || "",
        transmission: formData.get("transmission") as "automatic" | "manual",
        engineVolume: Number(formData.get("engineVolume")) || 0,
        fuelType: formData.get("fuelType") as "petrol" | "diesel" | "electric" | "hybrid",
        status: (formData.get("status") as "available" | "rented" | "maintenance" | "booked") || "available",
        vin: (formData.get("vin") as string) || null,
        currentMileage: Number(formData.get("currentMileage")) || 0,
        nextOilChangeMileage: Number(formData.get("nextOilChangeMileage")) || 0,
        oilChangeInterval: Number(formData.get("oilChangeInterval")) || 10000,
        pricePerDay: Number(formData.get("pricePerDay")) || 0,
        deposit: Number(formData.get("deposit")) || 0,
        insuranceType: (formData.get("insuranceType") as string) || null,
        insuranceExpiry: (formData.get("insuranceExpiry") as string) || null,
        registrationExpiry: (formData.get("registrationExpiry") as string) || null,
        taxRoadExpiry: (formData.get("taxRoadExpiry") as string) || null,
        fullInsuranceMinDays: formData.get("fullInsuranceMinDays") ? Number(formData.get("fullInsuranceMinDays")) : null,
        minInsurancePrice: formData.get("fullInsuranceEnabled") === "true"
            ? (formData.get("minInsurancePrice") ? Number(formData.get("minInsurancePrice")) : null)
            : null,
        maxInsurancePrice: formData.get("fullInsuranceEnabled") === "true"
            ? (formData.get("maxInsurancePrice") ? Number(formData.get("maxInsurancePrice")) : null)
            : null,
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
        const fuelTypesResult = await context.cloudflare.env.DB
            .prepare("SELECT id, name FROM fuel_types")
            .all() as { results?: any[] };
        const fuelTypes = fuelTypesResult.results || [];
        const fuelType = fuelTypes.find((item) => item.name.toLowerCase() === validData.fuelType.toLowerCase());

        // Handle photos upload to R2
        const photosData = formData.get("photos") as string;
        let photoUrls: string[] = [];
        
        if (photosData && photosData !== "[]") {
            try {
                const photos = JSON.parse(photosData);
                
                if (Array.isArray(photos) && photos.length > 0) {
                    const { uploadToR2 } = await import("~/lib/r2.server");
                    const tempId = Date.now();
                    photoUrls = await Promise.all(
                        photos.map(async (photo: { base64: string; fileName: string }) => {
                            return await uploadToR2(context.cloudflare.env.ASSETS, photo.base64, `cars/${tempId}/${photo.fileName}`);
                        })
                    );
                }
            } catch {
            }
        }

        const insertResult = await context.cloudflare.env.DB
            .prepare(`
                INSERT INTO company_cars (
                    company_id, template_id, color_id, license_plate, transmission, engine_volume, fuel_type_id,
                    vin, status, mileage, next_oil_change_mileage, oil_change_interval, price_per_day, deposit,
                    insurance_type, insurance_expiry_date, registration_expiry, tax_road_expiry_date,
                    min_insurance_price, max_insurance_price, marketing_headline, description, photos, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
                companyId,
                validData.templateId,
                validData.colorId,
                validData.licensePlate,
                validData.transmission,
                validData.engineVolume,
                fuelType?.id ?? null,
                validData.vin,
                validData.status,
                validData.currentMileage,
                validData.nextOilChangeMileage,
                validData.oilChangeInterval,
                validData.pricePerDay,
                validData.deposit,
                validData.insuranceType,
                validData.insuranceExpiry ? new Date(validData.insuranceExpiry.split('-').reverse().join('-')).toISOString() : null,
                validData.registrationExpiry ? new Date(validData.registrationExpiry.split('-').reverse().join('-')).toISOString() : null,
                validData.taxRoadExpiry ? new Date(validData.taxRoadExpiry.split('-').reverse().join('-')).toISOString() : null,
                validData.minInsurancePrice,
                validData.maxInsurancePrice,
                marketingHeadline,
                description,
                photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
                new Date().toISOString(),
                new Date().toISOString()
            )
            .run();
        const newCar = { id: Number(insertResult.meta.last_row_id) };

        // Audit log
        const metadata = getRequestMetadata(request);
        quickAudit({
            db: context.cloudflare.env.DB,
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
            toast.error(error, 3000);
        }
    }, [searchParams, toast]);

    // Format date for input (DD-MM-YYYY)
    const formatDateInput = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    // Get template display name
    const getTemplateName = (template: any) => {
        const brand = template.brand?.name || 'Unknown';
        const model = template.model?.name || 'Unknown';
        const engine = template.engineVolume ? `${template.engineVolume}L` : '';
        const fuel = template.fuelType?.name || '';
        
        let name = `${brand} ${model}`;
        if (engine) name += ` ${engine}`;
        if (fuel) name += ` ${fuel}`;
        
        return name;
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

            <Form id="create-car-form" method="post" className="bg-white rounded-3xl shadow-sm p-4">
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Specifications</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    </div>

                    {selectedTemplate && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-2">Template Details:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><span className="text-gray-500">Body Type:</span> <span className="font-medium">{selectedTemplate.bodyType?.name || 'N/A'}</span></div>
                                <div><span className="text-gray-500">Transmission:</span> <span className="font-medium capitalize">{selectedTemplate.transmission || 'N/A'}</span></div>
                                <div><span className="text-gray-500">Engine:</span> <span className="font-medium">{selectedTemplate.engineVolume}L</span></div>
                                <div><span className="text-gray-500">Seats:</span> <span className="font-medium">{selectedTemplate.seats}</span></div>
                                <div><span className="text-gray-500">Doors:</span> <span className="font-medium">{selectedTemplate.doors}</span></div>
                                <div><span className="text-gray-500">Fuel Type:</span> <span className="font-medium">{selectedTemplate.fuelType?.name || 'N/A'}</span></div>
                            </div>
                        </div>
                    )}

                    <input type="hidden" name="transmission" value={selectedTemplate?.transmission || 'automatic'} />
                    <input type="hidden" name="engineVolume" value={selectedTemplate?.engineVolume || 1.5} />
                    <input type="hidden" name="fuelType" value={(selectedTemplate?.fuelType?.name || 'Petrol').toLowerCase()} />
                    <input type="hidden" name="photos" value={JSON.stringify(photos)} />

                    <div className="space-y-2">
                        <h4 className="block text-xs font-medium text-gray-500 mb-1">Car Photos (max 12)</h4>
                        <CarPhotosUpload
                            currentPhotos={[]}
                            onPhotosChange={setPhotos}
                            maxPhotos={12}
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Maintenance</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    </div>

                    <div className="pt-4 border-t border-gray-100 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Pricing</h3>
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
                                                                const avgDays = getAverageDays(duration);
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

                    <div className="pt-4 border-t border-gray-100 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Insurance</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Full Insurance</label>
                                <div className="flex items-center justify-between px-4 border border-gray-200 rounded-xl h-[38px] bg-white">
                                    <span className="text-sm text-gray-900">{fullInsuranceEnabled ? "Enabled" : "Disabled"}</span>
                                    <Toggle enabled={fullInsuranceEnabled} onChange={setFullInsuranceEnabled} />
                                </div>
                            </div>
                            <input type="hidden" name="fullInsuranceEnabled" value={fullInsuranceEnabled ? "true" : "false"} />
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

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

                    <div className="pt-4 border-t border-gray-100 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Details</h3>
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
                </div>
            </Form>
        </div>
    );
}
