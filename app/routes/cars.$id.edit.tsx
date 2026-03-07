import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import { useEffect, useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import EditCarFormGrid from "~/components/dashboard/cars/EditCarFormGrid";
import { useUrlToast } from "~/lib/useUrlToast";
import { useLatinValidation } from "~/lib/useLatinValidation";
import {
    getCachedCarTemplateOptions,
    getCachedColors,
    getCachedRentalDurations,
    getCachedSeasons,
} from "~/lib/dictionaries-cache.server";
import { handleEditCarAction } from "~/lib/cars-edit-action.server";
import { type CarTemplateOption, type DurationRow, type SeasonRow } from "~/lib/cars-edit-types";

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

    const [templatesList, colorsList, seasonsList, durationsList] = await Promise.all([
        getCachedCarTemplateOptions(context.cloudflare.env.DB),
        getCachedColors(context.cloudflare.env.DB),
        getCachedSeasons(context.cloudflare.env.DB) as Promise<SeasonRow[]>,
        getCachedRentalDurations(context.cloudflare.env.DB) as Promise<DurationRow[]>,
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

    return { car, templates: templatesList, colors: colorsList, seasons: seasonsList, durations: durationsList, user };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const formData = await request.formData();
    return handleEditCarAction({ request, context, user, params, formData });
}

export default function EditCarPage() {
    const { car, templates, colors, seasons, durations } = useLoaderData<typeof loader>();
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
                <EditCarFormGrid
                    car={car}
                    templates={templates}
                    colors={colors}
                    seasons={seasons}
                    durations={durations}
                    selectedTemplate={selectedTemplate}
                    linkedTemplate={linkedTemplate}
                    pricePerDay={pricePerDay}
                    setPricePerDay={setPricePerDay}
                    currentMileage={currentMileage}
                    setCurrentMileage={setCurrentMileage}
                    nextOilChange={nextOilChange}
                    setNextOilChange={setNextOilChange}
                    isOilChangeDueSoon={isOilChangeDueSoon}
                    kmUntilOilChange={kmUntilOilChange}
                    selectedTemplateId={selectedTemplateId}
                    setSelectedTemplateId={setSelectedTemplateId}
                    photos={photos}
                    setPhotos={setPhotos}
                    fullInsuranceEnabled={fullInsuranceEnabled}
                    setFullInsuranceEnabled={setFullInsuranceEnabled}
                    drivetrain={drivetrain}
                    setDrivetrain={setDrivetrain}
                    rearCamera={rearCamera}
                    setRearCamera={setRearCamera}
                    bluetoothEnabled={bluetoothEnabled}
                    setBluetoothEnabled={setBluetoothEnabled}
                    carplayEnabled={carplayEnabled}
                    setCarplayEnabled={setCarplayEnabled}
                    androidAutoEnabled={androidAutoEnabled}
                    setAndroidAutoEnabled={setAndroidAutoEnabled}
                    featureAirConditioning={featureAirConditioning}
                    setFeatureAirConditioning={setFeatureAirConditioning}
                    featureAbs={featureAbs}
                    setFeatureAbs={setFeatureAbs}
                    validateLicensePlateInput={(e) => {
                        e.target.value = e.target.value.toUpperCase();
                        validateLatinInput(e, "License Plate");
                    }}
                />
            </Form>
        </div>
    );
}
