import { redirect } from 'react-router'
import type { Route } from './+types/car-templates.$id.edit'
import { requireAdmin } from '~/lib/auth.server'
import { CarTemplateForm } from '~/components/dashboard/CarTemplateForm'
import PageHeader from '~/components/dashboard/PageHeader'
import BackButton from '~/components/dashboard/BackButton'
import Button from '~/components/dashboard/Button'
import { getCachedBodyTypes, getCachedCarBrands, getCachedCarModels, getCachedFuelTypes } from '~/lib/dictionaries-cache.server'
import type { DictionaryRow, ModelRow } from '~/lib/db-types'
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";

interface CarTemplateRow {
    id: number
    brand_id: number
    model_id: number
    transmission: 'automatic' | 'manual' | null
    engine_volume: number | null
    body_type_id: number | null
    seats: number | null
    doors: number | null
    fuel_type_id: number | null
    description: string | null
    photos: string | null
    feature_transmission: 'automatic' | 'manual' | null
    feature_air_conditioning: number | null
    air_conditioning_price_per_day: number | null
    max_air_conditioning_price: number | null
    feature_abs: number | null
    feature_airbags: number | null
    drivetrain: 'FWD' | 'RWD' | 'AWD' | '4WD' | null
    luggage_capacity: 'small' | 'medium' | 'large' | null
    rear_camera: number | null
    bluetooth_enabled: number | null
    carplay_enabled: number | null
    android_auto_enabled: number | null
}

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

export async function loader({ request, context, params }: Route.LoaderArgs) {
    await requireAdmin(request)

    const templateId = Number(params.id)
    const { hasFeatureFlags, hasFeatureDetails, hasTemplateSpecs } = await getTemplateFeatureSchema(context.cloudflare.env.DB);

    const template = hasFeatureFlags && hasFeatureDetails && hasTemplateSpecs
        ? (await context.cloudflare.env.DB
            .prepare(`
                SELECT
                    id,
                    brand_id,
                    model_id,
                    transmission,
                    engine_volume,
                    body_type_id,
                    seats,
                    doors,
                    fuel_type_id,
                    description,
                    photos,
                    feature_transmission,
                    feature_air_conditioning,
                    air_conditioning_price_per_day,
                    max_air_conditioning_price,
                    feature_abs,
                    feature_airbags,
                    drivetrain,
                    luggage_capacity,
                    rear_camera,
                    bluetooth_enabled,
                    carplay_enabled,
                    android_auto_enabled
                FROM car_templates
                WHERE id = ?
                LIMIT 1
            `)
            .bind(templateId)
            .first()) as CarTemplateRow | null
        : hasFeatureFlags
            ? (await context.cloudflare.env.DB
                .prepare(`
                    SELECT
                        id,
                        brand_id,
                        model_id,
                        transmission,
                        engine_volume,
                        body_type_id,
                        seats,
                        doors,
                        fuel_type_id,
                        description,
                        photos,
                        feature_air_conditioning,
                        feature_abs,
                        feature_airbags
                    FROM car_templates
                    WHERE id = ?
                    LIMIT 1
                `)
                .bind(templateId)
                .first()
                .then((row) => row ? ({
                    ...row,
                    feature_transmission: null,
                    air_conditioning_price_per_day: null,
                    max_air_conditioning_price: null,
                    drivetrain: null,
                    luggage_capacity: null,
                    rear_camera: null,
                    bluetooth_enabled: null,
                    carplay_enabled: null,
                    android_auto_enabled: null,
                }) : null)) as CarTemplateRow | null
        : (await context.cloudflare.env.DB
            .prepare(`
                SELECT
                    id,
                    brand_id,
                    model_id,
                    transmission,
                    engine_volume,
                    body_type_id,
                    seats,
                    doors,
                    fuel_type_id,
                    description,
                    photos
                FROM car_templates
                WHERE id = ?
                LIMIT 1
            `)
            .bind(templateId)
            .first()
            .then((row) => row ? ({
                ...row,
                feature_transmission: null,
                feature_air_conditioning: null,
                air_conditioning_price_per_day: null,
                max_air_conditioning_price: null,
                feature_abs: null,
                feature_airbags: null,
                drivetrain: null,
                luggage_capacity: null,
                rear_camera: null,
                bluetooth_enabled: null,
                carplay_enabled: null,
                android_auto_enabled: null,
            }) : null)) as CarTemplateRow | null

    if (!template) {
        throw new Response('Template not found', { status: 404 })
    }

    const [brands, models, rawBodyTypes, rawFuelTypes] = await Promise.all([
        getCachedCarBrands(context.cloudflare.env.DB) as Promise<DictionaryRow[]>,
        getCachedCarModels(context.cloudflare.env.DB) as Promise<ModelRow[]>,
        getCachedBodyTypes(context.cloudflare.env.DB) as Promise<DictionaryRow[]>,
        getCachedFuelTypes(context.cloudflare.env.DB) as Promise<DictionaryRow[]>,
    ])

    const excludedBodyTypes = new Set(["convertible", "scooter", "wagon"])
    const bodyTypes = rawBodyTypes.filter((item) => !excludedBodyTypes.has(item.name.toLowerCase()))
    const allowedFuelNames = new Set(["petrol", "diesel", "electric", "hybrid", "benzin", "benzine", "benzin/gasoline", "gasoline", "бензин", "дизель", "электро", "гибрид"])
    const fuelTypes = rawFuelTypes.filter((item) => allowedFuelNames.has(item.name.toLowerCase()))

    return { template, brands, models, bodyTypes, fuelTypes }
}

export async function action({ request, context, params }: Route.ActionArgs) {
    await requireAdmin(request)

    const formData = await request.formData()
    const templateId = Number(params.id)
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
        return redirect(`/car-templates/${templateId}/edit?error=${encodeURIComponent(parsed.error)}`)
    }
    const data = parsed.data

    if (hasFeatureFlags && hasFeatureDetails && hasTemplateSpecs) {
        await context.cloudflare.env.DB
            .prepare(`
                UPDATE car_templates
                SET brand_id = ?, model_id = ?, transmission = ?, engine_volume = ?, body_type_id = ?,
                    seats = ?, doors = ?, fuel_type_id = ?, description = ?, photos = ?,
                    feature_transmission = ?, feature_air_conditioning = ?, air_conditioning_price_per_day = ?, max_air_conditioning_price = ?, feature_abs = ?, feature_airbags = ?,
                    drivetrain = ?, luggage_capacity = ?, rear_camera = ?, bluetooth_enabled = ?, carplay_enabled = ?, android_auto_enabled = ?, updated_at = ?
                WHERE id = ?
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
                templateId
            )
            .run();
    } else if (hasFeatureFlags) {
        await context.cloudflare.env.DB
            .prepare(`
                UPDATE car_templates
                SET brand_id = ?, model_id = ?, transmission = ?, engine_volume = ?, body_type_id = ?,
                    seats = ?, doors = ?, fuel_type_id = ?, description = ?, photos = ?,
                    feature_air_conditioning = ?, feature_abs = ?, feature_airbags = ?, updated_at = ?
                WHERE id = ?
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
                templateId
            )
            .run();
    } else {
        await context.cloudflare.env.DB
            .prepare(`
                UPDATE car_templates
                SET brand_id = ?, model_id = ?, transmission = ?, engine_volume = ?, body_type_id = ?,
                    seats = ?, doors = ?, fuel_type_id = ?, description = ?, photos = ?, updated_at = ?
                WHERE id = ?
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
                templateId
            )
            .run();
    }

    return redirect(`/car-templates/${templateId}/edit?success=Template%20updated`)
}

export default function EditCarTemplatePage({ loaderData }: Route.ComponentProps) {
    const { template, brands, models, bodyTypes, fuelTypes } = loaderData
    const formTemplate = {
        ...template,
        transmission: template.transmission || undefined,
        engine_volume: template.engine_volume ?? undefined,
        body_type_id: template.body_type_id ?? undefined,
        seats: template.seats ?? undefined,
        doors: template.doors ?? undefined,
        fuel_type_id: template.fuel_type_id ?? undefined,
        description: template.description ?? undefined,
        photos: template.photos ?? undefined,
        feature_transmission: template.feature_transmission || undefined,
        feature_air_conditioning: Boolean(template.feature_air_conditioning),
        air_conditioning_price_per_day: template.air_conditioning_price_per_day ?? undefined,
        max_air_conditioning_price: template.max_air_conditioning_price ?? undefined,
        feature_abs: Boolean(template.feature_abs),
        feature_airbags: Boolean(template.feature_airbags),
        drivetrain: template.drivetrain || undefined,
        luggage_capacity: template.luggage_capacity || undefined,
        rear_camera: template.rear_camera == null ? true : Boolean(template.rear_camera),
        bluetooth_enabled: template.bluetooth_enabled == null ? true : Boolean(template.bluetooth_enabled),
        carplay_enabled: template.carplay_enabled == null ? false : Boolean(template.carplay_enabled),
        android_auto_enabled: template.android_auto_enabled == null ? false : Boolean(template.android_auto_enabled),
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="Edit"
                leftActions={<BackButton to="/car-templates" />}
                rightActions={
                    <Button type="submit" variant="primary" form="car-template-form">
                        Save
                    </Button>
                }
            />

            <CarTemplateForm
                template={formTemplate}
                brands={brands}
                models={models}
                bodyTypes={bodyTypes}
                fuelTypes={fuelTypes}
            />
        </div>
    )
}
