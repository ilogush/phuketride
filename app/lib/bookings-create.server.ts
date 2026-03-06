import { redirect } from "react-router";
import { z } from "zod";
import type { SessionUser } from "~/lib/auth.server";
import { getQuickAuditStmt, getRequestMetadata } from "~/lib/audit-logger";
import { parseDateFromDisplay } from "~/lib/formatters";
import { getUpdateCarStatusStmt } from "~/lib/contract-helpers.server";
import { parseWithSchema } from "~/lib/validation.server";

const bookingSchema = z.object({
  carId: z.string().min(1, "Car is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  clientName: z.string().min(1, "Client name is required"),
  clientSurname: z.string().min(1, "Client surname is required"),
  clientPhone: z.string().min(9, "Phone must be at least 9 digits"),
  clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  clientPassport: z.string().optional(),
  depositAmount: z.string().optional(),
  depositPaid: z.string().optional(),
  depositPaymentMethod: z.string().optional(),
  pickupDistrictId: z.string().optional(),
  pickupHotel: z.string().optional(),
  pickupRoom: z.string().optional(),
  returnDistrictId: z.string().optional(),
  returnHotel: z.string().optional(),
  returnRoom: z.string().optional(),
  fullInsurance: z.string().optional(),
  babySeat: z.string().optional(),
  islandTrip: z.string().optional(),
  krabiTrip: z.string().optional(),
  notes: z.string().optional(),
});

type CreateBookingActionArgs = {
  request: Request;
  context: { cloudflare: { env: Env } };
  user: SessionUser;
  formData: FormData;
};

export async function createBookingAction({ request, context, user, formData }: CreateBookingActionArgs) {
  const data = Object.fromEntries(formData);
  const result = parseWithSchema(bookingSchema, data, "Validation failed");
  if (!result.ok) {
    return { error: result.error };
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
    depositPaymentMethod,
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
    const car = await context.cloudflare.env.DB
      .prepare(`
        SELECT id, price_per_day AS pricePerDay
        FROM company_cars
        WHERE id = ? AND company_id = ?
        LIMIT 1
      `)
      .bind(Number(carId), user.companyId)
      .first() as { id: number; pricePerDay: number | null } | null;

    if (!car) {
      return { error: "Car not found" };
    }

    const start = new Date(parseDateFromDisplay(startDate));
    const end = new Date(parseDateFromDisplay(endDate));
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (car.pricePerDay === null) {
      return { error: "Car price per day is not set" };
    }

    let estimatedAmount = car.pricePerDay * days;

    if (fullInsurance) estimatedAmount += Number(fullInsurance) * days;
    if (babySeat) estimatedAmount += Number(babySeat) * days;
    if (islandTrip) estimatedAmount += Number(islandTrip);
    if (krabiTrip) estimatedAmount += Number(krabiTrip);

    if (pickupDistrictId) {
      const district = await context.cloudflare.env.DB
        .prepare("SELECT delivery_price AS deliveryPrice FROM districts WHERE id = ? LIMIT 1")
        .bind(Number(pickupDistrictId))
        .first() as { deliveryPrice: number | null } | null;
      if (district) estimatedAmount += district.deliveryPrice || 0;
    }
    if (returnDistrictId) {
      const district = await context.cloudflare.env.DB
        .prepare("SELECT delivery_price AS deliveryPrice FROM districts WHERE id = ? LIMIT 1")
        .bind(Number(returnDistrictId))
        .first() as { deliveryPrice: number | null } | null;
      if (district) estimatedAmount += district.deliveryPrice || 0;
    }

    const bookingInsertStmt = context.cloudflare.env.DB
      .prepare(`
        INSERT INTO bookings (
          company_car_id, client_id, manager_id, start_date, end_date, estimated_amount, currency,
          deposit_amount, deposit_paid, deposit_payment_method, client_name, client_surname, client_phone,
          client_email, client_passport, pickup_district_id, pickup_hotel, pickup_room, return_district_id,
          return_hotel, return_room, full_insurance_enabled, full_insurance_price, baby_seat_enabled,
          baby_seat_price, island_trip_enabled, island_trip_price, krabi_trip_enabled, krabi_trip_price,
          status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'THB', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
      `)
      .bind(
        Number(carId),
        user.id,
        user.id,
        start.toISOString(),
        end.toISOString(),
        estimatedAmount,
        depositAmount ? Number(depositAmount) : 0,
        depositPaid === "on" ? 1 : 0,
        depositPaymentMethod || null,
        clientName,
        clientSurname,
        clientPhone,
        clientEmail || null,
        clientPassport || null,
        pickupDistrictId ? Number(pickupDistrictId) : null,
        pickupHotel || null,
        pickupRoom || null,
        returnDistrictId ? Number(returnDistrictId) : null,
        returnHotel || null,
        returnRoom || null,
        fullInsurance ? 1 : 0,
        fullInsurance ? Number(fullInsurance) : 0,
        babySeat ? 1 : 0,
        babySeat ? Number(babySeat) : 0,
        islandTrip ? 1 : 0,
        islandTrip ? Number(islandTrip) : 0,
        krabiTrip ? 1 : 0,
        krabiTrip ? Number(krabiTrip) : 0,
        notes || null,
        new Date().toISOString(),
        new Date().toISOString()
      );

    const carUpdateStmt = getUpdateCarStatusStmt(context.cloudflare.env.DB, Number(carId), "booked");
    const batchResults = await context.cloudflare.env.DB.batch([bookingInsertStmt, carUpdateStmt]);
    const bookingId = Number((batchResults[0] as { meta?: { last_row_id?: number } }).meta?.last_row_id || 0);

    const metadata = getRequestMetadata(request);
    await getQuickAuditStmt({
      db: context.cloudflare.env.DB,
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
      entityType: "booking",
      entityId: bookingId,
      action: "create",
      afterState: { id: bookingId, estimatedAmount },
      ...metadata,
    }).run();

    return redirect(`/bookings?success=Booking created successfully`);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create booking" };
  }
}
