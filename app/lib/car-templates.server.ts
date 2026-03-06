import { z } from "zod";
import { QUERY_LIMITS } from "~/lib/query-limits";
import { parseWithSchema } from "~/lib/validation.server";
import { quickAudit } from "~/lib/audit-logger";

export interface BrandRow {
  id: number;
  name: string;
  logo_url?: string | null;
  created_at?: string;
}

export interface ModelRow {
  id: number;
  name: string;
  brand_id: number;
  body_type_id?: number | null;
  created_at?: string;
  brand_name?: string | null;
}

export interface TemplateRow {
  id: number;
  brand_id: number;
  model_id: number;
  transmission?: string | null;
  engine_volume?: number | null;
  body_type_id?: number | null;
  seats?: number | null;
  doors?: number | null;
  fuel_type_id?: number | null;
  photos?: string | null;
  created_at?: string;
  brand_name?: string | null;
  model_name?: string | null;
  fuel_type_name?: string | null;
}

type AdminUser = {
  id: string;
  role: string;
  companyId?: number | null;
};

type Metadata = {
  ipAddress?: string;
  userAgent?: string;
};

type ActionResult = { success?: boolean; message?: string; error?: string };

export async function loadCarTemplatesData(db: D1Database) {
  const [brands, models, templates] = await Promise.all([
    db
      .prepare(`SELECT id, name, logo_url, created_at FROM car_brands ORDER BY name ASC LIMIT ${QUERY_LIMITS.LARGE}`)
      .all()
      .then((r) => (r.results || []) as unknown as BrandRow[]),
    db
      .prepare(`
        SELECT
          cm.id,
          cm.name,
          cm.brand_id,
          cm.body_type_id,
          cm.created_at,
          cb.name AS brand_name
        FROM car_models cm
        LEFT JOIN car_brands cb ON cb.id = cm.brand_id
        ORDER BY cm.name ASC
        LIMIT ${QUERY_LIMITS.XL}
      `)
      .all()
      .then((r) => (r.results || []) as unknown as ModelRow[]),
    db
      .prepare(`
        SELECT
          ct.id,
          ct.brand_id,
          ct.model_id,
          ct.transmission,
          ct.engine_volume,
          ct.body_type_id,
          ct.seats,
          ct.doors,
          ct.fuel_type_id,
          ct.photos,
          ct.created_at,
          cb.name AS brand_name,
          cm.name AS model_name,
          ft.name AS fuel_type_name
        FROM car_templates ct
        LEFT JOIN car_brands cb ON cb.id = ct.brand_id
        LEFT JOIN car_models cm ON cm.id = ct.model_id
        LEFT JOIN fuel_types ft ON ft.id = ct.fuel_type_id
        ORDER BY ct.created_at DESC
        LIMIT ${QUERY_LIMITS.LARGE}
      `)
      .all()
      .then((r) => (r.results || []) as unknown as TemplateRow[]),
  ]);

  return { brands, models, templates };
}

export async function handleCarTemplatesAction({
  db,
  user,
  formData,
  metadata,
}: {
  db: D1Database;
  user: AdminUser;
  formData: FormData;
  metadata: Metadata;
}): Promise<ActionResult> {
  const normalizedMetadata: Metadata = {
    ipAddress: metadata.ipAddress ?? undefined,
    userAgent: metadata.userAgent ?? undefined,
  };
  const parsedIntent = parseWithSchema(
    z.object({
      intent: z.enum(["create_brand", "delete_brand", "create_model", "delete_model", "delete_template"]),
    }),
    {
      intent: formData.get("intent"),
    },
    "Invalid intent"
  );
  if (!parsedIntent.ok) {
    return { error: "Invalid intent" };
  }
  const intent = parsedIntent.data.intent;

  if (intent === "create_brand") {
    const name = String(formData.get("name") || "");
    if (!name) {
      return { error: "Brand name is required" };
    }
    await db
      .prepare("INSERT INTO car_brands (name, created_at, updated_at) VALUES (?, ?, ?)")
      .bind(name, new Date().toISOString(), new Date().toISOString())
      .run();
    quickAudit({
      db,
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
      entityType: "brand",
      action: "create",
      afterState: { name },
      ...normalizedMetadata,
    });
    return { success: true, message: "Brand created successfully" };
  }

  if (intent === "delete_brand") {
    const id = formData.get("id");
    if (!id) {
      return { error: "Brand ID is required" };
    }
    const brandId = Number(id);
    await db.prepare("DELETE FROM car_brands WHERE id = ?").bind(brandId).run();
    quickAudit({
      db,
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
      entityType: "brand",
      entityId: brandId,
      action: "delete",
      ...normalizedMetadata,
    });
    return { success: true, message: "Brand deleted successfully" };
  }

  if (intent === "create_model") {
    const name = formData.get("name") as string;
    const brand_id = formData.get("brand_id") as string;
    if (!name || !brand_id) {
      return { error: "Model name and brand are required" };
    }
    await db
      .prepare("INSERT INTO car_models (name, brand_id, created_at, updated_at) VALUES (?, ?, ?, ?)")
      .bind(name, Number(brand_id), new Date().toISOString(), new Date().toISOString())
      .run();
    quickAudit({
      db,
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
      entityType: "model",
      action: "create",
      afterState: { name, brandId: Number(brand_id) },
      ...normalizedMetadata,
    });
    return { success: true, message: "Model created successfully" };
  }

  if (intent === "delete_model") {
    const id = formData.get("id");
    if (!id) {
      return { error: "Model ID is required" };
    }
    const modelId = Number(id);
    await db.prepare("DELETE FROM car_models WHERE id = ?").bind(modelId).run();
    quickAudit({
      db,
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
      entityType: "model",
      entityId: modelId,
      action: "delete",
      ...normalizedMetadata,
    });
    return { success: true, message: "Model deleted successfully" };
  }

  if (intent === "delete_template") {
    const id = formData.get("id");
    if (!id) {
      return { error: "Template ID is required" };
    }
    const templateId = Number(id);
    await db.prepare("DELETE FROM car_templates WHERE id = ?").bind(templateId).run();
    quickAudit({
      db,
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
      entityType: "car_template",
      entityId: templateId,
      action: "delete",
      ...normalizedMetadata,
    });
    return { success: true, message: "Template deleted successfully" };
  }

  return { error: "Invalid intent" };
}
