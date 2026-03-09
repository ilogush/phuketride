import { type MetaFunction, redirect } from "react-router";
import type { Route } from "./+types/bookings.$id";
import { useLoaderData } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Booking Details — Phuket Ride Admin" },
    { name: "robots", content: "noindex, nofollow" },
];
import BookingDetailPageView from "~/features/booking-detail/BookingDetailPageView";
import { submitBookingDetailAction } from "~/features/booking-detail/booking-detail.action.server";
import { loadBookingDetailPage } from "~/features/booking-detail/booking-detail.loader.server";
import { requireBookingAccess } from "~/lib/access-policy.server";
import { assertSameOriginMutation } from "~/lib/request-security.server";
import { getScopedDb } from "~/lib/db-factory.server";

import { type AppLoadContext } from "~/types/context";

export async function loader({ request, params, context }: Route.LoaderArgs) {
    const bookingId = Number(params.id);
    const { sdb } = await getScopedDb(request, context as AppLoadContext);
    await requireBookingAccess(request, sdb.rawDb, bookingId);
    return loadBookingDetailPage({
        request,
        bookingIdParam: params.id,
        context: context as AppLoadContext,
    });
}

export async function action({ request, params, context }: Route.ActionArgs) {
    assertSameOriginMutation(request);
    return submitBookingDetailAction({
        request,
        bookingIdParam: params.id,
        context: context as AppLoadContext,
    });
}

export default function BookingDetailsPage() {
    const { booking } = useLoaderData<typeof loader>();
    return <BookingDetailPageView booking={booking} />;
}
