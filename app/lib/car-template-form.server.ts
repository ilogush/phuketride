import { z } from "zod";
import {
    getCachedBodyTypes,
    getCachedCarBrands,
    getCachedCarModels,
    getCachedFuelTypes,
} from "~/lib/dictionaries-cache.server";
import type { DictionaryRow, ModelRow } from "~/lib/db-types";
import { parseWithSchema } from "~/lib/validation.server";

export interface CarTemplateFeatureSchema {
    hasFeatureFlags: boolean;
    hasFeatureDetails: boolean;
    hasTemplateSpecs: boolean;
}

export interface EditableCarTemplateRow {
    id: number;
    brand_id: number;
    model_id: number;
    transmission: "automatic" | "manual" | null;
    engine_volume: number | null;
    body_type_id: number | null;
    seats: number | null;
    doors: number | null;
    fuel_type_id: number | null;
    description: string | null;
    photos: string | null;
    feature_transmission: "automatic" | "manual" | null;
    feature_air_conditioning: number | null;
    air_conditioning_price_per_day: number | null;
    max_air_conditioning_price: number | null;
    feature_abs: number | null;
    feature_airbags: number | null;
    drivetrain: "FWD" | "RWD" | "AWD" | "4WD" | null;
    luggage_capacity: "small" | "medium" | "large" | null;
    rear_camera: number | null;
    bluetooth_enabled: number | null;
    carplay_enabled: number | null;
    android_auto_enabled: number | null;
}

const checkboxToInt = z.preprocess((value) => {
    if (value === "on" || value === "1" || value === 1 || value === true) return 1;
    return 0;
}, z.number().int().min(0).max(1));

const optionalNumber = z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}, z.number().nonnegative().nullable());

const carTemplateFormSchema = z.object({
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
});

export async function getCarTemplateFeatureSchema(db: D1Database): Promise<CarTemplateFeatureSchema> {
    const cols = await db.prepare("PRAGMA table_info(car_templates)").all() as {
        results?: Array<{ name?: string }>;
    };
    const names = new Set((cols.results || []).map((col) => String(col.name || "")));

    return {
        hasFeatureFlags: names.has("feature_air_conditioning") && names.has("feature_abs") && names.has("feature_airbags"),
        hasFeatureDetails: names.has("feature_transmission") && names.has("air_conditioning_price_per_day") && names.has("max_air_conditioning_price"),
        hasTemplateSpecs: names.has("drivetrain") && names.has("luggage_capacity") && names.has("rear_camera") && names.has("bluetooth_enabled") && names.has("carplay_enabled") && names.has("android_auto_enabled"),
    };
}

export async function loadCarTemplateFormOptions(db: D1Database) {
    const [brands, models, rawBodyTypes, rawFuelTypes] = await Promise.all([
        getCachedCarBrands(db) as Promise<DictionaryRow[]>,
        getCachedCarModels(db) as Promise<ModelRow[]>,
        getCachedBodyTypes(db) as Promise<DictionaryRow[]>,
        getCachedFuelTypes(db) as Promise<DictionaryRow[]>,
    ]);

    const excludedBodyTypes = new Set(["convertible", "scooter", "wagon"]);
    const bodyTypes = rawBodyTypes.filter((item) => !excludedBodyTypes.has(item.name.toLowerCase()));
    const allowedFuelNames = new Set(["petrol", "diesel", "electric", "hybrid", "benzin", "benzine", "benzin/gasoline", "gasoline", "бензин", "дизель", "электро", "гибрид"]);
    const fuelTypes = rawFuelTypes.filter((item) => allowedFuelNames.has(item.name.toLowerCase()));

    return { brands, models, bodyTypes, fuelTypes };
}

export async function loadEditableCarTemplate(db: D1Database, templateId: number): Promise<EditableCarTemplateRow | null> {
    const { hasFeatureFlags, hasFeatureDetails, hasTemplateSpecs } = await getCarTemplateFeatureSchema(db);

    if (hasFeatureFlags && hasFeatureDetails && hasTemplateSpecs) {
        return await db
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
            .first() as EditableCarTemplateRow | null;
    }

    if (hasFeatureFlags) {
        return await db
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
            }) : null) as EditableCarTemplateRow | null;
    }

    return await db
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
        }) : null) as EditableCarTemplateRow | null;
}

export function parseCarTemplateFormData(formData: FormData) {
    return parseWithSchema(
        carTemplateFormSchema,
        {
            brand_id: formData.get("brand_id"),
            model_id: formData.get("model_id"),
            transmission: formData.get("transmission"),
            engine_volume: formData.get("engine_volume"),
            body_type_id: formData.get("body_type_id"),
            seats: formData.get("seats"),
            doors: formData.get("doors"),
            fuel_type_id: formData.get("fuel_type_id"),
            description: formData.get("description"),
            photos: formData.get("photos"),
            feature_transmission: formData.get("feature_transmission"),
            feature_air_conditioning: formData.get("feature_air_conditioning"),
            air_conditioning_price_per_day: formData.get("air_conditioning_price_per_day"),
            max_air_conditioning_price: formData.get("max_air_conditioning_price"),
            feature_abs: formData.get("feature_abs"),
            feature_airbags: formData.get("feature_airbags"),
            drivetrain: formData.get("drivetrain"),
            luggage_capacity: formData.get("luggage_capacity"),
            rear_camera: formData.get("rear_camera"),
            bluetooth_enabled: formData.get("bluetooth_enabled"),
            carplay_enabled: formData.get("carplay_enabled"),
            android_auto_enabled: formData.get("android_auto_enabled"),
        },
        "Validation failed",
    );
}

export async function createCarTemplate(db: D1Database, formData: FormData) {
    const schema = await getCarTemplateFeatureSchema(db);
    const parsed = parseCarTemplateFormData(formData);
    if (!parsed.ok) {
        return parsed;
    }

    const data = parsed.data;
    const nowIso = new Date().toISOString();

    if (schema.hasFeatureFlags && schema.hasFeatureDetails && schema.hasTemplateSpecs) {
        await db.prepare(`
            INSERT INTO car_templates (
                brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors,
                fuel_type_id, description, photos, feature_transmission, feature_air_conditioning, air_conditioning_price_per_day, max_air_conditioning_price, feature_abs, feature_airbags,
                drivetrain, luggage_capacity, rear_camera, bluetooth_enabled, carplay_enabled, android_auto_enabled, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            data.brand_id, data.model_id, data.transmission, data.engine_volume, data.body_type_id,
            data.seats, data.doors, data.fuel_type_id, data.description as string | null, data.photos as string | null,
            data.feature_transmission ?? null, data.feature_air_conditioning, data.air_conditioning_price_per_day, data.max_air_conditioning_price,
            data.feature_abs, data.feature_airbags, data.drivetrain ?? null, data.luggage_capacity ?? null,
            data.rear_camera, data.bluetooth_enabled, data.carplay_enabled, data.android_auto_enabled, nowIso, nowIso,
        ).run();
        return parsed;
    }

    if (schema.hasFeatureFlags) {
        await db.prepare(`
            INSERT INTO car_templates (
                brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors,
                fuel_type_id, description, photos, feature_air_conditioning, feature_abs, feature_airbags, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            data.brand_id, data.model_id, data.transmission, data.engine_volume, data.body_type_id,
            data.seats, data.doors, data.fuel_type_id, data.description as string | null, data.photos as string | null,
            data.feature_air_conditioning, data.feature_abs, data.feature_airbags, nowIso, nowIso,
        ).run();
        return parsed;
    }

    await db.prepare(`
        INSERT INTO car_templates (
            brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors,
            fuel_type_id, description, photos, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        data.brand_id, data.model_id, data.transmission, data.engine_volume, data.body_type_id,
        data.seats, data.doors, data.fuel_type_id, data.description as string | null, data.photos as string | null,
        nowIso, nowIso,
    ).run();
    return parsed;
}

export async function updateCarTemplate(db: D1Database, templateId: number, formData: FormData) {
    const schema = await getCarTemplateFeatureSchema(db);
    const parsed = parseCarTemplateFormData(formData);
    if (!parsed.ok) {
        return parsed;
    }

    const data = parsed.data;
    const nowIso = new Date().toISOString();

    if (schema.hasFeatureFlags && schema.hasFeatureDetails && schema.hasTemplateSpecs) {
        await db.prepare(`
            UPDATE car_templates
            SET brand_id = ?, model_id = ?, transmission = ?, engine_volume = ?, body_type_id = ?,
                seats = ?, doors = ?, fuel_type_id = ?, description = ?, photos = ?,
                feature_transmission = ?, feature_air_conditioning = ?, air_conditioning_price_per_day = ?, max_air_conditioning_price = ?, feature_abs = ?, feature_airbags = ?,
                drivetrain = ?, luggage_capacity = ?, rear_camera = ?, bluetooth_enabled = ?, carplay_enabled = ?, android_auto_enabled = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            data.brand_id, data.model_id, data.transmission, data.engine_volume, data.body_type_id,
            data.seats, data.doors, data.fuel_type_id, data.description as string | null, data.photos as string | null,
            data.feature_transmission ?? null, data.feature_air_conditioning, data.air_conditioning_price_per_day, data.max_air_conditioning_price,
            data.feature_abs, data.feature_airbags, data.drivetrain ?? null, data.luggage_capacity ?? null,
            data.rear_camera, data.bluetooth_enabled, data.carplay_enabled, data.android_auto_enabled, nowIso, templateId,
        ).run();
        return parsed;
    }

    if (schema.hasFeatureFlags) {
        await db.prepare(`
            UPDATE car_templates
            SET brand_id = ?, model_id = ?, transmission = ?, engine_volume = ?, body_type_id = ?,
                seats = ?, doors = ?, fuel_type_id = ?, description = ?, photos = ?,
                feature_air_conditioning = ?, feature_abs = ?, feature_airbags = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            data.brand_id, data.model_id, data.transmission, data.engine_volume, data.body_type_id,
            data.seats, data.doors, data.fuel_type_id, data.description as string | null, data.photos as string | null,
            data.feature_air_conditioning, data.feature_abs, data.feature_airbags, nowIso, templateId,
        ).run();
        return parsed;
    }

    await db.prepare(`
        UPDATE car_templates
        SET brand_id = ?, model_id = ?, transmission = ?, engine_volume = ?, body_type_id = ?,
            seats = ?, doors = ?, fuel_type_id = ?, description = ?, photos = ?, updated_at = ?
        WHERE id = ?
    `).bind(
        data.brand_id, data.model_id, data.transmission, data.engine_volume, data.body_type_id,
        data.seats, data.doors, data.fuel_type_id, data.description as string | null, data.photos as string | null,
        nowIso, templateId,
    ).run();
    return parsed;
}
