import { z } from "zod";
import type { SessionUser } from "~/lib/auth.server";
import { getRequestMetadata } from "~/lib/audit-logger";
import { parseDateFromDisplay } from "~/lib/formatters";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";

import { bookingSchema } from "~/schemas/booking";
import { checkCarAvailability } from "~/lib/car-availability.server";

type CreateBookingActionArgs = {
  db: D1Database;
  request: Request;
  user: SessionUser;
  companyId: number;
  formData: FormData;
};
export async function createBookingAction({ db, request, user, companyId, formData }: CreateBookingActionArgs) {
  const data = Object.fromEntries(formData);
  const result = parseWithSchema(bookingSchema, data, "Validation failed");
  if (!result.ok) {
    return redirectWithRequestError(request, "/bookings/create", result.error);
  }

  const {
    carId,
    startDate,
    endDate,
    clientName,
    clientSurname,
    clientPhone,
    clientEmail,
    clientPassport,
    depositAmount,
    depositPaid,
    pickupDistrictId,
    pickupHotel,
    pickupRoom,
    returnDistrictId,
    returnHotel,
    returnRoom,
    fullInsurance,
    babySeat,
    islandTrip,
    krabiTrip,
    notes,
  } = result.data;

  try {
    const car = await db
      .prepare(`
        SELECT id, price_per_day AS pricePerDay
        FROM company_cars
        WHERE id = ? AND company_id = ?
        LIMIT 1
      `)
      .bind(carId, companyId)
      .first() as { id: number; pricePerDay: number | null } | null;

    if (!car) {
      return redirectWithRequestError(request, "/bookings/create", "Car not found");
    }

    const start = new Date(parseDateFromDisplay(startDate));
    const end = new Date(parseDateFromDisplay(endDate));

    const conflict = await checkCarAvailability(
      db,
      carId,
      start,
      end
    );
    if (conflict) {
      return redirectWithRequestError(request, "/bookings/create", `Car is already occupied by a ${conflict.type} (ID: ${conflict.id})`);
    }

    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (car.pricePerDay === null) {
      return redirectWithRequestError(request, "/bookings/create", "Car price per day is not set");
    }

    if (fullInsurance > 0 && days < 7) {
      return redirectWithRequestError(request, "/bookings/create", "Full Insurance is only available for rentals of 7 days or more");
    }

    let estimatedAmount = car.pricePerDay * days;

    if (fullInsurance > 0) estimatedAmount += fullInsurance * days;
    if (babySeat > 0) estimatedAmount += babySeat * days;
    if (islandTrip > 0) estimatedAmount += islandTrip;
    if (krabiTrip > 0) estimatedAmount += krabiTrip;

    if (pickupDistrictId) {
      const district = await db
        .prepare("SELECT delivery_price AS deliveryPrice FROM districts WHERE id = ? LIMIT 1")
        .bind(pickupDistrictId)
        .first() as { deliveryPrice: number | null } | null;
      if (district && district.deliveryPrice) estimatedAmount += district.deliveryPrice;
    }
    if (returnDistrictId) {
      const district = await db
        .prepare("SELECT delivery_price AS deliveryPrice FROM districts WHERE id = ? LIMIT 1")
        .bind(returnDistrictId)
        .first() as { deliveryPrice: number | null } | null;
      if (district && district.deliveryPrice) estimatedAmount += district.deliveryPrice;
    }

    const nowIso = new Date().toISOString();
    const batchStmts: D1PreparedStatement[] = [];

    batchStmts.push(
      db.prepare(`
        INSERT INTO bookings (
          company_car_id, client_id, manager_id, start_date, end_date, estimated_amount, currency,
          deposit_amount, deposit_paid, client_name, client_surname, client_phone,
          client_email, client_passport, pickup_district_id, pickup_hotel, pickup_room, return_district_id,
          return_hotel, return_room, full_insurance_enabled, full_insurance_price, baby_seat_enabled,
          baby_seat_price, island_trip_enabled, island_trip_price, krabi_trip_enabled, krabi_trip_price,
          status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'THB', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
      `).bind(
        carId,
        user.id,
        user.id,
        start.toISOString(),
        end.toISOString(),
        estimatedAmount,
        depositAmount,
        depositPaid ? 1 : 0,
        clientName,
        clientSurname,
        clientPhone,
        clientEmail || null,
        clientPassport || null,
        pickupDistrictId || null,
        pickupHotel || null,
        pickupRoom || null,
        returnDistrictId || null,
        returnHotel || null,
        returnRoom || null,
        fullInsurance > 0 ? 1 : 0,
        fullInsurance,
        babySeat > 0 ? 1 : 0,
        babySeat,
        islandTrip > 0 ? 1 : 0,
        islandTrip,
        krabiTrip > 0 ? 1 : 0,
        krabiTrip,
        notes || null,
        nowIso,
        nowIso
      )
    );

    batchStmts.push(db.prepare("UPDATE company_cars SET status = 'booked', updated_at = ? WHERE id = ?").bind(nowIso, carId));

    batchStmts.push(
      db.prepare(`
        INSERT INTO calendar_events (
            company_id, event_type, title, description,
            start_date, end_date, related_id, color,
            status, created_by, created_at, updated_at
        ) VALUES (?, 'booking', 'Booking #' || last_insert_rowid() || ' - Start', 'Booking starts', ?, null, last_insert_rowid(), '#3B82F6', 'pending', ?, ?, ?)
      `).bind(companyId, start.getTime(), user.id, nowIso, nowIso)
    );
    
    batchStmts.push(
      db.prepare(`
        INSERT INTO calendar_events (
            company_id, event_type, title, description,
            start_date, end_date, related_id, color,
            status, created_by, created_at, updated_at
        ) VALUES (?, 'booking', 'Booking #' || last_insert_rowid() || ' - End', 'Booking ends', ?, null, last_insert_rowid(), '#8B5CF6', 'pending', ?, ?, ?)
      `).bind(companyId, end.getTime(), user.id, nowIso, nowIso)
    );

    const metadata = getRequestMetadata(request);
    batchStmts.push(
      db.prepare(`
        INSERT INTO audit_logs (user_id, role, company_id, entity_type, entity_id, action, before_state, after_state, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, 'booking', last_insert_rowid(), 'create', NULL, ?, ?, ?, ?)
      `).bind(
        user.id, user.role, companyId,
        JSON.stringify({ carId, estimatedAmount }),
        metadata.ipAddress ?? null, metadata.userAgent ?? null, nowIso
      )
    );

    await db.batch(batchStmts);

    return redirectWithRequestSuccess(request, "/bookings", "Booking created successfully");
  } catch (error) {
    return redirectWithRequestError(
      request,
      "/bookings/create",
      error instanceof Error ? error.message : "Failed to create booking"
    );
  }
}
