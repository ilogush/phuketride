import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Booking Details — Phuket Ride Admin" },
    { name: "robots", content: "noindex, nofollow" },
];
import BookingDetailPageView from "~/features/booking-detail/BookingDetailPageView";
import { submitBookingDetailAction } from "~/features/booking-detail/booking-detail.action.server";
import { loadBookingDetailPage } from "~/features/booking-detail/booking-detail.loader.server";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    return loadBookingDetailPage({
        request,
        bookingIdParam: params.id,
        context: context,
    });
}

export async function action({ request, params, context }: ActionFunctionArgs) {
    return submitBookingDetailAction({
        db: context.cloudflare.env.DB,
        request,
        bookingIdParam: params.id,
    });
}

export default function BookingDetailsPage() {
    const { booking } = useLoaderData<typeof loader>();
    return <BookingDetailPageView booking={booking} />;
}
