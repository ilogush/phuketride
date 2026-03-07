import { requireBookingAccess } from "~/lib/access-policy.server";
import { mapBookingDetailRow } from "~/lib/bookings-detail.server";
import { getBookingDetailById } from "~/lib/bookings-repo.server";

export type BookingDetail = ReturnType<typeof mapBookingDetailRow>;

export async function loadBookingDetailPage(args: {
  db: D1Database;
  request: Request;
  bookingIdParam: string | undefined;
}) {
  const { db, request, bookingIdParam } = args;
  const bookingId = Number(bookingIdParam);
  const { user } = await requireBookingAccess(request, db, bookingId);
  const bookingRaw = await getBookingDetailById({ db, bookingId });
  const booking = bookingRaw ? mapBookingDetailRow(bookingRaw) : null;

  if (!booking) {
    throw new Response("Booking not found", { status: 404 });
  }

  return { booking, user };
}
