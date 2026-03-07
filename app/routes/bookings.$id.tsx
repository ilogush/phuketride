import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form, Link } from "react-router";
import { requireBookingAccess } from "~/lib/access-policy.server";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import BookingDetailsCard from "~/components/dashboard/bookings/BookingDetailsCard";
import BookingSidebarCards from "~/components/dashboard/bookings/BookingSidebarCards";
import { type BookingDetailRow, mapBookingDetailRow } from "~/lib/bookings-detail.server";
import { cancelBooking, convertBookingToContract } from "~/lib/booking-actions.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const bookingId = Number(params.id);
    const { user } = await requireBookingAccess(request, context.cloudflare.env.DB, bookingId);

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
    const bookingId = Number(params.id);
    const { user, companyId } = await requireBookingAccess(request, context.cloudflare.env.DB, bookingId);
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
        throw new Response("Invalid action", { status: 400 });
    }
    const action = actionParsed.data.action;

    try {
        return trackServerOperation({
            event: `booking.${action}`,
            scope: "route.action",
            request,
            userId: user.id,
            companyId,
            entityId: bookingId,
            details: { route: "bookings.$id" },
            run: async () => {
                if (action === "cancel") {
                    return cancelBooking({
                        db: context.cloudflare.env.DB,
                        request,
                        user,
                        companyId,
                        bookingId,
                    });
                }

                if (action === "convert") {
                    return convertBookingToContract({
                        db: context.cloudflare.env.DB,
                        request,
                        user,
                        companyId,
                        bookingId,
                    });
                }
                throw new Response("Invalid action", { status: 400 });
            },
        });
    } catch (error) {
        if (error instanceof Response) throw error;
        throw new Response("Failed to process booking action", { status: 500 });
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
