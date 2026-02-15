import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import Card from "~/components/dashboard/Card";
import { format } from "date-fns";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const bookingId = Number(params.id);

    const booking = await db.query.bookings.findFirst({
        where: eq(schema.bookings.id, bookingId),
        with: {
            companyCar: {
                with: {
                    template: {
                        with: {
                            brand: true,
                            model: true,
                        }
                    },
                    color: true,
                }
            },
            pickupDistrict: true,
            returnDistrict: true,
        }
    });

    if (!booking) {
        throw new Response("Booking not found", { status: 404 });
    }

    return { booking, user };
}

export async function action({ request, params, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const bookingId = Number(params.id);
    const formData = await request.formData();
    const action = formData.get("_action");

    try {
        const booking = await db.query.bookings.findFirst({
            where: eq(schema.bookings.id, bookingId),
        });

        if (!booking) {
            return { error: "Booking not found" };
        }

        if (action === "cancel") {
            // Cancel booking
            await db.update(schema.bookings)
                .set({ status: "cancelled", updatedAt: new Date() })
                .where(eq(schema.bookings.id, bookingId));

            // Update car status back to available
            const { updateCarStatus } = await import("~/lib/contract-helpers.server");
            await updateCarStatus(db, booking.companyCarId, 'available', 'Booking cancelled');

            // Audit log
            const metadata = getRequestMetadata(request);
            await quickAudit({
                db,
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
                const existingClient = await db.query.users.findFirst({
                    where: eq(schema.users.passportNumber, booking.clientPassport),
                });

                if (existingClient) {
                    clientId = existingClient.id;
                } else {
                    // Create new client user
                    const [newClient] = await db.insert(schema.users).values({
                        id: crypto.randomUUID(),
                        email: booking.clientEmail || `${booking.clientPassport}@temp.com`,
                        role: "user",
                        name: booking.clientName,
                        surname: booking.clientSurname,
                        phone: booking.clientPhone,
                        passportNumber: booking.clientPassport,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }).returning();
                    clientId = newClient.id;
                }
            }

            // Create contract from booking
            const [contract] = await db.insert(schema.contracts).values({
                companyCarId: booking.companyCarId,
                clientId,
                managerId: user.id,
                bookingId: booking.id,
                startDate: booking.startDate,
                endDate: booking.endDate,
                totalAmount: booking.estimatedAmount,
                totalCurrency: booking.currency,
                depositAmount: booking.depositAmount,
                depositCurrency: booking.currency,
                depositPaymentMethod: booking.depositPaymentMethod,
                fullInsuranceEnabled: booking.fullInsuranceEnabled,
                fullInsurancePrice: booking.fullInsurancePrice,
                babySeatEnabled: booking.babySeatEnabled,
                babySeatPrice: booking.babySeatPrice,
                islandTripEnabled: booking.islandTripEnabled,
                islandTripPrice: booking.islandTripPrice,
                krabiTripEnabled: booking.krabiTripEnabled,
                krabiTripPrice: booking.krabiTripPrice,
                pickupDistrictId: booking.pickupDistrictId,
                pickupHotel: booking.pickupHotel,
                pickupRoom: booking.pickupRoom,
                deliveryCost: booking.deliveryCost,
                returnDistrictId: booking.returnDistrictId,
                returnHotel: booking.returnHotel,
                returnRoom: booking.returnRoom,
                returnCost: booking.returnCost,
                status: "active",
                notes: booking.notes,
                createdAt: new Date(),
                updatedAt: new Date(),
            }).returning();

            // Update booking status to converted
            await db.update(schema.bookings)
                .set({ status: "converted", updatedAt: new Date() })
                .where(eq(schema.bookings.id, bookingId));

            // Update car status to rented
            const { updateCarStatus } = await import("~/lib/contract-helpers.server");
            await updateCarStatus(db, booking.companyCarId, 'rented', 'Booking converted to contract');

            // Audit logs
            const metadata = getRequestMetadata(request);
            await quickAudit({
                db,
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
                db,
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
    } catch (error) {
        console.error("Failed to process booking action:", error);
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
