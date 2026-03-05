import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { requireAdmin } from "~/lib/auth.server";

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

function parseBoolFromFeatures(features: Array<{ category: string; name: string }>, matcher: (name: string, category: string) => boolean) {
    return features.some((item) => matcher(item.name.toLowerCase(), item.category.toLowerCase())) ? 1 : 0;
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    await requireAdmin(request);
    const templateId = Number(params.id || 0);
    if (!Number.isFinite(templateId) || templateId <= 0) {
        return Response.json({ ok: false, error: "Invalid template id" }, { status: 400 });
    }

    const { hasFeatureFlags, hasFeatureDetails, hasTemplateSpecs } = await getTemplateFeatureSchema(context.cloudflare.env.DB);
    if (!hasFeatureFlags) {
        return Response.json({ ok: false, error: "Feature flag columns are missing. Apply migration add_car_template_feature_flags.sql first." }, { status: 409 });
    }

    const row = hasFeatureDetails && hasTemplateSpecs
        ? await context.cloudflare.env.DB
            .prepare(`
                SELECT
                    id,
                    feature_transmission AS featureTransmission,
                    feature_air_conditioning AS featureAirConditioning,
                    air_conditioning_price_per_day AS airConditioningPricePerDay,
                    max_air_conditioning_price AS maxAirConditioningPrice,
                    feature_abs AS featureAbs,
                    feature_airbags AS featureAirbags,
                    drivetrain AS drivetrain,
                    luggage_capacity AS luggageCapacity,
                    rear_camera AS rearCamera,
                    bluetooth_enabled AS bluetoothEnabled,
                    carplay_enabled AS carplayEnabled,
                    android_auto_enabled AS androidAutoEnabled
                FROM car_templates
                WHERE id = ?
                LIMIT 1
            `)
            .bind(templateId)
            .first() as {
                id?: number;
                featureTransmission?: string | null;
                featureAirConditioning?: number | null;
                airConditioningPricePerDay?: number | null;
                maxAirConditioningPrice?: number | null;
                featureAbs?: number | null;
                featureAirbags?: number | null;
                drivetrain?: string | null;
                luggageCapacity?: string | null;
                rearCamera?: number | null;
                bluetoothEnabled?: number | null;
                carplayEnabled?: number | null;
                androidAutoEnabled?: number | null;
            } | null
        : await context.cloudflare.env.DB
            .prepare(`
                SELECT
                    id,
                    feature_air_conditioning AS featureAirConditioning,
                    feature_abs AS featureAbs,
                    feature_airbags AS featureAirbags
                FROM car_templates
                WHERE id = ?
                LIMIT 1
            `)
            .bind(templateId)
            .first() as {
                id?: number;
                featureAirConditioning?: number | null;
                featureAbs?: number | null;
                featureAirbags?: number | null;
            } | null;

    if (!row?.id) {
        return Response.json({ ok: false, error: "Template not found" }, { status: 404 });
    }

    return Response.json({
        ok: true,
        data: {
            feature_transmission: (row as { featureTransmission?: string | null }).featureTransmission || null,
            feature_air_conditioning: Number(row.featureAirConditioning || 0),
            air_conditioning_price_per_day: Number((row as { airConditioningPricePerDay?: number | null }).airConditioningPricePerDay || 0),
            max_air_conditioning_price: Number((row as { maxAirConditioningPrice?: number | null }).maxAirConditioningPrice || 0),
            feature_abs: Number(row.featureAbs || 0),
            feature_airbags: Number(row.featureAirbags || 0),
            drivetrain: (row as { drivetrain?: string | null }).drivetrain || null,
            luggage_capacity: (row as { luggageCapacity?: string | null }).luggageCapacity || null,
            rear_camera: Number((row as { rearCamera?: number | null }).rearCamera || 0),
            bluetooth_enabled: Number((row as { bluetoothEnabled?: number | null }).bluetoothEnabled || 0),
            carplay_enabled: Number((row as { carplayEnabled?: number | null }).carplayEnabled || 0),
            android_auto_enabled: Number((row as { androidAutoEnabled?: number | null }).androidAutoEnabled || 0),
        },
    });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    await requireAdmin(request);
    const templateId = Number(params.id || 0);
    if (!Number.isFinite(templateId) || templateId <= 0) {
        return Response.json({ ok: false, error: "Invalid template id" }, { status: 400 });
    }

    const formData = await request.formData();
    const intent = String(formData.get("intent") || "import");
    const redirectTo = String(formData.get("redirectTo") || "").trim();

    if (intent !== "import") {
        return Response.json({ ok: false, error: "Unsupported intent" }, { status: 400 });
    }

    const { hasFeatureFlags, hasFeatureDetails, hasTemplateSpecs } = await getTemplateFeatureSchema(context.cloudflare.env.DB);
    if (!hasFeatureFlags) {
        const message = "Apply migration add_car_template_feature_flags.sql first";
        if (redirectTo) return redirect(`${redirectTo}?error=${encodeURIComponent(message)}`);
        return Response.json({ ok: false, error: message }, { status: 409 });
    }

    const sourceCar = await context.cloudflare.env.DB
        .prepare(`
            SELECT id
            FROM company_cars
            WHERE template_id = ?
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
        `)
        .bind(templateId)
        .first() as { id?: number } | null;

    if (!sourceCar?.id) {
        const message = "No car found for this template";
        if (redirectTo) return redirect(`${redirectTo}?error=${encodeURIComponent(message)}`);
        return Response.json({ ok: false, error: message }, { status: 404 });
    }

    const featuresResult = await context.cloudflare.env.DB
        .prepare(`
            SELECT category, name
            FROM car_features
            WHERE company_car_id = ?
              AND category IN ('Specifications', 'Safety')
            ORDER BY sort_order ASC, id ASC
        `)
        .bind(sourceCar.id)
        .all() as { results?: Array<{ category?: string | null; name?: string | null }> };

    const features = (featuresResult.results || [])
        .map((item) => ({
            category: String(item.category || "").trim(),
            name: String(item.name || "").trim(),
        }))
        .filter((item) => item.category && item.name);

    const featureTransmission = features.some((item) => item.category.toLowerCase() === "specifications" && item.name.toLowerCase().includes("manual"))
        ? "manual"
        : (features.some((item) => item.category.toLowerCase() === "specifications" && item.name.toLowerCase().includes("automatic")) ? "automatic" : null);
    const featureAirConditioning = parseBoolFromFeatures(features, (name, category) =>
        category === "specifications" && (name.includes("air conditioning") || name === "a/c" || name === "ac")
    );
    const featureAbs = parseBoolFromFeatures(features, (name, category) =>
        category === "safety" && (name === "abs" || name.includes("anti-lock braking"))
    );
    const featureAirbags = parseBoolFromFeatures(features, (name, category) =>
        category === "safety" && name.includes("airbag")
    );
    const rearCamera = parseBoolFromFeatures(features, (name, category) =>
        category === "safety" && (name.includes("rear camera") || name.includes("backup camera"))
    );
    const bluetoothEnabled = parseBoolFromFeatures(features, (name, category) =>
        category === "specifications" && name.includes("bluetooth")
    );
    const carplayEnabled = parseBoolFromFeatures(features, (name, category) =>
        category === "specifications" && (name.includes("carplay") || name.includes("apple carplay"))
    );
    const androidAutoEnabled = parseBoolFromFeatures(features, (name, category) =>
        category === "specifications" && name.includes("android auto")
    );

    if (hasFeatureDetails && hasTemplateSpecs) {
        await context.cloudflare.env.DB
            .prepare(`
                UPDATE car_templates
                SET
                    feature_transmission = ?,
                    feature_air_conditioning = ?,
                    feature_abs = ?,
                    feature_airbags = ?,
                    rear_camera = ?,
                    bluetooth_enabled = ?,
                    carplay_enabled = ?,
                    android_auto_enabled = ?,
                    updated_at = ?
                WHERE id = ?
            `)
            .bind(
                featureTransmission,
                featureAirConditioning,
                featureAbs,
                featureAirbags,
                rearCamera,
                bluetoothEnabled,
                carplayEnabled,
                androidAutoEnabled,
                new Date().toISOString(),
                templateId
            )
            .run();
    } else {
        await context.cloudflare.env.DB
            .prepare(`
                UPDATE car_templates
                SET
                    feature_air_conditioning = ?,
                    feature_abs = ?,
                    feature_airbags = ?,
                    updated_at = ?
                WHERE id = ?
            `)
            .bind(
                featureAirConditioning,
                featureAbs,
                featureAirbags,
                new Date().toISOString(),
                templateId
            )
            .run();
    }

    if (redirectTo) {
        return redirect(`${redirectTo}?success=${encodeURIComponent("Features imported from linked car")}`);
    }

    return Response.json({
        ok: true,
        data: {
            feature_transmission: featureTransmission,
            feature_air_conditioning: featureAirConditioning,
            feature_abs: featureAbs,
            feature_airbags: featureAirbags,
        },
    });
}
