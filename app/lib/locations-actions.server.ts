import { data, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import type { SessionUser } from "~/lib/auth.server";
import { parseWithSchema } from "~/lib/validation.server";

type LocationsActionArgs = {
  context: ActionFunctionArgs["context"];
  user: SessionUser;
  formData: FormData;
  effectiveCompanyId: number | null;
  isModMode: boolean;
};

function toJsonList(value: string | null | undefined): string {
  const normalized = (value || "").trim();
  const list = normalized.split(",").map((item) => item.trim()).filter(Boolean);
  return JSON.stringify(list);
}

export async function handleLocationsAction({
  context,
  user,
  formData,
  effectiveCompanyId,
  isModMode,
}: LocationsActionArgs) {
  const canManageCompanyDelivery = user.role === "partner" || isModMode;
  const canManageDistrictTemplates = user.role === "admin" && !isModMode;

  if (!canManageDistrictTemplates && !canManageCompanyDelivery) {
    return data({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const intentParsed = parseWithSchema(
    z.enum(["bulkUpdate", "toggleStatus", "updatePrice", "delete", "update", "create"]),
    formData.get("intent"),
    "Invalid action"
  );
  if (!intentParsed.ok) {
    return data({ success: false, message: "Invalid action" }, { status: 400 });
  }
  const intent = intentParsed.data;

  const upsertCompanyDeliverySetting = async (districtId: number, isActive: boolean, deliveryPrice: number) => {
    if (!effectiveCompanyId) return;
    const now = new Date().toISOString();
    const updateResult = await context.cloudflare.env.DB
      .prepare(`
        UPDATE company_delivery_settings
        SET is_active = ?, delivery_price = ?, updated_at = ?
        WHERE company_id = ? AND district_id = ?
      `)
      .bind(isActive ? 1 : 0, deliveryPrice, now, effectiveCompanyId, districtId)
      .run() as { meta?: { changes?: number } };

    if ((updateResult.meta?.changes || 0) === 0) {
      await context.cloudflare.env.DB
        .prepare(`
          INSERT INTO company_delivery_settings (company_id, district_id, is_active, delivery_price, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(effectiveCompanyId, districtId, isActive ? 1 : 0, deliveryPrice, now, now)
        .run();
    }
  };

  if (intent === "bulkUpdate") {
    if (!canManageCompanyDelivery || !effectiveCompanyId) {
      return data({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const updatesParsed = parseWithSchema(
      z.object({
        updates: z.string().min(2, "Updates payload is required"),
      }),
      {
        updates: formData.get("updates"),
      },
      "Invalid updates payload"
    );
    if (!updatesParsed.ok) {
      return data({ success: false, message: "Invalid updates payload" }, { status: 400 });
    }

    const updates = JSON.parse(updatesParsed.data.updates) as Array<{ id: number; isActive: boolean; deliveryPrice: number }>;
    for (const update of updates) {
      await upsertCompanyDeliverySetting(update.id, !!update.isActive, Number(update.deliveryPrice) || 0);
    }

    return data({ success: true, message: "All changes saved successfully" });
  }

  if (intent === "toggleStatus") {
    if (!canManageCompanyDelivery || !effectiveCompanyId) {
      return data({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const toggleParsed = parseWithSchema(
      z.object({
        id: z.coerce.number().int().positive("District id is required"),
        isActive: z.enum(["true", "false"]),
        deliveryPrice: z.coerce.number().optional(),
      }),
      {
        id: formData.get("id"),
        isActive: formData.get("isActive"),
        deliveryPrice: formData.get("deliveryPrice"),
      },
      "Invalid toggle payload"
    );
    if (!toggleParsed.ok) {
      return data({ success: false, message: "Invalid toggle payload" }, { status: 400 });
    }

    const id = toggleParsed.data.id;
    const isActive = toggleParsed.data.isActive === "true";
    const currentPrice = toggleParsed.data.deliveryPrice;

    const fallbackPriceRow = await context.cloudflare.env.DB
      .prepare(`
        SELECT
          cds.delivery_price AS company_delivery_price,
          d.delivery_price AS district_delivery_price
        FROM districts d
        LEFT JOIN company_delivery_settings cds
          ON cds.district_id = d.id AND cds.company_id = ?
        WHERE d.id = ?
        LIMIT 1
      `)
      .bind(effectiveCompanyId, id)
      .first() as { company_delivery_price?: number | null; district_delivery_price?: number | null } | null;

    const fallbackPrice = fallbackPriceRow?.company_delivery_price ?? fallbackPriceRow?.district_delivery_price ?? 0;
    const deliveryPrice = typeof currentPrice === "number" && Number.isFinite(currentPrice)
      ? currentPrice
      : Number(fallbackPrice);

    await upsertCompanyDeliverySetting(id, isActive, deliveryPrice);

    return data({ success: true, message: "Status updated successfully" });
  }

  if (intent === "updatePrice") {
    if (!canManageCompanyDelivery || !effectiveCompanyId) {
      return data({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const priceParsed = parseWithSchema(
      z.object({
        id: z.coerce.number().int().positive("District id is required"),
        deliveryPrice: z.coerce.number(),
      }),
      {
        id: formData.get("id"),
        deliveryPrice: formData.get("deliveryPrice"),
      },
      "Invalid price payload"
    );
    if (!priceParsed.ok) {
      return data({ success: false, message: "Invalid price payload" }, { status: 400 });
    }

    const id = priceParsed.data.id;
    const deliveryPrice = priceParsed.data.deliveryPrice;
    const safeDeliveryPrice = Number.isFinite(deliveryPrice) ? deliveryPrice : 0;

    const districtResult = await context.cloudflare.env.DB
      .prepare(`
        SELECT is_active
        FROM company_delivery_settings
        WHERE company_id = ? AND district_id = ?
        LIMIT 1
      `)
      .bind(effectiveCompanyId, id)
      .first() as { is_active?: number } | null;

    const isActive = districtResult ? !!districtResult.is_active : true;
    await upsertCompanyDeliverySetting(id, isActive, safeDeliveryPrice);

    return data({ success: true, message: "Price updated successfully" });
  }

  if (intent === "delete") {
    if (!canManageDistrictTemplates) {
      return data({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const deleteParsed = parseWithSchema(
      z.object({
        id: z.coerce.number().int().positive("District id is required"),
      }),
      { id: formData.get("id") },
      "Invalid delete payload"
    );
    if (!deleteParsed.ok) {
      return data({ success: false, message: "Invalid delete payload" }, { status: 400 });
    }

    await context.cloudflare.env.DB.prepare("DELETE FROM districts WHERE id = ?").bind(deleteParsed.data.id).run();
    return data({ success: true, message: "District deleted successfully" });
  }

  if (intent === "update") {
    if (!canManageDistrictTemplates) {
      return data({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const updateParsed = parseWithSchema(
      z.object({
        id: z.coerce.number().int().positive("District id is required"),
        name: z.string().trim().min(1, "District name is required").max(200, "District name is too long"),
        beaches: z.string().trim().optional().nullable(),
        streets: z.string().trim().optional().nullable(),
        deliveryPrice: z.coerce.number().min(0, "Delivery price must be 0 or greater"),
      }),
      {
        id: formData.get("id"),
        name: formData.get("name"),
        beaches: formData.get("beaches"),
        streets: formData.get("streets"),
        deliveryPrice: formData.get("deliveryPrice"),
      },
      "Invalid update payload"
    );
    if (!updateParsed.ok) {
      return data({ success: false, message: updateParsed.error }, { status: 400 });
    }

    const { id, name, deliveryPrice } = updateParsed.data;
    const beachesJson = toJsonList(updateParsed.data.beaches);
    const streetsJson = toJsonList(updateParsed.data.streets);

    await context.cloudflare.env.DB
      .prepare(`
        UPDATE districts
        SET name = ?, beaches = ?, streets = ?, delivery_price = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(name, beachesJson, streetsJson, deliveryPrice, new Date().toISOString(), id)
      .run();

    return data({ success: true, message: "District updated successfully" });
  }

  if (intent === "create") {
    if (!canManageDistrictTemplates) {
      return data({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const createParsed = parseWithSchema(
      z.object({
        name: z.string().trim().min(1, "District name is required").max(200, "District name is too long"),
        beaches: z.string().trim().optional().nullable(),
        streets: z.string().trim().optional().nullable(),
        deliveryPrice: z.coerce.number().min(0, "Delivery price must be 0 or greater"),
      }),
      {
        name: formData.get("name"),
        beaches: formData.get("beaches"),
        streets: formData.get("streets"),
        deliveryPrice: formData.get("deliveryPrice"),
      },
      "Invalid create payload"
    );
    if (!createParsed.ok) {
      return data({ success: false, message: createParsed.error }, { status: 400 });
    }

    const beachesJson = toJsonList(createParsed.data.beaches);
    const streetsJson = toJsonList(createParsed.data.streets);

    await context.cloudflare.env.DB
      .prepare(`
        INSERT INTO districts (name, location_id, beaches, streets, delivery_price, created_at, updated_at)
        VALUES (?, 1, ?, ?, ?, ?, ?)
      `)
      .bind(
        createParsed.data.name,
        beachesJson,
        streetsJson,
        createParsed.data.deliveryPrice,
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    return data({ success: true, message: "District created successfully" });
  }

  return data({ success: false, message: "Invalid action" }, { status: 400 });
}
