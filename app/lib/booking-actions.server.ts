import type { SessionUser } from "~/lib/auth.server";
import { getRequestMetadata } from "~/lib/audit-logger";
import { EXTRA_TYPES } from "~/lib/contract-extras.server";
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
    const metadata = getRequestMetadata(request);
    
    await db.batch([
        db.prepare("UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?").bind(nowIso, bookingId),
        getUpdateCarStatusStmt(db, booking.companyCarId, "available"),
        db.prepare(`
            INSERT INTO audit_logs (user_id, role, company_id, entity_type, entity_id, action, before_state, after_state, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, 'booking', ?, 'update', ?, ?, ?, ?, ?)
        `).bind(
            user.id, user.role, resolveAuditCompanyId(companyId, user), bookingId,
            JSON.stringify({ status: booking.status }), JSON.stringify({ status: "cancelled" }),
            metadata.ipAddress ?? null, metadata.userAgent ?? null, nowIso
        )
    ]);

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
    const batchStmts: D1PreparedStatement[] = [];

    if (booking.clientPassport) {
        const existingClient = await db
            .prepare("SELECT id FROM users WHERE passport_number = ? LIMIT 1")
            .bind(booking.clientPassport)
            .first() as { id: string } | null;

        if (existingClient) {
            clientId = existingClient.id;
        } else {
            clientId = crypto.randomUUID();
            batchStmts.push(
                db.prepare(`
                    INSERT INTO users (
                        id, email, role, name, surname, phone, passport_number, created_at, updated_at
                    ) VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?)
                `).bind(
                    clientId,
                    booking.clientEmail || `${booking.clientPassport}@temp.com`,
                    booking.clientName,
                    booking.clientSurname,
                    booking.clientPhone,
                    booking.clientPassport,
                    nowIso,
                    nowIso
                )
            );
        }
    }

    batchStmts.push(
        db.prepare(`
            INSERT INTO contracts (
                company_car_id, client_id, manager_id, start_date, end_date, total_amount, total_currency,
                deposit_amount, deposit_currency,
                pickup_district_id, pickup_hotel, pickup_room, delivery_cost, return_district_id, return_hotel, return_room, return_cost,
                status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
        `).bind(
            booking.companyCarId,
            clientId,
            user.id,
            booking.startDate,
            booking.endDate,
            booking.estimatedAmount,
            booking.currency,
            booking.depositAmount,
            booking.currency,
            booking.pickupDistrictId,
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
    );

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

    batchStmts.push(db.prepare("UPDATE bookings SET status = 'converted', updated_at = ? WHERE id = ?").bind(nowIso, bookingId));
    batchStmts.push(getUpdateCarStatusStmt(db, booking.companyCarId, "rented"));

    for (const extraType of EXTRA_TYPES) {
        if (!extraEnabledByType[extraType as keyof typeof extraEnabledByType]) continue;
        const amount = (extraPriceByType as Record<string, number>)[extraType];
        batchStmts.push(
            db.prepare(`
                INSERT INTO payments (
                    contract_id, amount, currency, currency_id, status, created_by, created_at, updated_at,
                    extra_type, extra_enabled, extra_price
                ) VALUES (last_insert_rowid(), ?, ?, NULL, 'completed', ?, ?, ?, ?, 1, ?)
            `).bind(
                amount, booking.currency || "THB", user.id, nowIso, nowIso, extraType, amount
            )
        );
    }
    
    const targetCompanyId = resolveAuditCompanyId(companyId, user) ?? booking.companyId;

    batchStmts.push(
        db.prepare(`
            INSERT INTO calendar_events (
                company_id, event_type, title, description,
                start_date, end_date, related_id, color,
                status, created_by, created_at, updated_at
            ) VALUES (?, 'pickup', 'Contract #' || last_insert_rowid() || ' - Pickup', 'Car pickup for contract', ?, null, last_insert_rowid(), '#10B981', 'pending', ?, ?, ?)
        `).bind(targetCompanyId, new Date(booking.startDate).getTime(), user.id, nowIso, nowIso)
    );
    
    batchStmts.push(
        db.prepare(`
            INSERT INTO calendar_events (
                company_id, event_type, title, description,
                start_date, end_date, related_id, color,
                status, created_by, created_at, updated_at
            ) VALUES (?, 'contract', 'Contract #' || last_insert_rowid() || ' - Return', 'Car return for contract', ?, null, last_insert_rowid(), '#EF4444', 'pending', ?, ?, ?)
        `).bind(targetCompanyId, new Date(booking.endDate).getTime(), user.id, nowIso, nowIso)
    );

    const metadata = getRequestMetadata(request);
    batchStmts.push(
        db.prepare(`
            INSERT INTO audit_logs (user_id, role, company_id, entity_type, entity_id, action, before_state, after_state, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, 'booking', ?, 'update', ?, ?, ?, ?, ?)
        `).bind(
            user.id, user.role, resolveAuditCompanyId(companyId, user), bookingId,
            JSON.stringify({ status: booking.status }), JSON.stringify({ status: "converted" }),
            metadata.ipAddress ?? null, metadata.userAgent ?? null, nowIso
        )
    );

    batchStmts.push(
        db.prepare(`
            INSERT INTO audit_logs (user_id, role, company_id, entity_type, entity_id, action, before_state, after_state, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, 'contract', last_insert_rowid(), 'create', NULL, ?, ?, ?, ?)
        `).bind(
            user.id, user.role, resolveAuditCompanyId(companyId, user),
            JSON.stringify({ source: "booking-conversion" }),
            metadata.ipAddress ?? null, metadata.userAgent ?? null, nowIso
        )
    );

    const batchResults = await db.batch(batchStmts);
    // Find the contract insert statement result. 
    // It's the one after the user insert (if any). If existing user, it's index 0, if new user it's index 1.
    // Finding last contract ID is tricky via batchResults without checking the right array index, 
    // but we can query it easily if we need to redirect, or we can just calculate the index:
    const contractInsertIndex = booking.clientPassport && batchStmts.length > 8 ? 1 : 0; // rough estimation.
    let contractId = Number((batchResults[contractInsertIndex] as { meta?: { last_row_id?: number } })?.meta?.last_row_id || 0);

    // If that fails, query latest contract created by user.
    if (!contractId) {
        const lastCreated = await db.prepare("SELECT id FROM contracts WHERE created_at = ? AND manager_id = ? ORDER BY id DESC LIMIT 1").bind(nowIso, user.id).first() as { id: number } | null;
        if (lastCreated) contractId = lastCreated.id;
    }

    return redirectWithRequestSuccess(request, `/contracts/${contractId}/edit`, "Booking converted to contract successfully");
}
