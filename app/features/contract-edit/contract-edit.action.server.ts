import { redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import type { SessionUser } from "~/lib/auth.server";
import { createContractEvents } from "~/lib/calendar-events.server";
import { parseDateTimeFromDisplay } from "~/lib/formatters";
import { EXTRA_TYPES, getCreateExtraPaymentStmt, getExtraFlagsFromFormData, getExtraInputFromFormData, getCurrencyCodeById } from "~/lib/contract-extras.server";
import { updateCarStatus } from "~/lib/contract-helpers.server";
import { uploadPhotoItemsToR2 } from "~/lib/r2.server";
import { parseWithSchema } from "~/lib/validation.server";
import { checkCarAvailability } from "~/lib/car-availability.server";
import { parseDocPhotos, parsePhotoList } from "~/lib/photo-utils";
import { editContractFormSchema } from "~/schemas/contract-form";

type ExistingContractRow = {
  id: number;
  client_id: string;
  company_car_id: number;
  companyId: number;
  start_date: string;
  end_date: string;
  total_amount: number | null;
  fuel_level: string | null;
  cleanliness: string | null;
  start_mileage: number | null;
  photos: string | null;
};

type ContractExtraRow = {
  id: number;
  extraType: (typeof EXTRA_TYPES)[number];
  extraPrice: number | null;
  amount: number | null;
  paymentTypeId: number | null;
  currency: string | null;
  currencyId: number | null;
  status: string | null;
  notes: string | null;
};

type EditContractActionArgs = {
  db: D1Database;
  assets: R2Bucket;
  request: Request;
  user: SessionUser;
  companyId: number | null;
  params: ActionFunctionArgs["params"];
  formData: FormData;
};

export async function submitContractEditAction({ db, assets, request, user, companyId, params, formData }: EditContractActionArgs) {
  const contractId = parseInt(String(params.id || ""), 10);

  try {
    const raw = Object.fromEntries(formData);
    const parsed = parseWithSchema(editContractFormSchema, raw);

    if (!parsed.ok) {
      return redirect(`/contracts/${contractId}/edit?error=${encodeURIComponent(parsed.error)}`);
    }
    const data = parsed.data;

    const existingContract = await db
      .prepare(`
        SELECT
          contracts.id,
          contracts.client_id,
          contracts.company_car_id,
          cc.company_id AS companyId,
          contracts.start_date,
          contracts.end_date,
          contracts.total_amount,
          contracts.fuel_level,
          contracts.cleanliness,
          contracts.start_mileage,
          contracts.photos
        FROM contracts
        JOIN company_cars cc ON cc.id = contracts.company_car_id
        WHERE contracts.id = ?
        LIMIT 1
      `)
      .bind(contractId)
      .first() as ExistingContractRow | null;

    if (!existingContract) {
      return redirect(`/contracts?error=${encodeURIComponent("Contract not found")}`);
    }

    if (companyId !== null && existingContract.companyId !== companyId) {
      return redirect(`/contracts?error=${encodeURIComponent("Access denied")}`);
    }

    const passportPhotosValue = parseDocPhotos(data.passportPhotos);
    const driverLicensePhotosValue = parseDocPhotos(data.driverLicensePhotos);
    const contractPhotosValue = parsePhotoList(data.photos);

    const uploadedPassportPhotos = await uploadPhotoItemsToR2(
      assets,
      passportPhotosValue,
      `users/${existingContract.client_id}/passport`
    );
    const uploadedDriverLicensePhotos = await uploadPhotoItemsToR2(
      assets,
      driverLicensePhotosValue,
      `users/${existingContract.client_id}/driver-license`
    );

    const transactionStmts: D1PreparedStatement[] = [];

    // 1. User update
    const clientUpdate: Record<string, unknown> = {
      name: data.client_name || null,
      surname: data.client_surname || null,
      phone: data.client_phone || null,
      whatsapp: data.client_whatsapp || null,
      telegram: data.client_telegram || null,
      passportNumber: data.client_passport || null,
      updatedAt: new Date().toISOString(),
    };

    if (data.client_email) clientUpdate.email = data.client_email;
    if (uploadedPassportPhotos.length > 0) clientUpdate.passportPhotos = JSON.stringify(uploadedPassportPhotos);
    if (uploadedDriverLicensePhotos.length > 0) clientUpdate.driverLicensePhotos = JSON.stringify(uploadedDriverLicensePhotos);

    transactionStmts.push(
      db.prepare(`
        UPDATE users
        SET name = COALESCE(?, name), surname = COALESCE(?, surname), phone = COALESCE(?, phone), 
            whatsapp = COALESCE(?, whatsapp), telegram = COALESCE(?, telegram), 
            passport_number = COALESCE(?, passport_number),
            email = COALESCE(?, email), passport_photos = COALESCE(?, passport_photos),
            driver_license_photos = COALESCE(?, driver_license_photos), updated_at = ?
        WHERE id = ?
      `).bind(
        clientUpdate.name,
        clientUpdate.surname,
        clientUpdate.phone,
        clientUpdate.whatsapp,
        clientUpdate.telegram,
        clientUpdate.passportNumber,
        (clientUpdate.email as string | undefined) ?? null,
        (clientUpdate.passportPhotos as string | undefined) ?? null,
        (clientUpdate.driverLicensePhotos as string | undefined) ?? null,
        clientUpdate.updatedAt,
        existingContract.client_id
      )
    );

    // 2. Dates & Availability
    const newCompanyCarId = data.company_car_id || existingContract.company_car_id;
    const startDate = data.start_date ? new Date(parseDateTimeFromDisplay(data.start_date)) : new Date(existingContract.start_date);
    const endDate = data.end_date ? new Date(parseDateTimeFromDisplay(data.end_date)) : new Date(existingContract.end_date);

    if (data.start_date || data.end_date || newCompanyCarId !== existingContract.company_car_id) {
      const conflict = await checkCarAvailability(
        db,
        newCompanyCarId,
        startDate,
        endDate,
        contractId
      );
      if (conflict) {
        return redirect(`/contracts/${contractId}/edit?error=${encodeURIComponent(`Car is already occupied by a ${conflict.type} (ID: ${conflict.id})`)}`); 
      }
    }

    // 3. Contract Update
    const currencyMap = await getCurrencyCodeById(db);
    const totalCurrency = (data.currency_id && currencyMap.get(data.currency_id)) || "THB";
    const depositCurrency = (data.deposit_currency_id && currencyMap.get(data.deposit_currency_id)) || totalCurrency;

    transactionStmts.push(
      db.prepare(`
        UPDATE contracts
        SET company_car_id = ?, start_date = ?, end_date = ?, pickup_district_id = ?, pickup_hotel = ?, pickup_room = ?,
            delivery_cost = ?, return_district_id = ?, return_hotel = ?, return_room = ?, return_cost = ?, deposit_amount = ?,
            deposit_currency = ?, total_amount = ?, total_currency = ?, fuel_level = ?, cleanliness = ?, start_mileage = ?,
            notes = ?, photos = COALESCE(?, photos), updated_at = ?
        WHERE id = ?
      `).bind(
        newCompanyCarId,
        startDate.toISOString(),
        endDate.toISOString(),
        data.pickup_district_id,
        data.pickup_hotel,
        data.pickup_room,
        data.delivery_cost,
        data.return_district_id,
        data.return_hotel,
        data.return_room,
        data.return_cost,
        data.deposit_amount,
        depositCurrency,
        data.total_amount,
        totalCurrency,
        data.fuel_level,
        data.cleanliness,
        data.start_mileage,
        data.notes,
        contractPhotosValue.length > 0 ? JSON.stringify(contractPhotosValue) : null,
        new Date().toISOString(),
        contractId
      )
    );

    // 4. Extras Processing
    const extraEnabledByType: Record<(typeof EXTRA_TYPES)[number], boolean> = {
      full_insurance: data.fullInsurance,
      delivery_fee_after_hours: data.deliveryFeeAfterHours,
      baby_seat: data.babySeat,
      island_trip: data.islandTrip,
      krabi_trip: data.krabiTrip,
    };

    const existingExtrasResult = await db
      .prepare(`
        SELECT id, extra_type AS extraType, extra_price AS extraPrice, amount, currency, currency_id AS currencyId,
               payment_type_id AS paymentTypeId, status, notes
        FROM payments
        WHERE contract_id = ? AND extra_type IS NOT NULL
      `)
      .bind(contractId)
      .all() as { results?: ContractExtraRow[] };

    const existingExtras = (existingExtrasResult?.results || []) as ContractExtraRow[];
    const existingByType = new Map(existingExtras.map((row) => [String(row.extraType), row]));

    for (const extraType of EXTRA_TYPES) {
      const existingExtra = existingByType.get(extraType);
      const isEnabled = extraEnabledByType[extraType];
      const extraInput = getExtraInputFromFormData(formData, extraType);
      
      if (!isEnabled) {
        if (existingExtra?.id) {
          transactionStmts.push(db.prepare("DELETE FROM payments WHERE id = ?").bind(existingExtra.id));
        }
        continue;
      }

      if (existingExtra?.id) {
        transactionStmts.push(
          db.prepare(`
              UPDATE payments
              SET extra_enabled = 1, amount = ?, currency_id = ?, currency = ?, extra_price = ?, updated_at = ?
              WHERE id = ?
            `)
            .bind(
              extraInput.amount,
              extraInput.currencyId,
              currencyMap.get(extraInput.currencyId ?? 0) ?? "THB",
              extraInput.amount,
              new Date().toISOString(), 
              existingExtra.id
            )
        );
      } else {
        transactionStmts.push(getCreateExtraPaymentStmt({
          db, contractId, userId: user.id, extraType,
          amount: extraInput.amount,
          currencyId: extraInput.currencyId,
          currency: currencyMap.get(extraInput.currencyId ?? 0) ?? "THB",
        }));
      }
    }

    // 5. Car Status Update
    if (newCompanyCarId !== existingContract.company_car_id) {
      transactionStmts.push(db.prepare("UPDATE company_cars SET status = 'available', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), existingContract.company_car_id));
      transactionStmts.push(db.prepare("UPDATE company_cars SET status = 'rented', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), newCompanyCarId));
    }

    // 6. Event Sync
    const targetCompanyId = newCompanyCarId === existingContract.company_car_id
      ? existingContract.companyId
      : (await db.prepare("SELECT company_id AS companyId FROM company_cars WHERE id = ? LIMIT 1").bind(newCompanyCarId).first() as { companyId: number } | null)?.companyId;

    if (targetCompanyId) {
      transactionStmts.push(db.prepare("DELETE FROM calendar_events WHERE related_id = ? AND event_type IN ('pickup', 'contract')").bind(contractId));
      transactionStmts.push(...(await import("~/lib/calendar-events.server")).getCreateContractEventsStmts({
        db, companyId: targetCompanyId, contractId, startDate, endDate, createdBy: user.id,
      }));
    }

    // Execution Phase: All or nothing
    if (transactionStmts.length > 0) {
      await db.batch(transactionStmts);
    }

    return redirect(`/contracts/${contractId}/edit?success=${encodeURIComponent("Contract updated successfully")}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update contract";
    return redirect(`/contracts/${contractId}/edit?error=${encodeURIComponent(message)}`);
  }
}
