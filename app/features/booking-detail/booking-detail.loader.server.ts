import { getScopedDb } from "~/lib/db-factory.server";
import { mapBookingDetailRow } from "~/lib/bookings-detail.server";

export type BookingDetail = ReturnType<typeof mapBookingDetailRow>;

import { type AppLoadContext } from "~/types/context";

export async function loadBookingDetailPage(args: {
  request: Request;
  bookingIdParam: string | undefined;
  context: AppLoadContext;
}) {
  const { request, bookingIdParam, context } = args;
  const bookingId = Number(bookingIdParam);
  if (isNaN(bookingId)) {
    throw new Response("Invalid booking ID", { status: 400 });
  }

  const { user, sdb } = await getScopedDb(request, context);
  const bookingRaw = await sdb.bookings.getById(bookingId);
  const booking = bookingRaw ? mapBookingDetailRow(bookingRaw) : null;

  if (!booking) {
    throw new Response("Booking not found", { status: 404 });
  }

  return { booking, user };
}
