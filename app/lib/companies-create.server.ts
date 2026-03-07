import type { SessionUser } from "~/lib/auth.server";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { parseWithSchema } from "~/lib/validation.server";
import { companySchema } from "~/schemas/company";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";

type CreateCompanyActionArgs = {
  request: Request;
  context: { cloudflare: { env: Env } };
  user: SessionUser;
  formData: FormData;
};

type DistrictRow = {
  id: number;
  deliveryPrice?: number | null;
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

export async function createCompanyAction({ request, context, user, formData }: CreateCompanyActionArgs) {
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
    return redirectWithRequestError(request, "/companies/create", validation.error);
  }

  const validData = validation.data;

  try {
    const weeklySchedule = formData.get("weeklySchedule") as string;
    const holidays = formData.get("holidays") as string;
    const managerIds = formData.getAll("managerIds") as string[];

    const insertResult = await context.cloudflare.env.DB
      .prepare(`
        INSERT INTO companies (
          name, owner_id, email, phone, telegram, location_id, district_id,
          street, house_number, bank_name, account_number, account_name, swift_code,
          delivery_fee_after_hours, island_trip_price, krabi_trip_price,
          baby_seat_price_per_day, weekly_schedule, holidays, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        validData.name,
        user.id,
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
        new Date().toISOString()
      )
      .run();

    const newCompany = { id: Number(insertResult.meta.last_row_id) };
    if (!newCompany?.id) {
      throw new Error("Failed to create company - no ID returned");
    }

    const allDistrictsResult = (await context.cloudflare.env.DB
      .prepare("SELECT id, delivery_price AS deliveryPrice FROM districts WHERE location_id = ?")
      .bind(validData.locationId)
      .all()) as { results?: DistrictRow[] };
    const allDistricts = allDistrictsResult.results || [];

    await Promise.all(
      allDistricts.map((district) =>
        context.cloudflare.env.DB
          .prepare(`
            INSERT INTO company_delivery_settings (
              company_id, district_id, is_active, delivery_price, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `)
          .bind(
            newCompany.id,
            district.id,
            district.id === validData.districtId ? 1 : 0,
            district.id === validData.districtId ? 0 : (district.deliveryPrice || 0),
            new Date().toISOString(),
            new Date().toISOString()
          )
          .run()
      )
    );

    if (managerIds.length > 0) {
      const ownerId = managerIds[0];

      await context.cloudflare.env.DB
        .prepare("UPDATE companies SET owner_id = ?, updated_at = ? WHERE id = ?")
        .bind(ownerId, new Date().toISOString(), newCompany.id)
        .run();

      await Promise.all([
        ...managerIds.map((userId) =>
          context.cloudflare.env.DB
            .prepare(`
              INSERT INTO managers (user_id, company_id, is_active, created_at, updated_at)
              VALUES (?, ?, 1, ?, ?)
            `)
            .bind(userId, newCompany.id, new Date().toISOString(), new Date().toISOString())
            .run()
        ),
        ...managerIds.map((userId) =>
          context.cloudflare.env.DB
            .prepare("UPDATE users SET role = 'partner', updated_at = ? WHERE id = ?")
            .bind(new Date().toISOString(), userId)
            .run()
        ),
      ]);
    }

    const metadata = getRequestMetadata(request);
    quickAudit({
      db: context.cloudflare.env.DB,
      userId: user.id,
      role: user.role,
      companyId: newCompany.id,
      entityType: "company",
      entityId: newCompany.id,
      action: "create",
      afterState: { ...validData, id: newCompany.id },
      ...metadata,
    });

    return redirectWithRequestSuccess(request, "/companies", "Company created successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create company";
    return redirectWithRequestError(request, "/companies/create", message);
  }
}
