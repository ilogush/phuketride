import { redirect } from 'react-router'
import type { Route } from './+types/car-templates.create'
import { requireAdmin } from '~/lib/auth.server'
import { CarTemplateForm } from '~/components/dashboard/CarTemplateForm'
import PageHeader from '~/components/dashboard/PageHeader'
import BackButton from '~/components/dashboard/BackButton'
import Button from '~/components/dashboard/Button'
import { getCachedBodyTypes, getCachedCarBrands, getCachedCarModels, getCachedFuelTypes } from '~/lib/dictionaries-cache.server'
import type { DictionaryRow as OptionRow, ModelRow } from '~/lib/db-types'
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";

async function getTemplateFeatureSchema(db: D1Database) {
    const cols = await db.prepare("PRAGMA table_info(car_templates)").all() as {
        results?: Array<{ name?: string }>
    };
    const names = new Set((cols.results || []).map((col) => String(col.name || "")));
    return {
        hasFeatureFlags: names.has("feature_air_conditioning") && names.has("feature_abs") && names.has("feature_airbags"),
        hasFeatureDetails: names.has("feature_transmission") && names.has("air_conditioning_price_per_day") && names.has("max_air_conditioning_price"),
        hasTemplateSpecs: names.has("drivetrain") && names.has("luggage_capacity") && names.has("rear_camera") && names.has("bluetooth_enabled") && names.has("carplay_enabled") && names.has("android_auto_enabled"),
    };
}

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request)

    const [brands, models, rawBodyTypes, rawFuelTypes] = await Promise.all([
        getCachedCarBrands(context.cloudflare.env.DB) as Promise<OptionRow[]>,
        getCachedCarModels(context.cloudflare.env.DB) as Promise<ModelRow[]>,
        getCachedBodyTypes(context.cloudflare.env.DB) as Promise<OptionRow[]>,
        getCachedFuelTypes(context.cloudflare.env.DB) as Promise<OptionRow[]>,
    ])

    const excludedBodyTypes = new Set(["convertible", "scooter", "wagon"])
    const bodyTypes = rawBodyTypes.filter((item) => !excludedBodyTypes.has(item.name.toLowerCase()))
    const allowedFuelNames = new Set(["petrol", "diesel", "electric", "hybrid", "benzin", "benzine", "benzin/gasoline", "gasoline", "бензин", "дизель", "электро", "гибрид"])
    const fuelTypes = rawFuelTypes.filter((item) => allowedFuelNames.has(item.name.toLowerCase()))

    return { brands, models, bodyTypes, fuelTypes }
}

export async function action({ request, context }: Route.ActionArgs) {
    await requireAdmin(request)
    const formData = await request.formData()
    const { hasFeatureFlags, hasFeatureDetails, hasTemplateSpecs } = await getTemplateFeatureSchema(context.cloudflare.env.DB);
    const checkboxToInt = z.preprocess((value) => {
        if (value === "on" || value === "1" || value === 1 || value === true) return 1;
        return 0;
    }, z.number().int().min(0).max(1));
    const optionalNumber = z.preprocess((value) => {
        if (value === null || value === undefined || value === "") return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    }, z.number().nonnegative().nullable());
    const parsed = parseWithSchema(
        z.object({
        brand_id: z.coerce.number().int().positive("Brand is required"),
        model_id: z.coerce.number().int().positive("Model is required"),
        transmission: z.enum(["automatic", "manual"], { message: "Transmission is required" }),
        engine_volume: z.coerce.number().positive("Engine volume is required"),
        body_type_id: z.coerce.number().int().positive("Body type is required"),
        seats: z.coerce.number().int().positive("Seats is required"),
        doors: z.coerce.number().int().positive("Doors is required"),
        fuel_type_id: z.coerce.number().int().positive("Fuel type is required"),
        description: z.string().optional().nullable(),
        photos: z.string().optional().nullable(),
        feature_transmission: z.enum(["automatic", "manual"]).optional().nullable(),
        feature_air_conditioning: checkboxToInt,
        air_conditioning_price_per_day: optionalNumber,
        max_air_conditioning_price: optionalNumber,
        feature_abs: checkboxToInt,
        feature_airbags: checkboxToInt,
        drivetrain: z.enum(["FWD", "RWD", "AWD", "4WD"]).optional().nullable(),
        luggage_capacity: z.enum(["small", "medium", "large"]).optional().nullable(),
        rear_camera: checkboxToInt,
        bluetooth_enabled: checkboxToInt,
        carplay_enabled: checkboxToInt,
        android_auto_enabled: checkboxToInt,
    }),
    {
        brand_id: formData.get('brand_id'),
        model_id: formData.get('model_id'),
        transmission: formData.get('transmission'),
        engine_volume: formData.get('engine_volume'),
        body_type_id: formData.get('body_type_id'),
        seats: formData.get('seats'),
        doors: formData.get('doors'),
        fuel_type_id: formData.get('fuel_type_id'),
        description: formData.get('description'),
        photos: formData.get('photos'),
        feature_transmission: formData.get('feature_transmission'),
        feature_air_conditioning: formData.get('feature_air_conditioning'),
        air_conditioning_price_per_day: formData.get('air_conditioning_price_per_day'),
        max_air_conditioning_price: formData.get('max_air_conditioning_price'),
        feature_abs: formData.get('feature_abs'),
        feature_airbags: formData.get('feature_airbags'),
        drivetrain: formData.get('drivetrain'),
        luggage_capacity: formData.get('luggage_capacity'),
        rear_camera: formData.get('rear_camera'),
        bluetooth_enabled: formData.get('bluetooth_enabled'),
        carplay_enabled: formData.get('carplay_enabled'),
        android_auto_enabled: formData.get('android_auto_enabled'),
    },
    "Validation failed")
    if (!parsed.ok) {
        return redirect(`/car-templates/create?error=${encodeURIComponent(parsed.error)}`)
    }
    const data = parsed.data

    if (hasFeatureFlags && hasFeatureDetails && hasTemplateSpecs) {
        await context.cloudflare.env.DB
            .prepare(`
                INSERT INTO car_templates (
                    brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors,
                    fuel_type_id, description, photos, feature_transmission, feature_air_conditioning, air_conditioning_price_per_day, max_air_conditioning_price, feature_abs, feature_airbags,
                    drivetrain, luggage_capacity, rear_camera, bluetooth_enabled, carplay_enabled, android_auto_enabled, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
                data.brand_id,
                data.model_id,
                data.transmission,
                data.engine_volume,
                data.body_type_id,
                data.seats,
                data.doors,
                data.fuel_type_id,
                data.description as string | null,
                data.photos as string | null,
                data.feature_transmission ?? null,
                data.feature_air_conditioning,
                data.air_conditioning_price_per_day,
                data.max_air_conditioning_price,
                data.feature_abs,
                data.feature_airbags,
                data.drivetrain ?? null,
                data.luggage_capacity ?? null,
                data.rear_camera,
                data.bluetooth_enabled,
                data.carplay_enabled,
                data.android_auto_enabled,
                new Date().toISOString(),
                new Date().toISOString()
            )
            .run();
    } else if (hasFeatureFlags) {
        await context.cloudflare.env.DB
            .prepare(`
                INSERT INTO car_templates (
                    brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors,
                    fuel_type_id, description, photos, feature_air_conditioning, feature_abs, feature_airbags, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
                data.brand_id,
                data.model_id,
                data.transmission,
                data.engine_volume,
                data.body_type_id,
                data.seats,
                data.doors,
                data.fuel_type_id,
                data.description as string | null,
                data.photos as string | null,
                data.feature_air_conditioning,
                data.feature_abs,
                data.feature_airbags,
                new Date().toISOString(),
                new Date().toISOString()
            )
            .run();
    } else {
        await context.cloudflare.env.DB
            .prepare(`
                INSERT INTO car_templates (
                    brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors,
                    fuel_type_id, description, photos, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
                data.brand_id,
                data.model_id,
                data.transmission,
                data.engine_volume,
                data.body_type_id,
                data.seats,
                data.doors,
                data.fuel_type_id,
                data.description as string | null,
                data.photos as string | null,
                new Date().toISOString(),
                new Date().toISOString()
            )
            .run();
    }

    return redirect('/car-templates?success=Template%20created')
}

export default function CreateCarTemplatePage({ loaderData }: Route.ComponentProps) {
    const { brands, models, bodyTypes, fuelTypes } = loaderData

    return (
        <div className="space-y-4">
            <PageHeader
                title="Create"
                leftActions={<BackButton to="/car-templates" />}
                rightActions={
                    <Button type="submit" variant="primary" form="car-template-form">
                        Create
                    </Button>
                }
            />

            <CarTemplateForm brands={brands} models={models} bodyTypes={bodyTypes} fuelTypes={fuelTypes} />
        </div>
    )
}
