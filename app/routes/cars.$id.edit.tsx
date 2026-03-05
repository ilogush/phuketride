import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { useEffect, useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import AdminCard from "~/components/dashboard/AdminCard";
import FormSection from "~/components/dashboard/FormSection";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import Toggle from "~/components/dashboard/Toggle";
import CarPhotosUpload from "~/components/dashboard/CarPhotosUpload";
import { useUrlToast } from "~/lib/useUrlToast";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { carSchema } from "~/schemas/car";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { ExclamationTriangleIcon, TruckIcon, PhotoIcon, WrenchScrewdriverIcon, AdjustmentsHorizontalIcon, ShieldCheckIcon, BanknotesIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { calculateSeasonalPrice, getAverageDays } from "~/lib/pricing";
import { uploadToR2 } from "~/lib/r2.server";
import { getCarPhotoUrls } from "~/lib/car-photos";
import { QUERY_LIMITS } from "~/lib/query-limits";
import { getCachedColors, getCachedFuelTypes } from "~/lib/dictionaries-cache.server";
import { parseWithSchema } from "~/lib/validation.server";

interface TemplateQueryRow {
    id: number;
    brandName: string | null;
    modelName: string | null;
    bodyTypeName: string | null;
    fuelTypeName: string | null;
    engine_volume: number | null;
    transmission: string | null;
    seats: number | null;
    doors: number | null;
}

interface CarTemplateOption {
    id: number;
    brand?: { name?: string | null };
    model?: { name?: string | null };
    bodyType?: { name?: string | null };
    fuelType?: { name?: string | null };
    engineVolume?: number | null;
    transmission?: string | null;
    seats?: number | null;
    doors?: number | null;
    drivetrain?: string | null;
    luggage_capacity?: string | null;
    rear_camera?: number | null;
    bluetooth_enabled?: number | null;
    carplay_enabled?: number | null;
    android_auto_enabled?: number | null;
    feature_air_conditioning?: number | null;
    feature_abs?: number | null;
    feature_airbags?: number | null;
}

interface FuelTypeRow {
    id: number;
    name: string;
}

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const carId = Number(params.id);
    if (!Number.isFinite(carId) || carId <= 0) {
        throw new Response("Invalid car id", { status: 400 });
    }

    const carRaw = await context.cloudflare.env.DB
        .prepare(`
            SELECT
                cc.*,
                ct.drivetrain AS templateDrivetrain,
                ct.luggage_capacity AS templateLuggageCapacity,
                ct.rear_camera AS templateRearCamera,
                ct.bluetooth_enabled AS templateBluetoothEnabled,
                ct.carplay_enabled AS templateCarplayEnabled,
                ct.android_auto_enabled AS templateAndroidAutoEnabled,
                ct.feature_air_conditioning AS templateFeatureAirConditioning,
                ct.feature_abs AS templateFeatureAbs,
                ct.feature_airbags AS templateFeatureAirbags,
                cb.name AS brandName,
                cm.name AS modelName,
                bt.name AS bodyTypeName,
                ft.name AS templateFuelTypeName,
                c.name AS colorName
            FROM company_cars cc
            LEFT JOIN car_templates ct ON ct.id = cc.template_id
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            LEFT JOIN body_types bt ON bt.id = ct.body_type_id
            LEFT JOIN fuel_types ft ON ft.id = ct.fuel_type_id
            LEFT JOIN colors c ON c.id = cc.color_id
            WHERE cc.id = ?
            LIMIT 1
        `)
        .bind(carId)
        .first() as (Record<string, unknown> & {
            company_id: number;
            template_id: number | null;
            color_id: number | null;
            license_plate: string | null;
            price_per_day: number | null;
            insurance_type: string | null;
            insurance_expiry_date: string | null;
            registration_expiry: string | null;
            tax_road_expiry_date: string | null;
            next_oil_change_mileage: number | null;
            oil_change_interval: number | null;
            insurance_price_per_day: number | null;
            max_insurance_price: number | null;
            min_rental_days: number | null;
            archived_at: string | null;
            brandName: string | null;
            modelName: string | null;
            bodyTypeName: string | null;
            templateFuelTypeName: string | null;
            colorName: string | null;
            engine_volume: number | null;
            transmission: string | null;
            seats: number | null;
            doors: number | null;
            mileage: number | null;
            year: number | null;
            status: "available" | "rented" | "maintenance" | "booked" | null;
            deposit: number | null;
            photos: string | null;
            fuelType: { name?: string | null } | null;
            templateDrivetrain: string | null;
            templateLuggageCapacity: string | null;
            templateRearCamera: number | null;
            templateBluetoothEnabled: number | null;
            templateCarplayEnabled: number | null;
            templateAndroidAutoEnabled: number | null;
            templateFeatureAirConditioning: number | null;
            templateFeatureAbs: number | null;
            templateFeatureAirbags: number | null;
        }) | null;

    if (!carRaw) {
        throw new Response("Car not found", { status: 404 });
    }

    if (user.role !== "admin" && carRaw.company_id !== user.companyId) {
        throw new Response("Access denied", { status: 403 });
    }

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
            LIMIT ${QUERY_LIMITS.LARGE}
        `).all().then((r: { results?: TemplateQueryRow[] }) => (r.results || []).map((t) => ({
            ...t,
            brand: { name: t.brandName },
            model: { name: t.modelName },
            bodyType: { name: t.bodyTypeName },
            fuelType: { name: t.fuelTypeName },
            engineVolume: t.engine_volume,
        }))),
        getCachedColors(context.cloudflare.env.DB),
        context.cloudflare.env.DB.prepare(`
            SELECT
                id,
                season_name AS seasonName,
                start_month AS startMonth,
                start_day AS startDay,
                end_month AS endMonth,
                end_day AS endDay,
                price_multiplier AS priceMultiplier,
                discount_label AS discountLabel
            FROM seasons
            ORDER BY price_multiplier DESC
            LIMIT ${QUERY_LIMITS.SMALL}
        `).all().then((r: { results?: Array<Record<string, unknown>> }) => r.results || []),
        context.cloudflare.env.DB.prepare(`
            SELECT
                id,
                range_name AS rangeName,
                min_days AS minDays,
                max_days AS maxDays,
                price_multiplier AS priceMultiplier,
                discount_label AS discountLabel
            FROM rental_durations
            ORDER BY min_days ASC
            LIMIT ${QUERY_LIMITS.SMALL}
        `).all().then((r: { results?: Array<Record<string, unknown>> }) => r.results || []),
        getCachedFuelTypes(context.cloudflare.env.DB),
    ]);

    const car = {
        ...carRaw,
        companyId: carRaw.company_id,
        templateId: carRaw.template_id,
        colorId: carRaw.color_id,
        licensePlate: carRaw.license_plate,
        transmission: carRaw.transmission,
        engineVolume: carRaw.engine_volume,
        status: carRaw.status,
        deposit: carRaw.deposit,
        photos: carRaw.photos,
        pricePerDay: carRaw.price_per_day,
        insuranceType: carRaw.insurance_type,
        insuranceExpiryDate: carRaw.insurance_expiry_date,
        registrationExpiry: carRaw.registration_expiry,
        taxRoadExpiryDate: carRaw.tax_road_expiry_date,
        nextOilChangeMileage: carRaw.next_oil_change_mileage,
        oilChangeInterval: carRaw.oil_change_interval,
        insurancePricePerDay: carRaw.insurance_price_per_day,
        maxInsurancePrice: carRaw.max_insurance_price,
        minRentalDays: carRaw.min_rental_days,
        archivedAt: carRaw.archived_at,
        template: {
            brand: { name: carRaw.brandName },
            model: { name: carRaw.modelName },
            bodyType: { name: carRaw.bodyTypeName },
            fuelType: { name: carRaw.templateFuelTypeName },
            engineVolume: carRaw.engine_volume,
            transmission: carRaw.transmission,
            seats: carRaw.seats,
            doors: carRaw.doors,
            drivetrain: carRaw.templateDrivetrain,
            luggageCapacity: carRaw.templateLuggageCapacity,
            rearCamera: Number(carRaw.templateRearCamera || 0),
            bluetoothEnabled: Number(carRaw.templateBluetoothEnabled || 0),
            carplayEnabled: Number(carRaw.templateCarplayEnabled || 0),
            androidAutoEnabled: Number(carRaw.templateAndroidAutoEnabled || 0),
            featureAirConditioning: Number(carRaw.templateFeatureAirConditioning || 0),
            featureAbs: Number(carRaw.templateFeatureAbs || 0),
            featureAirbags: Number(carRaw.templateFeatureAirbags || 0),
        },
        color: { name: carRaw.colorName },
    };

    return { car, templates: templatesList, colors: colorsList, seasons: seasonsList, durations: durationsList, fuelTypes: fuelTypesList, user };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const requestUrl = new URL(request.url);
    const modCompanyIdParam = requestUrl.searchParams.get("modCompanyId");
    const hasModCompanyId = !!modCompanyIdParam && Number.isFinite(Number(modCompanyIdParam)) && Number(modCompanyIdParam) > 0;
    const modCompanyQuery = hasModCompanyId ? `?modCompanyId=${Number(modCompanyIdParam)}` : "";
    const withModCompany = (path: string) => {
        if (!hasModCompanyId) return path;
        const separator = path.includes("?") ? "&" : "?";
        return `${path}${separator}modCompanyId=${Number(modCompanyIdParam)}`;
    };
    const formData = await request.formData();
    const carId = Number(params.id);
    if (!Number.isFinite(carId) || carId <= 0) {
        return redirect(withModCompany(`/cars?error=${encodeURIComponent("Invalid car id")}`));
    }

    const car = await context.cloudflare.env.DB
        .prepare(`
            SELECT
                id, company_id, template_id, year, color_id, license_plate, transmission, engine_volume,
                status, mileage, next_oil_change_mileage, oil_change_interval, price_per_day, deposit,
                insurance_type, insurance_expiry_date, registration_expiry, tax_road_expiry_date,
                insurance_price_per_day, max_insurance_price, min_rental_days, photos
            FROM company_cars
            WHERE id = ?
            LIMIT 1
        `)
        .bind(carId)
        .first() as {
            id: number;
            company_id: number;
            template_id: number | null;
            year: number | null;
            color_id: number | null;
            license_plate: string | null;
            transmission: "automatic" | "manual" | null;
            engine_volume: number | null;
            status: "available" | "rented" | "maintenance" | "booked" | null;
            mileage: number | null;
            next_oil_change_mileage: number | null;
            oil_change_interval: number | null;
            price_per_day: number | null;
            deposit: number | null;
            insurance_type: string | null;
            insurance_expiry_date: string | null;
            registration_expiry: string | null;
            tax_road_expiry_date: string | null;
            insurance_price_per_day: number | null;
            max_insurance_price: number | null;
            min_rental_days: number | null;
            photos: string | null;
        } | null;

    if (!car) {
        return redirect(withModCompany(`/cars?error=Car not found`));
    }
    if (user.role !== "admin" && car.company_id !== user.companyId) {
        return redirect(withModCompany(`/cars/${carId}?error=Access denied`));
    }

    const intent = formData.get("intent");
    if (intent === "archive" || intent === "delete") {
        const { deleteOrArchiveCar } = await import("~/lib/archive.server");
        const result = await deleteOrArchiveCar(context.cloudflare.env.DB, carId, car.company_id);
        if (result.success) {
            return redirect(withModCompany(`/cars?success=${encodeURIComponent(result.message || "Car updated successfully")}`));
        }
        return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent(result.message || result.error || "Failed to update car")}`));
    }
    if (intent === "unarchive") {
        await context.cloudflare.env.DB
            .prepare("UPDATE company_cars SET archived_at = NULL, updated_at = ? WHERE id = ?")
            .bind(new Date().toISOString(), carId)
            .run();
        return redirect(withModCompany(`/cars/${carId}/edit?success=Car unarchived successfully`));
    }

    const rawData = {
        templateId: formData.get("templateId") ? Number(formData.get("templateId")) : (car.template_id || null),
        year: formData.get("year") ? Number(formData.get("year")) : car.year,
        colorId: Number(formData.get("colorId")) || car.color_id || 0,
        licensePlate: (formData.get("licensePlate") as string)?.toUpperCase() || car.license_plate || "",
        transmission: (formData.get("transmission") as "automatic" | "manual") || car.transmission || "automatic",
        engineVolume: Number(formData.get("engineVolume")) || car.engine_volume || 0,
        fuelType: (formData.get("fuelType") as "petrol" | "diesel" | "electric" | "hybrid") || "petrol",
        status: (formData.get("status") as "available" | "rented" | "maintenance" | "booked") || car.status || "available",
        currentMileage: Number(formData.get("currentMileage")) || car.mileage || 0,
        nextOilChangeMileage: Number(formData.get("nextOilChangeMileage")) || car.next_oil_change_mileage || 0,
        oilChangeInterval: Number(formData.get("oilChangeInterval")) || car.oil_change_interval || 10000,
        pricePerDay: Number(formData.get("pricePerDay")) || car.price_per_day || 0,
        deposit: Number(formData.get("deposit")) || car.deposit || 0,
        insuranceType: (formData.get("insuranceType") as string) || "First Class Insurance",
        insuranceExpiry: (formData.get("insuranceExpiry") as string) || null,
        registrationExpiry: (formData.get("registrationExpiry") as string) || null,
        taxRoadExpiry: (formData.get("taxRoadExpiry") as string) || null,
        minRentalDays: formData.get("minRentalDays")
            ? Number(formData.get("minRentalDays"))
            : (car.min_rental_days ?? null),
        insurancePricePerDay: formData.get("fullInsuranceEnabled") === "true"
            ? (formData.get("insurancePricePerDay") ? Number(formData.get("insurancePricePerDay")) : car.insurance_price_per_day)
            : null,
        maxInsurancePrice: formData.get("fullInsuranceEnabled") === "true"
            ? (formData.get("maxInsurancePrice") ? Number(formData.get("maxInsurancePrice")) : car.max_insurance_price)
            : null,
    };
    const validation = parseWithSchema(carSchema, rawData, "Validation failed");
    if (!validation.ok) {
        return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent(validation.error)}`));
    }
    const validData = validation.data;
    const checkboxToInt = (value: FormDataEntryValue | null) => (value === "1" || value === "on" || value === "true" ? 1 : 0);
    const drivetrainRaw = String(formData.get("drivetrain") || "").toUpperCase();
    const templateSpecs = {
        drivetrain: (["FWD", "RWD", "AWD", "4WD"].includes(drivetrainRaw) ? drivetrainRaw : null) as "FWD" | "RWD" | "AWD" | "4WD" | null,
        rear_camera: checkboxToInt(formData.get("rear_camera")),
        bluetooth_enabled: checkboxToInt(formData.get("bluetooth_enabled")),
        carplay_enabled: checkboxToInt(formData.get("carplay_enabled")),
        android_auto_enabled: checkboxToInt(formData.get("android_auto_enabled")),
        feature_air_conditioning: checkboxToInt(formData.get("feature_air_conditioning")),
        feature_abs: checkboxToInt(formData.get("feature_abs")),
    };
    if (!validData.year) {
        return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent("Year is required")}`));
    }
    if (!validData.insuranceType || !String(validData.insuranceType).trim()) {
        return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent("Insurance type is required")}`));
    }

    try {
        const duplicateByCompanyResult = await context.cloudflare.env.DB
            .prepare(
                `
                SELECT cc.id
                FROM company_cars cc
                JOIN car_templates ct ON ct.id = cc.template_id
                WHERE cc.company_id = ?
                  AND ct.brand_id = (SELECT brand_id FROM car_templates WHERE id = ?)
                  AND ct.model_id = (SELECT model_id FROM car_templates WHERE id = ?)
                  AND UPPER(TRIM(cc.license_plate)) = UPPER(TRIM(?))
                  AND cc.archived_at IS NULL
                  AND cc.id != ?
                LIMIT 1
                `
            )
            .bind(car.company_id, validData.templateId, validData.templateId, validData.licensePlate, carId)
            .all();
        if ((duplicateByCompanyResult.results ?? []).length > 0) {
            return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent("Car with same brand, model and license plate already exists in this company")}`));
        }

        const fuelTypes = await getCachedFuelTypes(context.cloudflare.env.DB) as FuelTypeRow[];
        const fuelType = fuelTypes.find((item) => item.name.toLowerCase() === validData.fuelType.toLowerCase());
        const photosData = formData.get("photos") as string;
        let photoUrls: string[] = getCarPhotoUrls(car.photos);
        if (photosData) {
            try {
                const photos = JSON.parse(photosData);
                if (Array.isArray(photos) && photos.length > 0) {
                    photoUrls = await Promise.all(
                        photos.map(async (photo: { base64: string; fileName: string }) => {
                            if (photo.base64.startsWith('/assets/') || photo.base64.startsWith('http')) return photo.base64;
                            return uploadToR2(context.cloudflare.env.ASSETS, photo.base64, `cars/${carId}/${photo.fileName}`);
                        })
                    );
                }
            } catch {
            }
        }

        await context.cloudflare.env.DB
            .prepare(`
                UPDATE company_cars
                SET template_id = ?, year = ?, color_id = ?, license_plate = ?, transmission = ?, engine_volume = ?,
                    fuel_type_id = ?, status = ?, mileage = ?, next_oil_change_mileage = ?, oil_change_interval = ?,
                    price_per_day = ?, deposit = ?, insurance_type = ?, insurance_expiry_date = ?, registration_expiry = ?,
                    tax_road_expiry_date = ?, insurance_price_per_day = ?, max_insurance_price = ?, min_rental_days = ?, photos = ?, updated_at = ?
                WHERE id = ?
            `)
            .bind(
                validData.templateId,
                validData.year ?? null,
                validData.colorId,
                validData.licensePlate,
                validData.transmission,
                validData.engineVolume,
                fuelType?.id ?? null,
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
                validData.insurancePricePerDay,
                validData.maxInsurancePrice,
                validData.minRentalDays,
                photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
                new Date().toISOString(),
                carId
            )
            .run();

        if (validData.templateId) {
            await context.cloudflare.env.DB
                .prepare(`
                    UPDATE car_templates
                    SET
                        drivetrain = COALESCE(?, drivetrain),
                        rear_camera = ?,
                        bluetooth_enabled = ?,
                        carplay_enabled = ?,
                        android_auto_enabled = ?,
                        feature_air_conditioning = ?,
                        feature_abs = ?,
                        updated_at = ?
                    WHERE id = ?
                `)
                .bind(
                    templateSpecs.drivetrain,
                    templateSpecs.rear_camera,
                    templateSpecs.bluetooth_enabled,
                    templateSpecs.carplay_enabled,
                    templateSpecs.android_auto_enabled,
                    templateSpecs.feature_air_conditioning,
                    templateSpecs.feature_abs,
                    new Date().toISOString(),
                    validData.templateId
                )
                .run();
        }

        const metadata = getRequestMetadata(request);
        quickAudit({
            db: context.cloudflare.env.DB,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: "car",
            entityId: carId,
            action: "update",
            afterState: { ...validData, id: carId },
            ...metadata,
        });

        return redirect(withModCompany(`/cars?success=${encodeURIComponent("Car updated successfully")}`));
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes('UNIQUE constraint failed') && message.includes('license_plate')) {
            return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent(`License plate "${validData.licensePlate}" is already in use`)}`));
        }
        return redirect(withModCompany(`/cars/${carId}/edit?error=${encodeURIComponent("Failed to update car")}`));
    }
}

export default function EditCarPage() {
    const { car, templates, colors, seasons, durations, fuelTypes } = useLoaderData<typeof loader>();
    useUrlToast();
    const { validateLatinInput } = useLatinValidation();
    const [pricePerDay, setPricePerDay] = useState(car.pricePerDay || 0);
    const [currentMileage, setCurrentMileage] = useState(car.mileage || 0);
    const [nextOilChange, setNextOilChange] = useState(car.nextOilChangeMileage || 0);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(car.templateId);
    const selectedTemplate = templates.find((t: CarTemplateOption) => t.id === selectedTemplateId);
    const linkedTemplate = templates.find((t: CarTemplateOption) => t.id === car.templateId) || null;
    const [photos, setPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [fullInsuranceEnabled, setFullInsuranceEnabled] = useState(
        Boolean((car.insurancePricePerDay ?? 0) > 0 || (car.maxInsurancePrice ?? 0) > 0)
    );
    const [drivetrain, setDrivetrain] = useState<string>(String(car.template?.drivetrain || "FWD"));
    const [rearCamera, setRearCamera] = useState(Boolean(car.template?.rearCamera));
    const [bluetoothEnabled, setBluetoothEnabled] = useState(Boolean(car.template?.bluetoothEnabled));
    const [carplayEnabled, setCarplayEnabled] = useState(Boolean(car.template?.carplayEnabled));
    const [androidAutoEnabled, setAndroidAutoEnabled] = useState(Boolean(car.template?.androidAutoEnabled));
    const [featureAirConditioning, setFeatureAirConditioning] = useState(car.template?.featureAirConditioning == null ? true : Boolean(car.template.featureAirConditioning));
    const [featureAbs, setFeatureAbs] = useState(car.template?.featureAbs == null ? true : Boolean(car.template.featureAbs));

    useEffect(() => {
        if (!selectedTemplate) return;
        setDrivetrain(String(selectedTemplate.drivetrain || "FWD"));
        setRearCamera(Boolean(Number(selectedTemplate.rear_camera || 0)));
        setBluetoothEnabled(Boolean(Number(selectedTemplate.bluetooth_enabled || 0)));
        setCarplayEnabled(Boolean(Number(selectedTemplate.carplay_enabled || 0)));
        setAndroidAutoEnabled(Boolean(Number(selectedTemplate.android_auto_enabled || 0)));
        setFeatureAirConditioning(selectedTemplate.feature_air_conditioning == null ? true : Boolean(Number(selectedTemplate.feature_air_conditioning)));
        setFeatureAbs(selectedTemplate.feature_abs == null ? true : Boolean(Number(selectedTemplate.feature_abs)));
    }, [selectedTemplateId]);

    const formatDateInput = (date: Date | string | null) => {
        if (!date) return "";
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const getTemplateName = (template: CarTemplateOption) => {
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
                leftActions={<BackButton to="/cars" />}
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

            <Form id="edit-car-form" method="post">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Main Form - Left Side */}
                    <div className="lg:col-span-2">
                        <div className="space-y-4">
                            <FormSection title="Specifications" icon={<Cog6ToothIcon className="w-5 h-5" />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Select
                                        label="Car Template"
                                        name="templateId"
                                        required
                                        options={templates.map((t: { id: number }) => ({
                                            id: t.id,
                                            name: getTemplateName(t)
                                        }))}
                                        defaultValue={car.templateId ?? ""}
                                        onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                                    />
                                    <Input
                                        label="License Plate"
                                        name="licensePlate"
                                        required
                                        defaultValue={car.licensePlate ?? ""}
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
                                        defaultValue={car.colorId ?? ""}
                                    />
                                    <Input
                                        label="Year"
                                        name="year"
                                        type="number"
                                        required
                                        min={1900}
                                        max={new Date().getFullYear() + 1}
                                        defaultValue={car.year || ""}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                                    <Select
                                        label="Drivetrain"
                                        name="drivetrain"
                                        required
                                        value={drivetrain}
                                        onChange={(e) => setDrivetrain(e.target.value)}
                                        options={[
                                            { id: "FWD", name: "FWD" },
                                            { id: "RWD", name: "RWD" },
                                            { id: "AWD", name: "AWD" },
                                            { id: "4WD", name: "4WD" },
                                        ]}
                                    />
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Rear Camera</label>
                                        <div className="flex items-center justify-between px-4 border border-gray-200 rounded-xl h-[38px] bg-white">
                                            <span className="text-sm text-gray-900">{rearCamera ? "Enabled" : "Disabled"}</span>
                                            <Toggle enabled={rearCamera} onChange={setRearCamera} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Bluetooth</label>
                                        <div className="flex items-center justify-between px-4 border border-gray-200 rounded-xl h-[38px] bg-white">
                                            <span className="text-sm text-gray-900">{bluetoothEnabled ? "Enabled" : "Disabled"}</span>
                                            <Toggle enabled={bluetoothEnabled} onChange={setBluetoothEnabled} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">CarPlay</label>
                                        <div className="flex items-center justify-between px-4 border border-gray-200 rounded-xl h-[38px] bg-white">
                                            <span className="text-sm text-gray-900">{carplayEnabled ? "Enabled" : "Disabled"}</span>
                                            <Toggle enabled={carplayEnabled} onChange={setCarplayEnabled} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Android Auto</label>
                                        <div className="flex items-center justify-between px-4 border border-gray-200 rounded-xl h-[38px] bg-white">
                                            <span className="text-sm text-gray-900">{androidAutoEnabled ? "Enabled" : "Disabled"}</span>
                                            <Toggle enabled={androidAutoEnabled} onChange={setAndroidAutoEnabled} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Air conditioning</label>
                                        <div className="flex items-center justify-between px-4 border border-gray-200 rounded-xl h-[38px] bg-white">
                                            <span className="text-sm text-gray-900">{featureAirConditioning ? "Enabled" : "Disabled"}</span>
                                            <Toggle enabled={featureAirConditioning} onChange={setFeatureAirConditioning} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">ABS</label>
                                        <div className="flex items-center justify-between px-4 border border-gray-200 rounded-xl h-[38px] bg-white">
                                            <span className="text-sm text-gray-900">{featureAbs ? "Enabled" : "Disabled"}</span>
                                            <Toggle enabled={featureAbs} onChange={setFeatureAbs} />
                                        </div>
                                    </div>
                                </div>
                                <input type="hidden" name="transmission" value={selectedTemplate?.transmission || car.transmission || 'automatic'} />
                                <input type="hidden" name="engineVolume" value={selectedTemplate?.engineVolume || car.engineVolume || 1.5} />
                                <input type="hidden" name="fuelType" value={(selectedTemplate?.fuelType?.name || car.fuelType?.name || 'Petrol').toLowerCase()} />
                                <input type="hidden" name="rear_camera" value={rearCamera ? "1" : "0"} />
                                <input type="hidden" name="bluetooth_enabled" value={bluetoothEnabled ? "1" : "0"} />
                                <input type="hidden" name="carplay_enabled" value={carplayEnabled ? "1" : "0"} />
                                <input type="hidden" name="android_auto_enabled" value={androidAutoEnabled ? "1" : "0"} />
                                <input type="hidden" name="feature_air_conditioning" value={featureAirConditioning ? "1" : "0"} />
                                <input type="hidden" name="feature_abs" value={featureAbs ? "1" : "0"} />
                            </FormSection>

                            <FormSection title="Insurance" icon={<ShieldCheckIcon className="w-5 h-5" />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Select
                                        label="Insurance Type"
                                        name="insuranceType"
                                        required
                                        hidePlaceholderOption
                                        options={[
                                            { id: "First Class Insurance", name: "First Class Insurance" },
                                            { id: "Business Insurance", name: "Business Insurance" },
                                        ]}
                                        defaultValue={car.insuranceType || "First Class Insurance"}
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
                                    <Input
                                        label="Min Rental Days"
                                        name="minRentalDays"
                                        type="number"
                                        min={1}
                                        step={1}
                                        defaultValue={car.minRentalDays || 1}
                                    />
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
                                                label="Insurance Price per day"
                                                name="insurancePricePerDay"
                                                type="number"
                                                min={0}
                                                step={0.01}
                                                defaultValue={car.insurancePricePerDay || ""}
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
                                    <h4 className="block text-sm text-gray-500 mb-1">Seasonal Pricing Matrix</h4>
                                    <div className="overflow-hidden">
                                        <div className="border border-gray-200 rounded-3xl overflow-hidden bg-white">
                                            <div className="overflow-x-auto sm:mx-0">
                                                <table className="min-w-full divide-y divide-gray-100 bg-transparent">
                                                    <thead>
                                                        <tr className="bg-gray-50/50">
                                                            <th scope="col" className="pl-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight">
                                                                <span>Season</span>
                                                            </th>
                                                            {durations.map((duration: { id: number; rangeName: string }) => (
                                                                <th
                                                                    key={duration.id}
                                                                    scope="col"
                                                                    className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight hidden sm:table-cell"
                                                                >
                                                                    <div className="flex flex-col leading-tight">
                                                                        <span>{duration.rangeName.split(' ')[0]}</span>
                                                                        <span className="text-[10px] lowercase text-gray-400 font-normal">
                                                                            {duration.rangeName.split(' ').slice(1).join(' ')}
                                                                        </span>
                                                                    </div>
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {seasons.map((season: { id: number; seasonName: string; startMonth: number; startDay: number; endMonth: number; endDay: number; priceMultiplier: number; discountLabel?: string | null }) => (
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
                                                                {durations.map((duration: { id: number; minDays: number; maxDays: number | null; priceMultiplier: number; rangeName: string; discountLabel: string | null }) => {
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
                            </FormSection>

                            <input type="hidden" name="photos" value={JSON.stringify(photos)} />
                        </div>
                    </div>

                    {/* Sidebar - Right Side */}
                    <div className="space-y-4">
                        {linkedTemplate && (
                            <AdminCard title="Template Details" icon={<TruckIcon className="w-5 h-5" />}>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Brand *</span>
                                        <span className="text-sm font-medium text-gray-900">{linkedTemplate.brand?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Model *</span>
                                        <span className="text-sm font-medium text-gray-900">{linkedTemplate.model?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Transmission *</span>
                                        <span className="text-sm font-medium text-gray-900 capitalize">{linkedTemplate.transmission || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Body Type *</span>
                                        <span className="text-sm font-medium text-gray-900">{linkedTemplate.bodyType?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Fuel Type *</span>
                                        <span className="text-sm font-medium text-gray-900">{linkedTemplate.fuelType?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Engine Volume (L) *</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {linkedTemplate.engineVolume == null ? 'N/A' : `${String(linkedTemplate.engineVolume).replace('.', ',')}`}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Seats *</span>
                                        <span className="text-sm font-medium text-gray-900">{linkedTemplate.seats ?? 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Doors *</span>
                                        <span className="text-sm font-medium text-gray-900">{linkedTemplate.doors ?? 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Luggage Capacity *</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {linkedTemplate.luggage_capacity ? `${linkedTemplate.luggage_capacity[0].toUpperCase()}${linkedTemplate.luggage_capacity.slice(1)}` : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Airbags</span>
                                        <span className="text-sm font-medium text-gray-900">{Number(linkedTemplate.feature_airbags || 0) ? 'Enabled' : 'Disabled'}</span>
                                    </div>
                                </div>
                            </AdminCard>
                        )}

                        <AdminCard title="Photos" icon={<PhotoIcon className="w-5 h-5" />}>
                            <CarPhotosUpload
                                currentPhotos={getCarPhotoUrls(car.photos)}
                                onPhotosChange={setPhotos}
                                maxPhotos={6}
                            />
                        </AdminCard>

                        <AdminCard title="Maintenance" icon={<WrenchScrewdriverIcon className="w-5 h-5" />}>
                            <div className="space-y-4">
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
                        </AdminCard>

                        <AdminCard title="Status" icon={<AdjustmentsHorizontalIcon className="w-5 h-5" />}>
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
                        </AdminCard>
                    </div>
                </div>
            </Form>
        </div>
    );
}
