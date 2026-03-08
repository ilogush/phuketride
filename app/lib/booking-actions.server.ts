import type { SessionUser } from "~/lib/auth.server";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { getCreateContractEventsStmts } from "~/lib/calendar-events.server";
import { EXTRA_TYPES, getCreateExtraPaymentStmt } from "~/lib/contract-extras.server";
import { getUpdateCarStatusStmt } from "~/lib/contract-helpers.server";
import type { BookingForConversionRow } from "~/lib/bookings-detail.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";

type BookingActionArgs = {
    db: D1Database;
    request: Request;
    user: SessionUser;
    companyId: number | null;
    bookingId: number;
};

async function loadBookingForAction(db: D1Database, bookingId: number) {
    return db
        .prepare(`
            SELECT
                b.id, b.status, b.company_car_id AS companyCarId, b.client_id AS clientId, cc.company_id AS companyId, b.start_date AS startDate, b.end_date AS endDate,
                estimated_amount AS estimatedAmount, currency, deposit_amount AS depositAmount AS full_insurance_enabled AS fullInsuranceEnabled, full_insurance_price AS fullInsurancePrice,
                baby_seat_enabled AS babySeatEnabled, baby_seat_price AS babySeatPrice,
                island_trip_enabled AS islandTripEnabled, island_trip_price AS islandTripPrice,
                krabi_trip_enabled AS krabiTripEnabled, krabi_trip_price AS krabiTripPrice,
                pickup_district_id AS pickupDistrictId,
                pickup_hotel AS pickupHotel, pickup_room AS pickupRoom, delivery_cost AS deliveryCost, return_district_id AS returnDistrictId,
                return_hotel AS returnHotel, return_room AS returnRoom, return_cost AS returnCost, notes, client_name AS clientName,
                client_surname AS clientSurname, client_phone AS clientPhone, client_email AS clientEmail, client_passport AS clientPassport
            FROM bookings b
            JOIN company_cars cc ON cc.id = b.company_car_id
            WHERE b.id = ?
            LIMIT 1
        `)
        .bind(bookingId)
        .first() as Promise<(BookingForConversionRow & { companyId: number }) | null>;
}

function resolveAuditCompanyId(companyId: number | null, user: SessionUser) {
    return companyId ?? user.companyId ?? null;
}

export async function cancelBooking(args: BookingActionArgs) {
    const { db, request, user, companyId, bookingId } = args;
    const booking = await loadBookingForAction(db, bookingId);
    if (!booking) {
        return redirectWithRequestError(request, `/bookings/${bookingId}`, "Booking not found");
    }

    const nowIso = new Date().toISOString();
    await db.batch([
        db.prepare("UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?").bind(nowIso, bookingId),
        getUpdateCarStatusStmt(db, booking.companyCarId, "available"),
    ]);

    const metadata = getRequestMetadata(request);
    await quickAudit({
        db,
        userId: user.id,
        role: user.role,
        companyId: resolveAuditCompanyId(companyId, user),
        entityType: "booking",
        entityId: bookingId,
        action: "update",
        beforeState: { status: booking.status },
        afterState: { status: "cancelled" },
        ...metadata,
    });

    return redirectWithRequestSuccess(request, "/bookings", "Booking cancelled successfully");
}

export async function convertBookingToContract(args: BookingActionArgs) {
    const { db, request, user, companyId, bookingId } = args;
    const booking = await loadBookingForAction(db, bookingId);
    if (!booking) {
        return redirectWithRequestError(request, `/bookings/${bookingId}`, "Booking not found");
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
        return redirectWithRequestError(request, `/bookings/${bookingId}`, "Only pending or confirmed bookings can be converted");
    }

    const nowIso = new Date().toISOString();
    let clientId = booking.clientId;

    if (booking.clientPassport) {
        const existingClient = await db
            .prepare("SELECT id FROM users WHERE passport_number = ? LIMIT 1")
            .bind(booking.clientPassport)
            .first() as { id: string } | null;

        if (existingClient) {
            clientId = existingClient.id;
        } else {
            const newClientId = crypto.randomUUID();
            await db
                .prepare(`
                    INSERT INTO users (
                        id, email, role, name, surname, phone, passport_number, created_at, updated_at
                    ) VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?)
                `)
                .bind(
                    newClientId,
                    booking.clientEmail || `${booking.clientPassport}@temp.com`,
                    booking.clientName,
                    booking.clientSurname,
                    booking.clientPhone,
                    booking.clientPassport,
                    nowIso,
                    nowIso
                )
                .run();
            clientId = newClientId;
        }
    }

    const insertContractResult = await db
        .prepare(`
            INSERT INTO contracts (
                company_car_id, client_id, manager_id, start_date, end_date, total_amount, total_currency,
                deposit_amount, deposit_currency,
                pickup_district_id, pickup_hotel, pickup_room, delivery_cost, return_district_id, return_hotel, return_room, return_cost,
                status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
        `)
        .bind(
            booking.companyCarId,
            clientId,
            user.id,
            booking.startDate,
            booking.endDate,
            booking.estimatedAmount,
            booking.currency,
            booking.depositAmount,
            booking.currency,
            booking.booking.pickupDistrictId,
            booking.pickupHotel,
            booking.pickupRoom,
            booking.deliveryCost || 0,
            booking.returnDistrictId,
            booking.returnHotel,
            booking.returnRoom,
            booking.returnCost || 0,
            booking.notes,
            nowIso,
            nowIso
        )
        .run();

    const contractId = Number(insertContractResult.meta.last_row_id);
    const extraPriceByType = {
        full_insurance: Number(booking.fullInsurancePrice || 0),
        baby_seat: Number(booking.babySeatPrice || 0),
        island_trip: Number(booking.islandTripPrice || 0),
        krabi_trip: Number(booking.krabiTripPrice || 0),
    } as const;
    const extraEnabledByType = {
        full_insurance: Boolean(booking.fullInsuranceEnabled),
        baby_seat: Boolean(booking.babySeatEnabled),
        island_trip: Boolean(booking.islandTripEnabled),
        krabi_trip: Boolean(booking.krabiTripEnabled),
    } as const;

    const conversionStmts: D1PreparedStatement[] = [
        db.prepare("UPDATE bookings SET status = 'converted', updated_at = ? WHERE id = ?").bind(nowIso, bookingId),
        getUpdateCarStatusStmt(db, booking.companyCarId, "rented"),
        ...EXTRA_TYPES
            .filter((extraType) => extraEnabledByType[extraType])
            .map((extraType) =>
                getCreateExtraPaymentStmt({
                    db,
                    contractId,
                    userId: user.id,
                    extraType,
                    amount: extraPriceByType[extraType],
                    currency: booking.currency || "THB",
                })
            ),
        ...getCreateContractEventsStmts({
            db,
            companyId: resolveAuditCompanyId(companyId, user) ?? booking.companyId,
            contractId,
            startDate: new Date(booking.startDate),
            endDate: new Date(booking.endDate),
            createdBy: user.id,
        }),
    ];
    await db.batch(conversionStmts);

    const metadata = getRequestMetadata(request);
    await quickAudit({
        db,
        userId: user.id,
        role: user.role,
        companyId: resolveAuditCompanyId(companyId, user),
        entityType: "booking",
        entityId: bookingId,
        action: "update",
        beforeState: { status: booking.status },
        afterState: { status: "converted" },
        ...metadata,
    });
    await quickAudit({
        db,
        userId: user.id,
        role: user.role,
        companyId: resolveAuditCompanyId(companyId, user),
        entityType: "contract",
        entityId: contractId,
        action: "create",
        afterState: { id: contractId, source: "booking-conversion" },
        ...metadata,
    });

    return redirectWithRequestSuccess(request, `/contracts/${contractId}/edit`, "Booking converted to contract successfully");
}
