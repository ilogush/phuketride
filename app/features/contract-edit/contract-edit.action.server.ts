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
    const parsedEnvelope = parseWithSchema(
      z.object({
        company_car_id: z.coerce.number().int().positive().optional(),
        start_date: z.string().trim().optional(),
        end_date: z.string().trim().optional(),
        client_name: z.string().trim().optional(),
        client_surname: z.string().trim().optional(),
        client_phone: z.string().trim().optional(),
      }),
      {
        company_car_id: formData.get("company_car_id"),
        start_date: formData.get("start_date"),
        end_date: formData.get("end_date"),
        client_name: formData.get("client_name"),
        client_surname: formData.get("client_surname"),
        client_phone: formData.get("client_phone"),
      }
    );

    if (!parsedEnvelope.ok) {
      return redirect(`/contracts/${contractId}/edit?error=${encodeURIComponent(parsedEnvelope.error)}`);
    }

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

    const passportPhotosValue = parseDocPhotos(formData.get("passportPhotos"));
    const driverLicensePhotosValue = parseDocPhotos(formData.get("driverLicensePhotos"));

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

    const clientUpdate: Record<string, unknown> = {
      name: String(formData.get("client_name") || "").trim() || null,
      surname: String(formData.get("client_surname") || "").trim() || null,
      phone: String(formData.get("client_phone") || "").trim() || null,
      whatsapp: String(formData.get("client_whatsapp") || "").trim() || null,
      telegram: String(formData.get("client_telegram") || "").trim() || null,
      passportNumber: String(formData.get("client_passport") || "").trim() || null,
      updatedAt: new Date(),
    };

    const email = String(formData.get("client_email") || "").trim();
    if (email) clientUpdate.email = email;
    if (uploadedPassportPhotos.length > 0) clientUpdate.passportPhotos = JSON.stringify(uploadedPassportPhotos);
    if (uploadedDriverLicensePhotos.length > 0) clientUpdate.driverLicensePhotos = JSON.stringify(uploadedDriverLicensePhotos);

    await db
      .prepare(`
        UPDATE users
        SET name = ?, surname = ?, phone = ?, whatsapp = ?, telegram = ?, passport_number = ?,
            email = COALESCE(?, email), passport_photos = COALESCE(?, passport_photos),
            driver_license_photos = COALESCE(?, driver_license_photos), updated_at = ?
        WHERE id = ?
      `)
      .bind(
        clientUpdate.name,
        clientUpdate.surname,
        clientUpdate.phone,
        clientUpdate.whatsapp,
        clientUpdate.telegram,
        clientUpdate.passportNumber,
        (clientUpdate.email as string | undefined) ?? null,
        (clientUpdate.passportPhotos as string | undefined) ?? null,
        (clientUpdate.driverLicensePhotos as string | undefined) ?? null,
        new Date().toISOString(),
        existingContract.client_id
      )
      .run();

    const newCompanyCarId = Number(formData.get("company_car_id")) || existingContract.company_car_id;
    const startDateRaw = formData.get("start_date");
    const startDate = startDateRaw ? new Date(parseDateTimeFromDisplay(String(startDateRaw))) : new Date(existingContract.start_date);
    const endDateRaw = formData.get("end_date");
    const endDate = endDateRaw ? new Date(parseDateTimeFromDisplay(String(endDateRaw))) : new Date(existingContract.end_date);

    const datesChanged = startDateRaw || endDateRaw;
    const carChanged = newCompanyCarId !== existingContract.company_car_id;
    if (datesChanged || carChanged) {
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

    const photosValue = parsePhotoList(formData.get("photos"));

    const pickupDistrictIdRaw = formData.get("pickup_district_id");
    const returnDistrictIdRaw = formData.get("return_district_id");

    const pickupDistrictId = pickupDistrictIdRaw ? Number(pickupDistrictIdRaw) : null;
    const returnDistrictId = returnDistrictIdRaw ? Number(returnDistrictIdRaw) : null;

    const extraFlags = getExtraFlagsFromFormData(formData);
    const updatePayload: Record<string, unknown> = {
      companyCarId: newCompanyCarId,
      startDate,
      endDate,
      pickupDistrictId,
      pickupHotel: (formData.get("pickup_hotel") as string) || null,
      pickupRoom: (formData.get("pickup_room") as string) || null,
      deliveryCost: Number(formData.get("delivery_cost")) || 0,
      returnDistrictId,
      returnHotel: (formData.get("return_hotel") as string) || null,
      returnRoom: (formData.get("return_room") as string) || null,
      returnCost: Number(formData.get("return_cost")) || 0,
      depositAmount: Number(formData.get("deposit_amount")) || 0,
      totalAmount: Number(formData.get("total_amount")) || 0,
      fuelLevel: (formData.get("fuel_level") as string) || null,
      cleanliness: (formData.get("cleanliness") as string) || null,
      startMileage: Number(formData.get("start_mileage")) || 0,
      notes: (formData.get("notes") as string) || null,
      fullInsuranceEnabled: extraFlags.full_insurance,
      deliveryFeeAfterHoursEnabled: extraFlags.delivery_fee_after_hours,
      babySeatEnabled: extraFlags.baby_seat,
      islandTripEnabled: extraFlags.island_trip,
      krabiTripEnabled: extraFlags.krabi_trip,
    };

    const currencyMap = await getCurrencyCodeById(db);
    const chosenCurrencyId = Number(formData.get("currency_id"));
    if (chosenCurrencyId) {
      const code = currencyMap.get(chosenCurrencyId) || "THB";
      updatePayload.totalCurrency = code;
      updatePayload.depositCurrency = code;
    }

    if (photosValue.length > 0) {
      updatePayload.photos = JSON.stringify(photosValue);
    }

    await db
      .prepare(`
        UPDATE contracts
        SET company_car_id = ?, start_date = ?, end_date = ?, pickup_district_id = ?, pickup_hotel = ?, pickup_room = ?,
            delivery_cost = ?, return_district_id = ?, return_hotel = ?, return_room = ?, return_cost = ?, deposit_amount = ?,
            deposit_currency = ?, total_amount = ?, total_currency = ?, fuel_level = ?, cleanliness = ?, start_mileage = ?,
            notes = ?,
            photos = COALESCE(?, photos), updated_at = ?
        WHERE id = ?
      `)
      .bind(
        updatePayload.companyCarId,
        (updatePayload.startDate as Date).toISOString(),
        (updatePayload.endDate as Date).toISOString(),
        updatePayload.pickupDistrictId,
        updatePayload.pickupHotel,
        updatePayload.pickupRoom,
        updatePayload.deliveryCost,
        updatePayload.returnDistrictId,
        updatePayload.returnHotel,
        updatePayload.returnRoom,
        updatePayload.returnCost,
        updatePayload.depositAmount,
        updatePayload.depositCurrency,
        updatePayload.totalAmount,
        updatePayload.totalCurrency,
        updatePayload.fuelLevel,
        updatePayload.cleanliness,
        updatePayload.startMileage,
        updatePayload.notes,
        (updatePayload.photos as string | undefined) ?? null,
        new Date().toISOString(),
        contractId
      )
      .run();

    const extraEnabledByType: Record<(typeof EXTRA_TYPES)[number], boolean> = {
      full_insurance: Boolean(updatePayload.fullInsuranceEnabled),
      delivery_fee_after_hours: Boolean(updatePayload.deliveryFeeAfterHoursEnabled),
      baby_seat: Boolean(updatePayload.babySeatEnabled),
      island_trip: Boolean(updatePayload.islandTripEnabled),
      krabi_trip: Boolean(updatePayload.krabiTripEnabled),
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
    const extraStmts: D1PreparedStatement[] = [];

    for (const extraType of EXTRA_TYPES) {
      const existingExtra = existingByType.get(extraType);
      const isEnabled = extraEnabledByType[extraType];
      const extraInput = getExtraInputFromFormData(formData, extraType);
      
      if (!isEnabled) {
        if (existingExtra?.id) {
          extraStmts.push(
            db.prepare("DELETE FROM payments WHERE id = ?").bind(existingExtra.id)
          );
        }
        continue;
      }

      if (existingExtra?.id) {
        extraStmts.push(
          db
            .prepare(`
              UPDATE payments
              SET 
                extra_enabled = 1, 
                amount = ?,
                currency_id = ?,
                currency = ?,
                extra_price = ?,
                updated_at = ?
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
        continue;
      }

      extraStmts.push(getCreateExtraPaymentStmt({
        db,
        contractId,
        userId: user.id,
        extraType,
        amount: extraInput.amount,
        currencyId: extraInput.currencyId,
        currency: currencyMap.get(extraInput.currencyId ?? 0) ?? "THB",
      }));
    }

    if (extraStmts.length > 0) {
      await db.batch(extraStmts);
    }

    if (newCompanyCarId !== existingContract.company_car_id) {
      await updateCarStatus(db, existingContract.company_car_id, "available", "Contract car changed");
      await updateCarStatus(db, newCompanyCarId, "rented", "Contract car changed");
    }

    const targetCompanyId = newCompanyCarId === existingContract.company_car_id
      ? existingContract.companyId
      : (
        await db
          .prepare("SELECT company_id AS companyId FROM company_cars WHERE id = ? LIMIT 1")
          .bind(newCompanyCarId)
          .first() as { companyId: number } | null
      )?.companyId;

    if (targetCompanyId) {
      await db
        .prepare("DELETE FROM calendar_events WHERE related_id = ? AND event_type IN ('pickup', 'contract')")
        .bind(contractId)
        .run();

      await createContractEvents({
        db,
        companyId: targetCompanyId,
        contractId,
        startDate,
        endDate,
        createdBy: user.id,
      });
    }

    return redirect(`/contracts/${contractId}/edit?success=${encodeURIComponent("Contract updated successfully")}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update contract";
    return redirect(`/contracts/${contractId}/edit?error=${encodeURIComponent(message)}`);
  }
}
