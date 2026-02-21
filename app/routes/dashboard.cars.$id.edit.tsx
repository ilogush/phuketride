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
import Card from "~/components/dashboard/Card";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import Toggle from "~/components/dashboard/Toggle";
import CarPhotosUpload from "~/components/dashboard/CarPhotosUpload";
import { useToast } from "~/lib/toast";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { carSchema } from "~/schemas/car";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { calculateSeasonalPrice, getAverageDays } from "~/lib/pricing";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const carId = Number(params.id);

    const car = await db.query.companyCars.findFirst({
        where: eq(schema.companyCars.id, carId),
        with: {
            template: {
                with: {
                    brand: true,
                    model: true,
                    bodyType: true,
                    fuelType: true,
                }
            },
            color: true,
            fuelType: true,
        }
    });

    if (!car) {
        throw new Response("Car not found", { status: 404 });
    }

    if (user.role !== "admin" && car.companyId !== user.companyId) {
        throw new Response("Access denied", { status: 403 });
    }

    const [templatesList, colorsList, seasonsList, durationsList, fuelTypesList] = await Promise.all([
        db.query.carTemplates.findMany({
            with: {
                brand: true,
                model: true,
                bodyType: true,
                fuelType: true,
            },
            limit: 100,
        }),
        db.select().from(schema.colors).limit(100),
        db.select().from(schema.seasons).limit(10),
        db.select().from(schema.rentalDurations).limit(10),
        db.select().from(schema.fuelTypes).limit(20),
    ]);

    return { car, templates: templatesList, colors: colorsList, seasons: seasonsList, durations: durationsList, fuelTypes: fuelTypesList, user };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();
    const carId = Number(params.id);

    const car = await db.query.companyCars.findFirst({
        where: eq(schema.companyCars.id, carId),
    });

    if (!car) {
        return redirect(`/cars?error=Car not found`);
    }

    if (user.role !== "admin" && car.companyId !== user.companyId) {
        return redirect(`/cars/${carId}?error=Access denied`);
    }

    const intent = formData.get("intent");

    if (intent === "archive" || intent === "delete") {
        const { deleteOrArchiveCar } = await import("~/lib/archive.server");
        const result = await deleteOrArchiveCar(context.cloudflare.env.DB, carId, car.companyId);
        
        if (result.success) {
            return redirect(`/cars?success=${encodeURIComponent(result.message || "Car updated successfully")}`);
        } else {
            return redirect(`/cars/${carId}/edit?error=${encodeURIComponent(result.message || result.error || "Failed to update car")}`);
        }
    }

    if (intent === "unarchive") {
        await db.update(schema.companyCars)
            .set({ archivedAt: null })
            .where(eq(schema.companyCars.id, carId));
        
        return redirect(`/cars/${carId}/edit?success=Car unarchived successfully`);
    }

    const rawData = {
        templateId: formData.get("templateId") ? Number(formData.get("templateId")) : (car.templateId || null),
        year: formData.get("year") ? Number(formData.get("year")) : car.year,
        colorId: Number(formData.get("colorId")) || car.colorId || 0,
        licensePlate: (formData.get("licensePlate") as string)?.toUpperCase() || car.licensePlate || "",
        transmission: (formData.get("transmission") as "automatic" | "manual") || car.transmission || "automatic",
        engineVolume: Number(formData.get("engineVolume")) || car.engineVolume || 0,
        fuelType: (formData.get("fuelType") as "petrol" | "diesel" | "electric" | "hybrid") || "petrol",
        status: (formData.get("status") as "available" | "rented" | "maintenance" | "booked") || car.status || "available",
        vin: (formData.get("vin") as string) || car.vin || null,
        currentMileage: Number(formData.get("currentMileage")) || car.mileage || 0,
        nextOilChangeMileage: Number(formData.get("nextOilChangeMileage")) || car.nextOilChangeMileage || 0,
        oilChangeInterval: Number(formData.get("oilChangeInterval")) || car.oilChangeInterval || 10000,
        pricePerDay: Number(formData.get("pricePerDay")) || car.pricePerDay || 0,
        deposit: Number(formData.get("deposit")) || car.deposit || 0,
        insuranceType: (formData.get("insuranceType") as string) || car.insuranceType || null,
        insuranceExpiry: (formData.get("insuranceExpiry") as string) || null,
        registrationExpiry: (formData.get("registrationExpiry") as string) || null,
        taxRoadExpiry: (formData.get("taxRoadExpiry") as string) || null,
        fullInsuranceMinDays: formData.get("fullInsuranceMinDays") ? Number(formData.get("fullInsuranceMinDays")) : null,
        minInsurancePrice: formData.get("fullInsuranceEnabled") === "true"
            ? (formData.get("minInsurancePrice") ? Number(formData.get("minInsurancePrice")) : car.minInsurancePrice)
            : null,
        maxInsurancePrice: formData.get("fullInsuranceEnabled") === "true"
            ? (formData.get("maxInsurancePrice") ? Number(formData.get("maxInsurancePrice")) : car.maxInsurancePrice)
            : null,
    };

    const validation = carSchema.safeParse(rawData);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return redirect(`/cars/${carId}/edit?error=${encodeURIComponent(firstError.message)}`);
    }

    const validData = validation.data;

    try {
        const fuelTypes = await db.select({
            id: schema.fuelTypes.id,
            name: schema.fuelTypes.name,
        }).from(schema.fuelTypes);
        const fuelType = fuelTypes.find((item) => item.name.toLowerCase() === validData.fuelType.toLowerCase());

        // Handle photos upload to R2
        const photosData = formData.get("photos") as string;
        let photoUrls: string[] = car.photos ? JSON.parse(car.photos as string) : [];
        
        if (photosData) {
            try {
                const photos = JSON.parse(photosData);
                if (Array.isArray(photos) && photos.length > 0) {
                    const { uploadToR2 } = await import("~/lib/r2.server");
                    const uploadedUrls = await Promise.all(
                        photos.map(async (photo: { base64: string; fileName: string }) => {
                            if (photo.base64.startsWith('/assets/') || photo.base64.startsWith('http')) {
                                return photo.base64; // Already uploaded
                            }
                            return await uploadToR2(context.cloudflare.env.ASSETS, photo.base64, `cars/${carId}/${photo.fileName}`);
                        })
                    );
                    photoUrls = uploadedUrls;
                }
            } catch (e) {
                console.error("Failed to upload photos:", e);
            }
        }

        await db.update(schema.companyCars)
            .set({
                templateId: validData.templateId,
                year: validData.year ?? null,
                colorId: validData.colorId,
                licensePlate: validData.licensePlate,
                transmission: validData.transmission,
                engineVolume: validData.engineVolume,
                fuelTypeId: fuelType?.id ?? null,
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
                photos: photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
            })
            .where(eq(schema.companyCars.id, carId));

        const metadata = getRequestMetadata(request);
        quickAudit({
            db,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: "car",
            entityId: carId,
            action: "update",
            afterState: { ...validData, id: carId },
            ...metadata,
        });

        return redirect(`/cars?success=${encodeURIComponent("Car updated successfully")}`);
    } catch (error: any) {
        console.error("Failed to update car:", error);
        if (error.message?.includes('UNIQUE constraint failed') && error.message?.includes('license_plate')) {
            return redirect(`/cars/${carId}/edit?error=${encodeURIComponent(`License plate "${validData.licensePlate}" is already in use`)}`);
        }
        return redirect(`/cars/${carId}/edit?error=${encodeURIComponent("Failed to update car")}`);
    }
}

export default function EditCarPage() {
    const { car, templates, colors, seasons, durations, fuelTypes } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const { validateLatinInput } = useLatinValidation();
    const [pricePerDay, setPricePerDay] = useState(car.pricePerDay || 0);
    const [currentMileage, setCurrentMileage] = useState(car.mileage || 0);
    const [nextOilChange, setNextOilChange] = useState(car.nextOilChangeMileage || 0);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(car.templateId);
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    const [photos, setPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [fullInsuranceEnabled, setFullInsuranceEnabled] = useState(
        Boolean((car.minInsurancePrice ?? 0) > 0 || (car.maxInsurancePrice ?? 0) > 0)
    );

    useEffect(() => {
        const error = searchParams.get("error");
        const success = searchParams.get("success");
        if (error) toast.error(error, 3000);
        if (success) toast.success(success, 3000);
    }, [searchParams, toast]);

    const formatDateInput = (date: Date | null) => {
        if (!date) return "";
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

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

    const kmUntilOilChange = nextOilChange - currentMileage;
    const isOilChangeDueSoon = kmUntilOilChange < 1000 && kmUntilOilChange >= 0;

    return (
        <div className="space-y-4">
            <PageHeader
                leftActions={<BackButton to={`/cars/${car.id}`} />}
                title="Edit Car"
                rightActions={
                    <div className="flex gap-2">
                        {car.archivedAt ? (
                            <Form method="post">
                                <input type="hidden" name="intent" value="unarchive" />
                                <Button type="submit" variant="primary">
                                    Unarchive
                                </Button>
                            </Form>
                        ) : (
                            <>
                                <Form method="post">
                                    <input type="hidden" name="intent" value="archive" />
                                    <Button type="submit" variant="secondary">
                                        Archive/Delete
                                    </Button>
                                </Form>
                                <Button type="submit" form="edit-car-form" variant="primary">
                                    Save
                                </Button>
                            </>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Form - Left Side */}
                <div className="lg:col-span-2">
                    <Form id="edit-car-form" method="post" className="bg-white rounded-3xl shadow-sm p-4">
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
                                        defaultValue={car.templateId}
                                        onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                                    />
                                    <Input
                                        label="License Plate"
                                        name="licensePlate"
                                        required
                                        defaultValue={car.licensePlate}
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
                                        defaultValue={car.colorId}
                                    />
                                    <Input
                                        label="Year"
                                        name="year"
                                        type="number"
                                        min={1900}
                                        max={new Date().getFullYear() + 1}
                                        defaultValue={car.year || ""}
                                    />
                                    <Input
                                        label="VIN Number"
                                        name="vin"
                                        maxLength={17}
                                        defaultValue={car.vin || ""}
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
                                            { id: "rented", name: "Rented" },
                                            { id: "maintenance", name: "Maintenance" },
                                            { id: "booked", name: "Booked" },
                                        ]}
                                        defaultValue={car.status || "available"}
                                    />
                                </div>
                            </div>

                            <input type="hidden" name="transmission" value={selectedTemplate?.transmission || car.transmission || 'automatic'} />
                            <input type="hidden" name="engineVolume" value={selectedTemplate?.engineVolume || car.engineVolume || 1.5} />
                            <input type="hidden" name="fuelType" value={(selectedTemplate?.fuelType?.name || car.fuelType?.name || 'Petrol').toLowerCase()} />

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
                                        defaultValue={car.insuranceType || ""}
                                    />
                                    <Input
                                        label="Insurance Expiry"
                                        name="insuranceExpiry"
                                        placeholder="DD-MM-YYYY"
                                        maxLength={10}
                                        defaultValue={formatDateInput(car.insuranceExpiryDate)}
                                    />
                                    <Input
                                        label="Registration Expiry"
                                        name="registrationExpiry"
                                        placeholder="DD-MM-YYYY"
                                        maxLength={10}
                                        defaultValue={formatDateInput(car.registrationExpiry)}
                                    />
                                    <Input
                                        label="Tax Road Expiry"
                                        name="taxRoadExpiry"
                                        placeholder="DD-MM-YYYY"
                                        maxLength={10}
                                        defaultValue={formatDateInput(car.taxRoadExpiryDate)}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Full Insurance</label>
                                        <div className="flex items-center justify-between px-4 border border-gray-200 rounded-xl h-[38px] bg-white">
                                            <span className="text-sm text-gray-900">{fullInsuranceEnabled ? "Enabled" : "Disabled"}</span>
                                            <Toggle enabled={fullInsuranceEnabled} onChange={setFullInsuranceEnabled} />
                                        </div>
                                    </div>
                                    <input type="hidden" name="fullInsuranceEnabled" value={fullInsuranceEnabled ? "true" : "false"} />
                                    {fullInsuranceEnabled && (
                                        <>
                                            <Input
                                                label="Min Insurance Price"
                                                name="minInsurancePrice"
                                                type="number"
                                                min={0}
                                                step={0.01}
                                                defaultValue={car.minInsurancePrice || ""}
                                                addonRight="฿"
                                            />
                                            <Input
                                                label="Max Insurance Price"
                                                name="maxInsurancePrice"
                                                type="number"
                                                min={0}
                                                step={0.01}
                                                defaultValue={car.maxInsurancePrice || ""}
                                                addonRight="฿"
                                            />
                                        </>
                                    )}
                                </div>
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
                                        defaultValue={car.oilChangeInterval || 10000}
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
                                        defaultValue={car.deposit || 0}
                                        addonRight="฿"
                                    />
                                </div>

                                <div className="mt-4">
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
                                </div>
                            </div>

                            <input type="hidden" name="photos" value={JSON.stringify(photos)} />
                        </div>
                    </Form>
                </div>

                {/* Sidebar - Right Side */}
                <div className="space-y-4">
                    {selectedTemplate && (
                        <Card>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Details</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Body Type</span>
                                    <span className="text-sm font-medium text-gray-900">{selectedTemplate.bodyType?.name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Transmission</span>
                                    <span className="text-sm font-medium text-gray-900 capitalize">{selectedTemplate.transmission || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Engine</span>
                                    <span className="text-sm font-medium text-gray-900">{selectedTemplate.engineVolume}L</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Seats</span>
                                    <span className="text-sm font-medium text-gray-900">{selectedTemplate.seats}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Doors</span>
                                    <span className="text-sm font-medium text-gray-900">{selectedTemplate.doors}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Fuel Type</span>
                                    <span className="text-sm font-medium text-gray-900">{selectedTemplate.fuelType?.name || 'N/A'}</span>
                                </div>
                            </div>
                        </Card>
                    )}

                    <Card>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Photos</h2>
                        <CarPhotosUpload
                            currentPhotos={car.photos ? JSON.parse(car.photos as string) : []}
                            onPhotosChange={setPhotos}
                            maxPhotos={6}
                        />
                    </Card>
                </div>
            </div>
        </div>
    );
}
