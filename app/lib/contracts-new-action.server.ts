import { type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import type { SessionUser } from "~/lib/auth.server";
import { getRequestMetadata, getQuickAuditStmt } from "~/lib/audit-logger";
import { getUpdateCarStatusStmt } from "~/lib/contract-helpers.server";
import { getCreateContractEventsStmts } from "~/lib/calendar-events.server";
import { uploadPhotoItemsToR2, type UploadPhotoItem } from "~/lib/r2.server";
import {
  EXTRA_TYPES,
  getCreateExtraPaymentStmt,
  getCurrencyCodeById,
  getExtraFlagsFromFormData,
  getExtraInputFromFormData,
} from "~/lib/contract-extras.server";
import { parseDisplayDateTimeToDate } from "~/lib/date-windows";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";

type CreateContractActionArgs = {
  request: Request;
  context: ActionFunctionArgs["context"];
  user: SessionUser;
  companyId: number;
  formData: FormData;
};

function parseDocPhotos(value: FormDataEntryValue | null): UploadPhotoItem[] {
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.base64 === "string" && typeof p.fileName === "string");
  } catch {
    return [];
  }
}

function parsePhotoList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => typeof p === "string" && p.trim().length > 0);
  } catch {
    return [];
  }
}

export async function handleCreateContractAction({ request, context, user, companyId, formData }: CreateContractActionArgs) {
  try {
    const parsedEnvelope = parseWithSchema(
      z.object({
        company_car_id: z.coerce.number().int().positive("Car is required"),
        client_passport: z.string().trim().min(1, "Client passport is required"),
        client_name: z.string().trim().min(1, "Client name is required"),
        client_surname: z.string().trim().min(1, "Client surname is required"),
        client_phone: z.string().trim().min(1, "Client phone is required"),
        start_date: z.string().trim().min(1, "Start date is required"),
        end_date: z.string().trim().min(1, "End date is required"),
        total_amount: z.coerce.number().positive("Total amount must be greater than 0"),
      }),
      {
        company_car_id: formData.get("company_car_id"),
        client_passport: formData.get("client_passport"),
        client_name: formData.get("client_name"),
        client_surname: formData.get("client_surname"),
        client_phone: formData.get("client_phone"),
        start_date: formData.get("start_date"),
        end_date: formData.get("end_date"),
        total_amount: formData.get("total_amount"),
      }
    );
    if (!parsedEnvelope.ok) {
      throw new Error(parsedEnvelope.error);
    }

    const passportPhotosValue = parseDocPhotos(formData.get("passportPhotos"));
    const driverLicensePhotosValue = parseDocPhotos(formData.get("driverLicensePhotos"));

    const passportNumber = String(formData.get("client_passport") || "").trim();
    if (!passportNumber) {
      throw new Error("Client passport is required");
    }

    const clientData = {
      name: String(formData.get("client_name") || "").trim(),
      surname: String(formData.get("client_surname") || "").trim(),
      email: String(formData.get("client_email") || "").trim(),
      phone: String(formData.get("client_phone") || "").trim(),
      whatsapp: String(formData.get("client_whatsapp") || "").trim(),
      telegram: String(formData.get("client_telegram") || "").trim(),
    };

    if (!clientData.name || !clientData.surname || !clientData.phone) {
      throw new Error("Client name, surname and phone are required");
    }

    let clientId: string;
    const existingClient = await context.cloudflare.env.DB
      .prepare(`
        SELECT id, email, name, surname, phone, passport_photos AS passportPhotos,
               driver_license_photos AS driverLicensePhotos
        FROM users
        WHERE passport_number = ?
        LIMIT 1
      `)
      .bind(passportNumber)
      .first() as {
      id: string;
      email: string | null;
      name: string | null;
      surname: string | null;
      phone: string | null;
      passportPhotos: string | null;
      driverLicensePhotos: string | null;
    } | null;

    const userStmts: D1PreparedStatement[] = [];
    if (existingClient) {
      clientId = existingClient.id;

      const uploadedPassportPhotos = await uploadPhotoItemsToR2(
        context.cloudflare.env.ASSETS,
        passportPhotosValue,
        `users/${clientId}/passport`
      );
      const uploadedDriverLicensePhotos = await uploadPhotoItemsToR2(
        context.cloudflare.env.ASSETS,
        driverLicensePhotosValue,
        `users/${clientId}/driver-license`
      );

      const dataMatches =
        existingClient.name === clientData.name &&
        existingClient.surname === clientData.surname &&
        (!clientData.email || existingClient.email === clientData.email) &&
        existingClient.phone === clientData.phone;

      if (!dataMatches || passportPhotosValue.length > 0 || driverLicensePhotosValue.length > 0) {
        userStmts.push(
          context.cloudflare.env.DB
            .prepare(`
              UPDATE users
              SET passport_photos = ?, driver_license_photos = ?, updated_at = ?
              WHERE id = ?
            `)
            .bind(
              uploadedPassportPhotos.length > 0 ? JSON.stringify(uploadedPassportPhotos) : existingClient.passportPhotos,
              uploadedDriverLicensePhotos.length > 0 ? JSON.stringify(uploadedDriverLicensePhotos) : existingClient.driverLicensePhotos,
              new Date().toISOString(),
              clientId
            )
        );
      }
    } else {
      clientId = crypto.randomUUID();
      const uploadedPassportPhotos = await uploadPhotoItemsToR2(
        context.cloudflare.env.ASSETS,
        passportPhotosValue,
        `users/${clientId}/passport`
      );
      const uploadedDriverLicensePhotos = await uploadPhotoItemsToR2(
        context.cloudflare.env.ASSETS,
        driverLicensePhotosValue,
        `users/${clientId}/driver-license`
      );

      userStmts.push(
        context.cloudflare.env.DB
          .prepare(`
            INSERT INTO users (
              id, email, role, name, surname, phone, whatsapp, telegram, passport_number,
              passport_photos, driver_license_photos, created_at, updated_at
            ) VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            clientId,
            clientData.email || `${clientData.phone}@temp.com`,
            clientData.name,
            clientData.surname,
            clientData.phone,
            clientData.whatsapp || null,
            clientData.telegram || null,
            passportNumber,
            uploadedPassportPhotos.length > 0 ? JSON.stringify(uploadedPassportPhotos) : null,
            uploadedDriverLicensePhotos.length > 0 ? JSON.stringify(uploadedDriverLicensePhotos) : null,
            new Date().toISOString(),
            new Date().toISOString()
          )
      );
    }

    if (userStmts.length > 0) {
      await context.cloudflare.env.DB.batch(userStmts);
    }

    const companyCarId = Number(formData.get("company_car_id"));
    const startDate = parseDisplayDateTimeToDate(String(formData.get("start_date") || ""));
    const endDate = parseDisplayDateTimeToDate(String(formData.get("end_date") || ""));
    const totalAmount = Number(formData.get("total_amount"));
    const depositAmount = Number(formData.get("deposit_amount")) || 0;
    const totalCurrency = "THB";

    if (!Number.isFinite(companyCarId) || companyCarId <= 0) {
      throw new Error("Car is required");
    }
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Start and end dates are required");
    }
    if (startDate >= endDate) {
      throw new Error("End date must be after start date");
    }
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new Error("Total amount must be greater than 0");
    }

    const car = await context.cloudflare.env.DB
      .prepare(`
        SELECT id, status
        FROM company_cars
        WHERE id = ? AND company_id = ?
        LIMIT 1
      `)
      .bind(companyCarId, companyId)
      .first() as { id: number; status: string | null } | null;

    if (!car) {
      throw new Error("Car not found or doesn't belong to your company");
    }
    if (car.status !== "available") {
      throw new Error("Car is not available for rent");
    }

    const overlapping = await context.cloudflare.env.DB
      .prepare(`
        SELECT id
        FROM contracts
        WHERE company_car_id = ? AND status = 'active'
          AND (
            (start_date <= ? AND end_date >= ?)
            OR (start_date <= ? AND end_date >= ?)
            OR (start_date >= ? AND end_date <= ?)
          )
        LIMIT 1
      `)
      .bind(
        companyCarId,
        startDate.toISOString(),
        startDate.toISOString(),
        endDate.toISOString(),
        endDate.toISOString(),
        startDate.toISOString(),
        endDate.toISOString()
      )
      .first() as { id: number } | null;

    if (overlapping) {
      throw new Error("Car is already booked for these dates");
    }

    const contractPhotosValue = parsePhotoList(formData.get("photos"));
    const pickupDistrictId = formData.get("pickup_district_id") ? Number(formData.get("pickup_district_id")) : null;
    const returnDistrictId = formData.get("return_district_id") ? Number(formData.get("return_district_id")) : null;

    const deliveryCost = Number(formData.get("delivery_cost")) || 0;
    const returnCost = Number(formData.get("return_cost")) || 0;
    const fuelLevel = String(formData.get("fuel_level") || "Full");
    const cleanliness = String(formData.get("cleanliness") || "Clean");
    const startMileage = Number(formData.get("start_mileage")) || 0;
    const extraFlags = getExtraFlagsFromFormData(formData);

    const contractInsert = await context.cloudflare.env.DB
      .prepare(`
        INSERT INTO contracts (
          company_car_id, client_id, manager_id, start_date, end_date, total_amount, total_currency,
          deposit_amount, deposit_currency, deposit_payment_method,
          pickup_district_id, pickup_hotel, pickup_room, delivery_cost, return_district_id, return_hotel, return_room, return_cost,
          start_mileage, fuel_level, cleanliness, status, notes, photos, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
      `)
      .bind(
        companyCarId,
        clientId,
        user.id,
        startDate.toISOString(),
        endDate.toISOString(),
        totalAmount,
        totalCurrency,
        depositAmount,
        totalCurrency,
        (formData.get("deposit_payment_method") as string) || null,
        pickupDistrictId,
        (formData.get("pickup_hotel") as string) || null,
        (formData.get("pickup_room") as string) || null,
        deliveryCost,
        returnDistrictId,
        (formData.get("return_hotel") as string) || null,
        (formData.get("return_room") as string) || null,
        returnCost,
        startMileage,
        fuelLevel,
        cleanliness,
        (formData.get("notes") as string) || null,
        contractPhotosValue.length > 0 ? JSON.stringify(contractPhotosValue) : null,
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    const contractId = Number(contractInsert.meta.last_row_id);
    const currencyCodeById = await getCurrencyCodeById(context.cloudflare.env.DB);

    const finalStmts: D1PreparedStatement[] = [];

    for (const extraType of EXTRA_TYPES) {
      const enabled = extraFlags[extraType];
      if (!enabled) continue;
      const { amount, currencyId, paymentMethod } = getExtraInputFromFormData(formData, extraType);
      const currencyCode = (currencyId ? currencyCodeById.get(currencyId) : null) || "THB";
      finalStmts.push(getCreateExtraPaymentStmt({
        db: context.cloudflare.env.DB,
        contractId,
        userId: user.id,
        extraType,
        amount,
        currency: currencyCode,
        currencyId,
        paymentMethod,
      }));
    }

    finalStmts.push(getUpdateCarStatusStmt(context.cloudflare.env.DB, companyCarId, "rented"));
    finalStmts.push(...getCreateContractEventsStmts({
      db: context.cloudflare.env.DB,
      companyId,
      contractId,
      startDate,
      endDate,
      createdBy: user.id,
    }));

    await context.cloudflare.env.DB.batch(finalStmts);

    const metadata = getRequestMetadata(request);
    await getQuickAuditStmt({
      db: context.cloudflare.env.DB,
      userId: user.id,
      role: user.role,
      companyId,
      entityType: "contract",
      entityId: contractId,
      action: "create",
      afterState: { contractId, clientId, companyCarId },
      ...metadata,
    }).run();

    return redirectWithRequestSuccess(request, "/contracts", "Contract created successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to Create";
    return redirectWithRequestError(request, "/contracts/new", message);
  }
}
