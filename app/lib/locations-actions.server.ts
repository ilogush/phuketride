import { data, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import type { SessionUser } from "~/lib/auth.server";
import { parseWithSchema } from "~/lib/validation.server";

type LocationsActionArgs = {
  db: D1Database;
  user: SessionUser;
  formData: FormData;
  companyId: number | null;
  isModMode: boolean;
};

function toJsonList(value: string | null | undefined): string {
  const normalized = (value || "").trim();
  const list = normalized.split(",").map((item) => item.trim()).filter(Boolean);
  return JSON.stringify(list);
}

function forbiddenResponse() {
  return data({ success: false, message: "Forbidden" }, { status: 403 });
}

function invalidResponse(message: string) {
  return data({ success: false, message }, { status: 400 });
}

async function upsertCompanyDeliverySetting(params: {
  db: D1Database;
  effectiveCompanyId: number;
  districtId: number;
  isActive: boolean;
  deliveryPrice: number;
}) {
  const { db, effectiveCompanyId, districtId, isActive, deliveryPrice } = params;
  const now = new Date().toISOString();
  const updateResult = await db
    .prepare(`
      UPDATE company_delivery_settings
      SET is_active = ?, delivery_price = ?, updated_at = ?
      WHERE company_id = ? AND district_id = ?
    `)
    .bind(isActive ? 1 : 0, deliveryPrice, now, effectiveCompanyId, districtId)
    .run() as { meta?: { changes?: number } };

  if ((updateResult.meta?.changes || 0) === 0) {
    await db
      .prepare(`
        INSERT INTO company_delivery_settings (company_id, district_id, is_active, delivery_price, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(effectiveCompanyId, districtId, isActive ? 1 : 0, deliveryPrice, now, now)
      .run();
  }
}

async function handleBulkUpdateCompanyDelivery(db: D1Database, formData: FormData, effectiveCompanyId: number | null) {
  if (!effectiveCompanyId) {
    return forbiddenResponse();
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
    return invalidResponse("Invalid updates payload");
  }

  const updates = JSON.parse(updatesParsed.data.updates) as Array<{ id: number; isActive: boolean; deliveryPrice: number }>;
  for (const update of updates) {
    await upsertCompanyDeliverySetting({
      db,
      effectiveCompanyId,
      districtId: update.id,
      isActive: !!update.isActive,
      deliveryPrice: Number(update.deliveryPrice) || 0,
    });
  }

  return data({ success: true, message: "All changes saved successfully" });
}

async function handleToggleCompanyDelivery(db: D1Database, formData: FormData, effectiveCompanyId: number | null) {
  if (!effectiveCompanyId) {
    return forbiddenResponse();
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
    return invalidResponse("Invalid toggle payload");
  }

  const id = toggleParsed.data.id;
  const isActive = toggleParsed.data.isActive === "true";
  const currentPrice = toggleParsed.data.deliveryPrice;

  const fallbackPriceRow = await db
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

  await upsertCompanyDeliverySetting({
    db,
    effectiveCompanyId,
    districtId: id,
    isActive,
    deliveryPrice,
  });

  return data({ success: true, message: "Status updated successfully" });
}

async function handleUpdateCompanyDeliveryPrice(db: D1Database, formData: FormData, effectiveCompanyId: number | null) {
  if (!effectiveCompanyId) {
    return forbiddenResponse();
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
    return invalidResponse("Invalid price payload");
  }

  const id = priceParsed.data.id;
  const deliveryPrice = priceParsed.data.deliveryPrice;
  const safeDeliveryPrice = Number.isFinite(deliveryPrice) ? deliveryPrice : 0;

  const districtResult = await db
    .prepare(`
      SELECT is_active
      FROM company_delivery_settings
      WHERE company_id = ? AND district_id = ?
      LIMIT 1
    `)
    .bind(effectiveCompanyId, id)
    .first() as { is_active?: number } | null;

  const isActive = districtResult ? !!districtResult.is_active : true;
  await upsertCompanyDeliverySetting({
    db,
    effectiveCompanyId,
    districtId: id,
    isActive,
    deliveryPrice: safeDeliveryPrice,
  });

  return data({ success: true, message: "Price updated successfully" });
}

async function handleDeleteDistrict(db: D1Database, formData: FormData) {
  const deleteParsed = parseWithSchema(
    z.object({
      id: z.coerce.number().int().positive("District id is required"),
    }),
    { id: formData.get("id") },
    "Invalid delete payload"
  );
  if (!deleteParsed.ok) {
    return invalidResponse("Invalid delete payload");
  }

  await db.prepare("DELETE FROM districts WHERE id = ?").bind(deleteParsed.data.id).run();
  return data({ success: true, message: "District deleted successfully" });
}

async function handleUpdateDistrict(db: D1Database, formData: FormData) {
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

  await db
    .prepare(`
      UPDATE districts
      SET name = ?, beaches = ?, streets = ?, delivery_price = ?, updated_at = ?
      WHERE id = ?
    `)
    .bind(name, beachesJson, streetsJson, deliveryPrice, new Date().toISOString(), id)
    .run();

  return data({ success: true, message: "District updated successfully" });
}

async function handleCreateDistrict(db: D1Database, formData: FormData) {
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

  await db
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

export async function handleLocationsAction({
  db,
  user,
  formData,
  companyId,
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

  if (intent === "bulkUpdate") {
    if (!canManageCompanyDelivery || !companyId) {
      return forbiddenResponse();
    }
    return handleBulkUpdateCompanyDelivery(db, formData, companyId);
  }

  if (intent === "toggleStatus") {
    if (!canManageCompanyDelivery || !companyId) {
      return forbiddenResponse();
    }
    return handleToggleCompanyDelivery(db, formData, companyId);
  }

  if (intent === "updatePrice") {
    if (!canManageCompanyDelivery || !companyId) {
      return forbiddenResponse();
    }
    return handleUpdateCompanyDeliveryPrice(db, formData, companyId);
  }

  if (intent === "delete") {
    if (!canManageDistrictTemplates) {
      return forbiddenResponse();
    }
    return handleDeleteDistrict(db, formData);
  }

  if (intent === "update") {
    if (!canManageDistrictTemplates) {
      return forbiddenResponse();
    }
    return handleUpdateDistrict(db, formData);
  }

  if (intent === "create") {
    if (!canManageDistrictTemplates) {
      return forbiddenResponse();
    }
    return handleCreateDistrict(db, formData);
  }

  return data({ success: false, message: "Invalid action" }, { status: 400 });
}
