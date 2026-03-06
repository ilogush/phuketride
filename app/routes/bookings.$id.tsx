import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import BookingDetailsCard from "~/components/dashboard/bookings/BookingDetailsCard";
import BookingSidebarCards from "~/components/dashboard/bookings/BookingSidebarCards";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { EXTRA_TYPES, getCreateExtraPaymentStmt } from "~/lib/contract-extras.server";
import { getUpdateCarStatusStmt } from "~/lib/contract-helpers.server";
import { type BookingDetailRow, type BookingForConversionRow, mapBookingDetailRow } from "~/lib/bookings-detail.server";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const bookingId = Number(params.id);

    const bookingRaw = await context.cloudflare.env.DB
        .prepare(`
            SELECT
                b.*,
                cc.company_id AS companyId,
                cc.id AS carId,
                cc.license_plate AS carLicensePlate,
                cc.year AS carYear,
                cb.name AS brandName,
                cm.name AS modelName,
                cl.name AS colorName,
                d1.name AS pickupDistrictName,
                d2.name AS returnDistrictName
            FROM bookings b
            JOIN company_cars cc ON cc.id = b.company_car_id
            LEFT JOIN car_templates ct ON ct.id = cc.template_id
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            LEFT JOIN colors cl ON cl.id = cc.color_id
            LEFT JOIN districts d1 ON d1.id = b.pickup_district_id
            LEFT JOIN districts d2 ON d2.id = b.return_district_id
            WHERE b.id = ?
            LIMIT 1
        `)
        .bind(bookingId)
        .first() as BookingDetailRow | null;
    const booking = bookingRaw ? mapBookingDetailRow(bookingRaw) : null;

    if (!booking) {
        throw new Response("Booking not found", { status: 404 });
    }

    return { booking, user };
}

export async function action({ request, params, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const bookingId = Number(params.id);
    const formData = await request.formData();
    const actionParsed = parseWithSchema(
        z
        .object({
            action: z.enum(["cancel", "convert"]),
        }),
        {
            action: formData.get("_action"),
        },
        "Invalid action"
    );
    if (!actionParsed.ok) {
        return { error: "Invalid action" };
    }
    const action = actionParsed.data.action;

    try {
        const booking = await context.cloudflare.env.DB
            .prepare(`
                SELECT
                    id, status, company_car_id AS companyCarId, client_id AS clientId, start_date AS startDate, end_date AS endDate,
                    estimated_amount AS estimatedAmount, currency, deposit_amount AS depositAmount, deposit_payment_method AS depositPaymentMethod,
                    full_insurance_enabled AS fullInsuranceEnabled, full_insurance_price AS fullInsurancePrice,
                    baby_seat_enabled AS babySeatEnabled, baby_seat_price AS babySeatPrice,
                    island_trip_enabled AS islandTripEnabled, island_trip_price AS islandTripPrice,
                    krabi_trip_enabled AS krabiTripEnabled, krabi_trip_price AS krabiTripPrice,
                    pickup_district_id AS pickupDistrictId,
                    pickup_hotel AS pickupHotel, pickup_room AS pickupRoom, delivery_cost AS deliveryCost, return_district_id AS returnDistrictId,
                    return_hotel AS returnHotel, return_room AS returnRoom, return_cost AS returnCost, notes, client_name AS clientName,
                    client_surname AS clientSurname, client_phone AS clientPhone, client_email AS clientEmail, client_passport AS clientPassport
                FROM bookings
                WHERE id = ?
                LIMIT 1
            `)
            .bind(bookingId)
            .first() as BookingForConversionRow | null;

        if (!booking) {
            return { error: "Booking not found" };
        }

        if (action === "cancel") {
            const nowIso = new Date().toISOString();
            // Cancel booking
            await context.cloudflare.env.DB.batch([
                context.cloudflare.env.DB
                    .prepare("UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?")
                    .bind(nowIso, bookingId),
                getUpdateCarStatusStmt(context.cloudflare.env.DB, booking.companyCarId, 'available'),
            ]);

            // Audit log
            const metadata = getRequestMetadata(request);
            await quickAudit({
                db: context.cloudflare.env.DB,
                userId: user.id,
                role: user.role,
                companyId: user.companyId,
                entityType: "booking",
                entityId: bookingId,
                action: "update",
                beforeState: { status: booking.status },
                afterState: { status: "cancelled" },
                ...metadata,
            });

            return redirect(`/bookings?success=Booking cancelled successfully`);
        }

        if (action === "convert") {
            const nowIso = new Date().toISOString();
            // Check if client exists by passport
            let clientId = booking.clientId;
            
            if (booking.clientPassport) {
                const existingClient = await context.cloudflare.env.DB
                    .prepare("SELECT id FROM users WHERE passport_number = ? LIMIT 1")
                    .bind(booking.clientPassport)
                    .first() as { id: string } | null;

                if (existingClient) {
                    clientId = existingClient.id;
                } else {
                    // Create new client user
                    const newClientId = crypto.randomUUID();
                    await context.cloudflare.env.DB
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

            // Create from booking
            const insertContractResult = await context.cloudflare.env.DB
                .prepare(`
                    INSERT INTO contracts (
                        company_car_id, client_id, manager_id, start_date, end_date, total_amount, total_currency,
                        deposit_amount, deposit_currency, deposit_payment_method,
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
                    booking.depositPaymentMethod,
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
                .run();
            const contract = { id: Number(insertContractResult.meta.last_row_id) };

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
            const extraStmts = EXTRA_TYPES
                .filter((extraType) => extraEnabledByType[extraType])
                .map((extraType) =>
                    getCreateExtraPaymentStmt({
                        db: context.cloudflare.env.DB,
                        contractId: contract.id,
                        userId: user.id,
                        extraType,
                        amount: extraPriceByType[extraType],
                        currency: booking.currency || "THB",
                    })
                );
            const conversionStmts: D1PreparedStatement[] = [
                context.cloudflare.env.DB
                    .prepare("UPDATE bookings SET status = 'converted', updated_at = ? WHERE id = ?")
                    .bind(nowIso, bookingId),
                getUpdateCarStatusStmt(context.cloudflare.env.DB, booking.companyCarId, 'rented'),
                ...extraStmts,
            ];
            await context.cloudflare.env.DB.batch(conversionStmts);

            // Audit logs
            const metadata = getRequestMetadata(request);
            await quickAudit({
                db: context.cloudflare.env.DB,
                userId: user.id,
                role: user.role,
                companyId: user.companyId,
                entityType: "booking",
                entityId: bookingId,
                action: "update",
                beforeState: { status: booking.status },
                afterState: { status: "converted" },
                ...metadata,
            });

            await quickAudit({
                db: context.cloudflare.env.DB,
                userId: user.id,
                role: user.role,
                companyId: user.companyId,
                entityType: "contract",
                entityId: contract.id,
                action: "create",
                afterState: contract,
                ...metadata,
            });

            return redirect(`/contracts/${contract.id}/edit?success=Booking converted to contract successfully`);
        }

        return { error: "Invalid action" };
    } catch {
        return { error: "Failed to process booking action" };
    }
}

export default function BookingDetailsPage() {
    useUrlToast();
    const { booking, user } = useLoaderData<typeof loader>();

    const canConvert = booking.status === "pending" || booking.status === "confirmed";
    const canCancel = booking.status === "pending" || booking.status === "confirmed";

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Booking #${booking.id}`}
                leftActions={<BackButton to="/bookings" />}
                rightActions={
                    <div className="flex gap-2">
                        {canConvert && (
                            <Form method="post">
                                <input type="hidden" name="_action" value="convert" />
                                <Button type="submit" variant="primary">
                                    Convert to Contract
                                </Button>
                            </Form>
                        )}
                        {canCancel && (
                            <Form method="post">
                                <input type="hidden" name="_action" value="cancel" />
                                <Button type="submit" variant="secondary">
                                    Cancel Booking
                                </Button>
                            </Form>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <BookingDetailsCard booking={booking} />
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <BookingSidebarCards booking={booking} />
                </div>
            </div>
        </div>
    );
}
