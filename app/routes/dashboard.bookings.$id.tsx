import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import Card from "~/components/dashboard/Card";
import { format } from "date-fns";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";

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
        .first<any>();
    const booking = bookingRaw
        ? {
            ...bookingRaw,
            startDate: bookingRaw.start_date,
            endDate: bookingRaw.end_date,
            estimatedAmount: bookingRaw.estimated_amount,
            depositAmount: bookingRaw.deposit_amount,
            depositPaid: !!bookingRaw.deposit_paid,
            clientName: bookingRaw.client_name,
            clientSurname: bookingRaw.client_surname,
            clientPhone: bookingRaw.client_phone,
            clientEmail: bookingRaw.client_email,
            clientPassport: bookingRaw.client_passport,
            pickupDistrictId: bookingRaw.pickup_district_id,
            pickupHotel: bookingRaw.pickup_hotel,
            pickupRoom: bookingRaw.pickup_room,
            returnDistrictId: bookingRaw.return_district_id,
            returnHotel: bookingRaw.return_hotel,
            returnRoom: bookingRaw.return_room,
            notes: bookingRaw.notes,
            createdAt: bookingRaw.created_at,
            companyCar: {
                id: bookingRaw.carId,
                companyId: bookingRaw.companyId,
                licensePlate: bookingRaw.carLicensePlate,
                year: bookingRaw.carYear,
                template: { brand: { name: bookingRaw.brandName }, model: { name: bookingRaw.modelName } },
                color: { name: bookingRaw.colorName },
            },
            pickupDistrict: { name: bookingRaw.pickupDistrictName },
            returnDistrict: { name: bookingRaw.returnDistrictName },
        }
        : null;

    if (!booking) {
        throw new Response("Booking not found", { status: 404 });
    }

    return { booking, user };
}

export async function action({ request, params, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const bookingId = Number(params.id);
    const formData = await request.formData();
    const action = formData.get("_action");

    try {
        const booking = await context.cloudflare.env.DB
            .prepare(`
                SELECT
                    id, status, company_car_id AS companyCarId, client_id AS clientId, start_date AS startDate, end_date AS endDate,
                    estimated_amount AS estimatedAmount, currency, deposit_amount AS depositAmount, deposit_payment_method AS depositPaymentMethod,
                    full_insurance_enabled AS fullInsuranceEnabled, full_insurance_price AS fullInsurancePrice, baby_seat_enabled AS babySeatEnabled,
                    baby_seat_price AS babySeatPrice, island_trip_enabled AS islandTripEnabled, island_trip_price AS islandTripPrice,
                    krabi_trip_enabled AS krabiTripEnabled, krabi_trip_price AS krabiTripPrice, pickup_district_id AS pickupDistrictId,
                    pickup_hotel AS pickupHotel, pickup_room AS pickupRoom, delivery_cost AS deliveryCost, return_district_id AS returnDistrictId,
                    return_hotel AS returnHotel, return_room AS returnRoom, return_cost AS returnCost, notes, client_name AS clientName,
                    client_surname AS clientSurname, client_phone AS clientPhone, client_email AS clientEmail, client_passport AS clientPassport
                FROM bookings
                WHERE id = ?
                LIMIT 1
            `)
            .bind(bookingId)
            .first<any>();

        if (!booking) {
            return { error: "Booking not found" };
        }

        if (action === "cancel") {
            // Cancel booking
            await context.cloudflare.env.DB
                .prepare("UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?")
                .bind(new Date().toISOString(), bookingId)
                .run();

            // Update car status back to available
            const { updateCarStatus } = await import("~/lib/contract-helpers.server");
            await updateCarStatus(context.cloudflare.env.DB, booking.companyCarId, 'available', 'Booking cancelled');

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

            return redirect(`/dashboard/bookings?success=Booking cancelled successfully`);
        }

        if (action === "convert") {
            // Check if client exists by passport
            let clientId = booking.clientId;
            
            if (booking.clientPassport) {
                const existingClient = await context.cloudflare.env.DB
                    .prepare("SELECT id FROM users WHERE passport_number = ? LIMIT 1")
                    .bind(booking.clientPassport)
                    .first<any>();

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
                            new Date().toISOString(),
                            new Date().toISOString()
                        )
                        .run();
                    clientId = newClientId;
                }
            }

            // Create contract from booking
            const insertContractResult = await context.cloudflare.env.DB
                .prepare(`
                    INSERT INTO contracts (
                        company_car_id, client_id, manager_id, booking_id, start_date, end_date, total_amount, total_currency,
                        deposit_amount, deposit_currency, deposit_payment_method, full_insurance_enabled, full_insurance_price,
                        baby_seat_enabled, baby_seat_price, island_trip_enabled, island_trip_price, krabi_trip_enabled, krabi_trip_price,
                        pickup_district_id, pickup_hotel, pickup_room, delivery_cost, return_district_id, return_hotel, return_room, return_cost,
                        status, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
                `)
                .bind(
                    booking.companyCarId,
                    clientId,
                    user.id,
                    booking.id,
                    booking.startDate,
                    booking.endDate,
                    booking.estimatedAmount,
                    booking.currency,
                    booking.depositAmount,
                    booking.currency,
                    booking.depositPaymentMethod,
                    booking.fullInsuranceEnabled ? 1 : 0,
                    booking.fullInsurancePrice || 0,
                    booking.babySeatEnabled ? 1 : 0,
                    booking.babySeatPrice || 0,
                    booking.islandTripEnabled ? 1 : 0,
                    booking.islandTripPrice || 0,
                    booking.krabiTripEnabled ? 1 : 0,
                    booking.krabiTripPrice || 0,
                    booking.pickupDistrictId,
                    booking.pickupHotel,
                    booking.pickupRoom,
                    booking.deliveryCost || 0,
                    booking.returnDistrictId,
                    booking.returnHotel,
                    booking.returnRoom,
                    booking.returnCost || 0,
                    booking.notes,
                    new Date().toISOString(),
                    new Date().toISOString()
                )
                .run();
            const contract = { id: Number(insertContractResult.meta.last_row_id) };

            // Update booking status to converted
            await context.cloudflare.env.DB
                .prepare("UPDATE bookings SET status = 'converted', updated_at = ? WHERE id = ?")
                .bind(new Date().toISOString(), bookingId)
                .run();

            // Update car status to rented
            const { updateCarStatus } = await import("~/lib/contract-helpers.server");
            await updateCarStatus(context.cloudflare.env.DB, booking.companyCarId, 'rented', 'Booking converted to contract');

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

            return redirect(`/dashboard/contracts/${contract.id}?success=Booking converted to contract successfully`);
        }

        return { error: "Invalid action" };
    } catch {
        return { error: "Failed to process booking action" };
    }
}

export default function BookingDetailsPage() {
    const { booking, user } = useLoaderData<typeof loader>();

    const statusColors = {
        pending: "bg-yellow-100 text-yellow-800",
        confirmed: "bg-blue-100 text-blue-800",
        converted: "bg-green-100 text-green-800",
        cancelled: "bg-red-100 text-red-800",
    };

    const canConvert = booking.status === "pending" || booking.status === "confirmed";
    const canCancel = booking.status === "pending" || booking.status === "confirmed";

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Booking #${booking.id}`}
                leftActions={<BackButton to="/dashboard/bookings" />}
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
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Booking Details</h2>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[booking.status as keyof typeof statusColors]}`}>
                                {booking.status}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Car</h3>
                                <p className="text-base text-gray-900">
                                    {booking.companyCar.template?.brand?.name} {booking.companyCar.template?.model?.name} {booking.companyCar.year}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {booking.companyCar.licensePlate} • {booking.companyCar.color?.name}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
                                    <p className="text-base text-gray-900">
                                        {format(new Date(booking.startDate), "MMM dd, yyyy")}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">End Date</h3>
                                    <p className="text-base text-gray-900">
                                        {format(new Date(booking.endDate), "MMM dd, yyyy")}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Client</h3>
                                <p className="text-base text-gray-900">
                                    {booking.clientName} {booking.clientSurname}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {booking.clientPhone} {booking.clientEmail && `• ${booking.clientEmail}`}
                                </p>
                                {booking.clientPassport && (
                                    <p className="text-sm text-gray-600">
                                        Passport: {booking.clientPassport}
                                    </p>
                                )}
                            </div>

                            {(booking.pickupDistrictId || booking.pickupHotel) && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Pickup</h3>
                                    <p className="text-sm text-gray-900">
                                        {booking.pickupDistrict?.name}
                                        {booking.pickupHotel && ` • ${booking.pickupHotel}`}
                                        {booking.pickupRoom && ` • Room ${booking.pickupRoom}`}
                                    </p>
                                </div>
                            )}

                            {(booking.returnDistrictId || booking.returnHotel) && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Return</h3>
                                    <p className="text-sm text-gray-900">
                                        {booking.returnDistrict?.name}
                                        {booking.returnHotel && ` • ${booking.returnHotel}`}
                                        {booking.returnRoom && ` • Room ${booking.returnRoom}`}
                                    </p>
                                </div>
                            )}

                            {booking.notes && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                                    <p className="text-sm text-gray-900">{booking.notes}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Estimated Amount</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {booking.currency} {booking.estimatedAmount.toFixed(2)}
                                </span>
                            </div>
                            {(booking.depositAmount ?? 0) > 0 && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Deposit</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {booking.currency} {(booking.depositAmount ?? 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Deposit Status</span>
                                        <span className={`text-sm font-medium ${booking.depositPaid ? 'text-green-600' : 'text-red-600'}`}>
                                            {booking.depositPaid ? 'Paid' : 'Unpaid'}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>

                    {(booking.fullInsuranceEnabled || booking.babySeatEnabled || booking.islandTripEnabled || booking.krabiTripEnabled) && (
                        <Card>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Extras</h2>
                            <div className="space-y-2">
                                {booking.fullInsuranceEnabled && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Full Insurance</span>
                                        <span className="text-gray-900">{booking.currency} {(booking.fullInsurancePrice ?? 0).toFixed(2)}</span>
                                    </div>
                                )}
                                {booking.babySeatEnabled && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Baby Seat</span>
                                        <span className="text-gray-900">{booking.currency} {(booking.babySeatPrice ?? 0).toFixed(2)}</span>
                                    </div>
                                )}
                                {booking.islandTripEnabled && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Island Trip</span>
                                        <span className="text-gray-900">{booking.currency} {(booking.islandTripPrice ?? 0).toFixed(2)}</span>
                                    </div>
                                )}
                                {booking.krabiTripEnabled && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Krabi Trip</span>
                                        <span className="text-gray-900">{booking.currency} {(booking.krabiTripPrice ?? 0).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    <Card>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-gray-600">Created:</span>
                                <span className="text-gray-900 ml-2">
                                    {format(new Date(booking.createdAt), "MMM dd, yyyy HH:mm")}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">Updated:</span>
                                <span className="text-gray-900 ml-2">
                                    {format(new Date(booking.updatedAt), "MMM dd, yyyy HH:mm")}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
