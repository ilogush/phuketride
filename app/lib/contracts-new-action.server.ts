import { type ActionFunctionArgs } from "react-router";
import type { SessionUser } from "~/lib/auth.server";
import { getRequestMetadata } from "~/lib/audit-logger";
import { uploadPhotoItemsToR2 } from "~/lib/r2.server";
import {
  EXTRA_TYPES,
  getCurrencyCodeById,
  getExtraInputFromFormData,
} from "~/lib/contract-extras.server";
import { parseDisplayDateTimeToDate } from "~/lib/date-windows";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";
import { checkCarAvailability } from "~/lib/car-availability.server";
import { parseDocPhotos, parsePhotoList } from "~/lib/photo-utils";
import { createContractFormSchema } from "~/schemas/contract-form";

type CreateContractActionArgs = {
  db: D1Database;
  assets: R2Bucket;
  request: Request;
  user: SessionUser;
  companyId: number;
  formData: FormData;
};


export async function handleCreateContractAction({ db, assets, request, user, companyId, formData }: CreateContractActionArgs) {
  try {
    const raw = Object.fromEntries(formData);
    const parsed = parseWithSchema(createContractFormSchema, raw);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    const data = parsed.data;

    const passportPhotosValue = parseDocPhotos(data.passportPhotos);
    const driverLicensePhotosValue = parseDocPhotos(data.driverLicensePhotos);
    const contractPhotosValue = parsePhotoList(data.photos);

    const existingClient = await db
      .prepare(`
        SELECT id, email, name, surname, phone, passport_photos AS passportPhotos,
               driver_license_photos AS driverLicensePhotos
        FROM users
        WHERE passport_number = ?
        LIMIT 1
      `)
      .bind(data.client_passport)
      .first() as {
      id: string;
      email: string | null;
      name: string | null;
      surname: string | null;
      phone: string | null;
      passportPhotos: string | null;
      driverLicensePhotos: string | null;
    } | null;

    let clientId: string;
    const nowIso = new Date().toISOString();
    const batchStmts: D1PreparedStatement[] = [];

    if (existingClient) {
      clientId = existingClient.id;
      const passportUploaded = await uploadPhotoItemsToR2(assets, passportPhotosValue, `users/${clientId}/passport`);
      const licenseUploaded = await uploadPhotoItemsToR2(assets, driverLicensePhotosValue, `users/${clientId}/driver-license`);

      const dataMatches = 
        existingClient.name === data.client_name &&
        existingClient.surname === data.client_surname &&
        (!data.client_email || existingClient.email === data.client_email) &&
        existingClient.phone === data.client_phone;

      if (!dataMatches || passportUploaded.length > 0 || licenseUploaded.length > 0) {
        batchStmts.push(
          db.prepare(`UPDATE users SET name = ?, surname = ?, phone = ?, passport_photos = ?, driver_license_photos = ?, updated_at = ? WHERE id = ?`)
            .bind(
              data.client_name,
              data.client_surname,
              data.client_phone,
              passportUploaded.length > 0 ? JSON.stringify(passportUploaded) : existingClient.passportPhotos,
              licenseUploaded.length > 0 ? JSON.stringify(licenseUploaded) : existingClient.driverLicensePhotos,
              nowIso,
              clientId
            )
        );
      }
    } else {
      clientId = crypto.randomUUID();
      const passportUploaded = await uploadPhotoItemsToR2(assets, passportPhotosValue, `users/${clientId}/passport`);
      const licenseUploaded = await uploadPhotoItemsToR2(assets, driverLicensePhotosValue, `users/${clientId}/driver-license`);

      batchStmts.push(
        db.prepare(`
          INSERT INTO users (
            id, email, role, name, surname, phone, whatsapp, telegram, passport_number,
            passport_photos, driver_license_photos, created_at, updated_at
          ) VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          clientId, 
          data.client_email || null, 
          data.client_name, 
          data.client_surname, 
          data.client_phone, 
          data.client_whatsapp || null, 
          data.client_telegram || null, 
          data.client_passport,
          passportUploaded.length > 0 ? JSON.stringify(passportUploaded) : null,
          licenseUploaded.length > 0 ? JSON.stringify(licenseUploaded) : null,
          nowIso,
          nowIso
        )
      );
    }

    const startDate = parseDisplayDateTimeToDate(data.start_date);
    const endDate = parseDisplayDateTimeToDate(data.end_date);

    const car = await db
      .prepare(`SELECT id, status FROM company_cars WHERE id = ? AND company_id = ? LIMIT 1`)
      .bind(data.company_car_id, companyId)
      .first() as { id: number; status: string | null } | null;

    if (!car) throw new Error("Car not found or doesn't belong to your company");
    if (car.status !== "available") throw new Error("Car is not available for rent");

    const conflict = await checkCarAvailability(db, data.company_car_id, startDate, endDate);
    if (conflict) throw new Error(`Car is already occupied by a ${conflict.type} (ID: ${conflict.id})`);

    const currencyCodeByIdMap = await getCurrencyCodeById(db);
    const totalCurrency = currencyCodeByIdMap.get(data.currency_id) || "THB";
    const depositCurrency = (data.deposit_currency_id && currencyCodeByIdMap.get(data.deposit_currency_id)) || totalCurrency;

    batchStmts.push(
      db.prepare(`
        INSERT INTO contracts (
          company_car_id, client_id, manager_id, start_date, end_date, total_amount, total_currency,
          deposit_amount, deposit_currency,
          pickup_district_id, pickup_hotel, pickup_room, delivery_cost, return_district_id, return_hotel, return_room, return_cost,
          start_mileage, fuel_level, cleanliness, status, notes, photos, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
      `)
      .bind(
        data.company_car_id, clientId, user.id,
        startDate.toISOString(), endDate.toISOString(),
        data.total_amount, totalCurrency,
        data.deposit_amount, depositCurrency,
        data.pickup_district_id, data.pickup_hotel, data.pickup_room, data.delivery_cost,
        data.return_district_id, data.return_hotel, data.return_room, data.return_cost,
        data.start_mileage, data.fuel_level, data.cleanliness,
        data.notes,
        contractPhotosValue.length > 0 ? JSON.stringify(contractPhotosValue) : null,
        nowIso, nowIso
      )
    );

    const extraFlags: Record<string, boolean> = {
      full_insurance: data.fullInsurance,
      baby_seat: data.babySeat,
      island_trip: data.islandTrip,
      krabi_trip: data.krabiTrip,
      delivery_fee_after_hours: data.deliveryFeeAfterHours
    };

    for (const extraType of EXTRA_TYPES) {
      if (!extraFlags[extraType]) continue;
      const { amount, currencyId } = getExtraInputFromFormData(formData, extraType);
      const currencyCode = (currencyId ? currencyCodeByIdMap.get(currencyId) : null) || "THB";
      
      batchStmts.push(
        db.prepare(`
          INSERT INTO payments (
              contract_id, amount, currency, currency_id, status, created_by, created_at, updated_at,
              extra_type, extra_enabled, extra_price
          ) VALUES (last_insert_rowid(), ?, ?, ?, 'completed', ?, ?, ?, ?, 1, ?)
        `).bind(
          amount, currencyCode, currencyId ?? null, user.id, nowIso, nowIso, extraType, amount
        )
      );
    }

    batchStmts.push(db.prepare("UPDATE company_cars SET status = 'rented', updated_at = ? WHERE id = ?").bind(nowIso, data.company_car_id));

    batchStmts.push(
      db.prepare(`
        INSERT INTO calendar_events (
            company_id, event_type, title, description,
            start_date, end_date, related_id, color,
            status, created_by, created_at, updated_at
        ) VALUES (?, 'pickup', 'Contract #' || last_insert_rowid() || ' - Pickup', 'Car pickup for contract', ?, null, last_insert_rowid(), '#10B981', 'pending', ?, ?, ?)
      `).bind(companyId, startDate.getTime(), user.id, nowIso, nowIso)
    );
    
    batchStmts.push(
      db.prepare(`
        INSERT INTO calendar_events (
            company_id, event_type, title, description,
            start_date, end_date, related_id, color,
            status, created_by, created_at, updated_at
        ) VALUES (?, 'contract', 'Contract #' || last_insert_rowid() || ' - Return', 'Car return for contract', ?, null, last_insert_rowid(), '#EF4444', 'pending', ?, ?, ?)
      `).bind(companyId, endDate.getTime(), user.id, nowIso, nowIso)
    );

    const metadata = getRequestMetadata(request);
    batchStmts.push(
      db.prepare(`
        INSERT INTO user_audit_logs (user_id, role, company_id, entity_type, entity_id, action, before_state, after_state, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, 'contract', last_insert_rowid(), 'create', NULL, ?, ?, ?, ?)
      `).bind(
        user.id, user.role, companyId,
        JSON.stringify({ clientId, companyCarId: data.company_car_id }),
        metadata.ipAddress ?? null, metadata.userAgent ?? null, nowIso
      )
    );

    await db.batch(batchStmts);

    return redirectWithRequestSuccess(request, "/contracts", "Contract created successfully");
  } catch (error) {
    console.error("Contract creation error:", error);
    const message = error instanceof Error ? error.message : "Failed to create contract";
    return redirectWithRequestError(request, "/contracts/new", message);
  }
}
