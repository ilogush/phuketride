import { z } from "zod";

import { cancelBooking, convertBookingToContract } from "~/lib/booking-actions.server";
import { requireBookingAccess } from "~/lib/access-policy.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { parseWithSchema } from "~/lib/validation.server";

import { getScopedDb } from "~/lib/db-factory.server";
import { type AppLoadContext } from "~/types/context";

export async function submitBookingDetailAction(args: {
  request: Request;
  bookingIdParam: string | undefined;
  context: AppLoadContext;
}) {
  const { request, bookingIdParam, context } = args;
  const bookingId = Number(bookingIdParam);
  const { sdb, user, companyId } = await getScopedDb(request, context);
  const db = sdb.rawDb;
  await requireBookingAccess(request, db, bookingId);
  const formData = await request.formData();
  const actionParsed = parseWithSchema(
    z.object({
      action: z.enum(["cancel", "convert"] as const),
    }),
    {
      action: formData.get("_action"),
    },
    "Invalid action",
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
            db,
            request,
            user,
            companyId,
            bookingId,
          });
        }

        if (action === "convert") {
          return convertBookingToContract({
            db,
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
    if (error instanceof Response) {
      throw error;
    }
    throw new Response("Failed to process booking action", { status: 500 });
  }
}
