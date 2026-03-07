import { type ActionFunctionArgs, redirect } from "react-router";
import type { PaymentTemplateRow } from "~/lib/db-types";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import type { SessionUser } from "~/lib/auth.server";
import { getAdminModCompanyId, withModCompanyId } from "~/lib/mod-mode.server";
import { invalidateSettingsCaches } from "~/lib/dictionaries-cache.server";
import { enforcePhuketCurrencyInvariant } from "~/lib/settings-currency-policy.server";
import { isPhuketName, normalizeCompanyRow } from "~/lib/settings-normalizers";
import { parseWithSchema } from "~/lib/validation.server";
import { companySchema } from "~/schemas/company";

type SettingsActionContext = ActionFunctionArgs["context"];
type CompanyRow = Record<string, unknown>;
type DeliveryDistrictRow = {
  id: number;
  deliveryPrice: number | null;
};
type CompanyDeliverySettingRow = {
  id: number;
  districtId: number;
  deliveryPrice: number | null;
};

type SettingsActionArgs = {
  request: Request;
  context: SettingsActionContext;
  user: SessionUser;
  companyId: number;
  formData: FormData;
};

type SettingsActionState = {
  withMode: (path: string) => string;
  currentCompany: Record<string, unknown> | null;
  resolveIsPhuketCompany: () => Promise<boolean>;
};

function parseMoneyValue(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(Math.abs(parsed) * 100) / 100;
}

function parseIntegerValue(value: FormDataEntryValue | null, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(Math.abs(parsed)));
}

async function handleUpdateGeneral(args: SettingsActionArgs, state: SettingsActionState) {
  const { context, formData, companyId, request, user } = args;
  const rawData = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    telegram: (formData.get("telegram") as string) || null,
    locationId: Number(formData.get("locationId")),
    districtId: Number(formData.get("districtId")),
    street: formData.get("street") as string,
    houseNumber: formData.get("houseNumber") as string,
    bankName: (formData.get("bankName") as string) || null,
    accountNumber: (formData.get("accountNumber") as string) || null,
    accountName: (formData.get("accountName") as string) || null,
    swiftCode: (formData.get("swiftCode") as string) || null,
    deliveryFeeAfterHours: parseMoneyValue(formData.get("deliveryFeeAfterHours")) ?? 0,
    islandTripPrice: parseMoneyValue(formData.get("islandTripPrice")),
    krabiTripPrice: parseMoneyValue(formData.get("krabiTripPrice")),
    babySeatPricePerDay: parseIntegerValue(formData.get("babySeatPricePerDay"), 0),
  };

  const validation = parseWithSchema(companySchema, rawData, "Validation failed");
  if (!validation.ok) {
    return redirect(state.withMode(`/settings?error=${encodeURIComponent(validation.error)}`));
  }

  const validData = validation.data;
  const weeklySchedule = formData.get("weeklySchedule") as string;
  const holidays = formData.get("holidays") as string;

  try {
    await context.cloudflare.env.DB
      .prepare(`
        UPDATE companies
        SET name = ?, email = ?, phone = ?, telegram = ?, location_id = ?, district_id = ?,
            street = ?, house_number = ?, bank_name = ?, account_number = ?, account_name = ?,
            swift_code = ?, delivery_fee_after_hours = ?, island_trip_price = ?,
            krabi_trip_price = ?, baby_seat_price_per_day = ?, weekly_schedule = ?, holidays = ?,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(
        validData.name,
        validData.email,
        validData.phone,
        validData.telegram,
        validData.locationId,
        validData.districtId,
        validData.street,
        validData.houseNumber,
        validData.bankName,
        validData.accountNumber,
        validData.accountName,
        validData.swiftCode,
        validData.deliveryFeeAfterHours,
        validData.islandTripPrice,
        validData.krabiTripPrice,
        validData.babySeatPricePerDay,
        weeklySchedule,
        holidays,
        new Date().toISOString(),
        companyId
      )
      .run();

    const locationDistrictsResult = await context.cloudflare.env.DB
      .prepare("SELECT id, delivery_price AS deliveryPrice FROM districts WHERE location_id = ?")
      .bind(validData.locationId)
      .all() as { results?: DeliveryDistrictRow[] };
    const locationDistricts = locationDistrictsResult.results || [];

    const existingCompanySettingsResult = await context.cloudflare.env.DB
      .prepare(`
        SELECT id, district_id AS districtId, delivery_price AS deliveryPrice
        FROM company_delivery_settings
        WHERE company_id = ?
      `)
      .bind(companyId)
      .all() as { results?: CompanyDeliverySettingRow[] };
    const existingCompanySettings = existingCompanySettingsResult.results || [];

    const settingsByDistrictId = new Map(existingCompanySettings.map((row) => [row.districtId, row]));

    for (const district of locationDistricts) {
      const existing = settingsByDistrictId.get(district.id);
      const isCompanyDistrict = district.id === validData.districtId;
      const nextPrice = isCompanyDistrict ? 0 : (existing?.deliveryPrice ?? district.deliveryPrice ?? 0);

      if (existing) {
        await context.cloudflare.env.DB
          .prepare(`
            UPDATE company_delivery_settings
            SET is_active = ?, delivery_price = ?, updated_at = ?
            WHERE id = ?
          `)
          .bind(isCompanyDistrict ? 1 : 0, nextPrice, new Date().toISOString(), existing.id)
          .run();
      } else {
        await context.cloudflare.env.DB
          .prepare(`
            INSERT INTO company_delivery_settings (
              company_id, district_id, is_active, delivery_price, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `)
          .bind(
            companyId,
            district.id,
            isCompanyDistrict ? 1 : 0,
            nextPrice,
            new Date().toISOString(),
            new Date().toISOString()
          )
          .run();
      }
    }

    const locationName = await context.cloudflare.env.DB
      .prepare("SELECT name FROM locations WHERE id = ? LIMIT 1")
      .bind(validData.locationId)
      .first() as { name?: string } | null;

    if (isPhuketName(locationName?.name)) {
      await enforcePhuketCurrencyInvariant(context.cloudflare.env.DB, companyId);
    }

    invalidateSettingsCaches(companyId);

    const metadata = getRequestMetadata(request);
    quickAudit({
      db: context.cloudflare.env.DB,
      userId: user.id,
      role: user.role,
      companyId,
      entityType: "company",
      entityId: companyId,
      action: "update",
      beforeState: state.currentCompany,
      afterState: { ...validData, id: companyId },
      ...metadata,
    });

    return redirect(state.withMode("/settings?success=Settings updated successfully"));
  } catch {
    return redirect(state.withMode("/settings?error=Failed to update settings"));
  }
}

async function handleSetDefaultCurrency(args: SettingsActionArgs, state: SettingsActionState) {
  const { context, formData, companyId } = args;
  const currencyId = Number(formData.get("currencyId"));
  const isPhuketCompany = await state.resolveIsPhuketCompany();

  try {
    if (isPhuketCompany) {
      const targetCurrency = await context.cloudflare.env.DB
        .prepare("SELECT code FROM currencies WHERE id = ? LIMIT 1")
        .bind(currencyId)
        .first() as { code?: string } | null;
      if (String(targetCurrency?.code || "").toUpperCase() !== "THB") {
        return redirect(state.withMode("/settings?tab=currencies&error=Phuket companies must use THB as default currency"));
      }
    }

    await context.cloudflare.env.DB
      .prepare("UPDATE currencies SET company_id = ?, is_active = 1, updated_at = ? WHERE id = ?")
      .bind(companyId, new Date().toISOString(), currencyId)
      .run();

    await context.cloudflare.env.DB
      .prepare("UPDATE currencies SET company_id = NULL WHERE company_id = ? AND id != ?")
      .bind(companyId, currencyId)
      .run();

    invalidateSettingsCaches(companyId);

    return redirect(state.withMode("/settings?tab=currencies&success=Default currency updated"));
  } catch {
    return redirect(state.withMode("/settings?tab=currencies&error=Failed to update default currency"));
  }
}

async function handleToggleCurrencyActive(args: SettingsActionArgs, state: SettingsActionState) {
  const { context, formData, companyId } = args;
  const currencyId = Number(formData.get("currencyId"));
  const isActive = formData.get("isActive") === "true";
  const isPhuketCompany = await state.resolveIsPhuketCompany();

  try {
    if (isPhuketCompany && !isActive) {
      const targetCurrency = await context.cloudflare.env.DB
        .prepare("SELECT code FROM currencies WHERE id = ? LIMIT 1")
        .bind(currencyId)
        .first() as { code?: string } | null;
      if (String(targetCurrency?.code || "").toUpperCase() === "THB") {
        return redirect(state.withMode("/settings?tab=currencies&error=THB must stay active for Phuket companies"));
      }
    }

    await context.cloudflare.env.DB
      .prepare(`
        UPDATE currencies
        SET is_active = ?, company_id = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(isActive ? 1 : 0, isActive ? companyId : null, new Date().toISOString(), currencyId)
      .run();

    invalidateSettingsCaches(companyId);

    return redirect(state.withMode("/settings?tab=currencies&success=Currency status updated"));
  } catch {
    return redirect(state.withMode("/settings?tab=currencies&error=Failed to update currency status"));
  }
}

async function handleCreateCurrency(args: SettingsActionArgs, state: SettingsActionState) {
  const { context, formData } = args;
  const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const symbol = (formData.get("symbol") as string)?.trim();

  if (!name || !code || !symbol) {
    return redirect(state.withMode("/settings?tab=currencies&error=All currency fields are required"));
  }

  try {
    await context.cloudflare.env.DB
      .prepare(`
        INSERT INTO currencies (name, code, symbol, is_active, company_id, created_at, updated_at)
        VALUES (?, ?, ?, 1, NULL, ?, ?)
      `)
      .bind(name, code, symbol, new Date().toISOString(), new Date().toISOString())
      .run();

    invalidateSettingsCaches();

    return redirect(state.withMode("/settings?tab=currencies&success=Currency created successfully"));
  } catch {
    return redirect(state.withMode("/settings?tab=currencies&error=Failed to create currency"));
  }
}

async function handleUpdatePaymentTemplate(args: SettingsActionArgs, state: SettingsActionState) {
  const { context, formData, companyId } = args;
  const id = Number(formData.get("id"));
  const name = (formData.get("name") as string || "").trim();
  const sign = (formData.get("sign") as "+" | "-") || "+";
  const description = (formData.get("description") as string || "").trim() || null;

  try {
    const template = await context.cloudflare.env.DB
      .prepare(`
        SELECT
          id,
          company_id AS companyId,
          is_system AS isSystem
        FROM payment_types
        WHERE id = ?
        LIMIT 1
      `)
      .bind(id)
      .first() as PaymentTemplateRow | null;

    if (!template) {
      return redirect(state.withMode("/settings?error=Payment template not found"));
    }

    if (template.companyId !== null && template.companyId !== companyId) {
      return redirect(state.withMode("/settings?error=Unauthorized"));
    }
    if (template.isSystem) {
      return redirect(state.withMode("/settings?error=Cannot edit system templates"));
    }

    if (!name) {
      return redirect(state.withMode("/settings?error=Payment template name is required"));
    }

    await context.cloudflare.env.DB
      .prepare(`
        UPDATE payment_types
        SET name = ?, sign = ?, description = ?, is_active = 1, updated_at = ?
        WHERE id = ?
      `)
      .bind(name, sign, description, new Date().toISOString(), id)
      .run();

    invalidateSettingsCaches(companyId);

    return redirect(state.withMode("/settings?success=Payment template updated successfully"));
  } catch {
    return redirect(state.withMode("/settings?error=Failed to update payment template"));
  }
}

async function handleCreatePaymentTemplate(args: SettingsActionArgs, state: SettingsActionState) {
  const { context, formData, companyId } = args;
  const name = formData.get("name") as string;
  const sign = formData.get("sign") as "+" | "-";
  const description = (formData.get("description") as string) || null;

  try {
    await context.cloudflare.env.DB
      .prepare(`
        INSERT INTO payment_types (
          name, sign, description, company_id, is_system, is_active,
          show_on_create, show_on_close, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, 1, ?, ?, ?, ?)
      `)
      .bind(
        name,
        sign,
        description,
        companyId,
        0,
        0,
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    invalidateSettingsCaches(companyId);

    return redirect(state.withMode("/settings?success=Payment template created successfully"));
  } catch {
    return redirect(state.withMode("/settings?error=Failed to create payment template"));
  }
}

async function handleDeletePaymentTemplate(args: SettingsActionArgs, state: SettingsActionState) {
  const { context, formData, companyId } = args;
  const id = Number(formData.get("id"));

  try {
    const template = await context.cloudflare.env.DB
      .prepare(`
        SELECT
          id,
          company_id AS companyId,
          is_system AS isSystem
        FROM payment_types
        WHERE id = ?
        LIMIT 1
      `)
      .bind(id)
      .first() as PaymentTemplateRow | null;

    if (!template) {
      return redirect(state.withMode("/settings?error=Payment template not found"));
    }

    if (template.isSystem || template.companyId === null) {
      return redirect(state.withMode("/settings?error=Cannot delete system templates"));
    }

    if (template.companyId !== companyId) {
      return redirect(state.withMode("/settings?error=Unauthorized"));
    }

    await context.cloudflare.env.DB
      .prepare("DELETE FROM payment_types WHERE id = ? AND company_id = ?")
      .bind(id, companyId)
      .run();

    invalidateSettingsCaches(companyId);

    return redirect(state.withMode("/settings?success=Payment template deleted successfully"));
  } catch {
    return redirect(state.withMode("/settings?error=Failed to delete payment template"));
  }
}

export async function handleSettingsAction(args: SettingsActionArgs) {
  const { request, context, user, companyId, formData } = args;
  const intent = formData.get("intent");
  const adminModCompanyId = getAdminModCompanyId(request, user);
  const withMode = (path: string) => withModCompanyId(path, adminModCompanyId);

  const currentCompanyRow = await context.cloudflare.env.DB
    .prepare(`
      SELECT
        id, name, email, phone, telegram, location_id, district_id, street, house_number,
        bank_name, account_number, account_name, swift_code, delivery_fee_after_hours,
        island_trip_price, krabi_trip_price, baby_seat_price_per_day, weekly_schedule, holidays
      FROM companies
      WHERE id = ?
      LIMIT 1
    `)
    .bind(companyId)
    .first() as CompanyRow | null;

  const currentCompany = currentCompanyRow ? normalizeCompanyRow(currentCompanyRow) : null;
  const resolveIsPhuketCompany = async () => {
    const locationId = (currentCompany as { locationId?: number | null } | null)?.locationId;
    if (!locationId) return false;
    const location = await context.cloudflare.env.DB
      .prepare("SELECT name FROM locations WHERE id = ? LIMIT 1")
      .bind(locationId)
      .first() as { name?: string } | null;
    return isPhuketName(location?.name);
  };

  const state: SettingsActionState = {
    withMode,
    currentCompany,
    resolveIsPhuketCompany,
  };

  if (intent === "updateGeneral") {
    return handleUpdateGeneral(args, state);
  }

  if (intent === "setDefaultCurrency") {
    return handleSetDefaultCurrency(args, state);
  }

  if (intent === "toggleCurrencyActive") {
    return handleToggleCurrencyActive(args, state);
  }

  if (intent === "createCurrency") {
    return handleCreateCurrency(args, state);
  }

  if (intent === "updatePaymentTemplate") {
    return handleUpdatePaymentTemplate(args, state);
  }

  if (intent === "createPaymentTemplate") {
    return handleCreatePaymentTemplate(args, state);
  }

  if (intent === "deletePaymentTemplate") {
    return handleDeletePaymentTemplate(args, state);
  }

  return redirect(withMode("/settings?error=Invalid action"));
}
