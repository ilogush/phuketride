import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import BookingDetailPageView from "~/features/booking-detail/BookingDetailPageView";
import { submitBookingDetailAction } from "~/features/booking-detail/booking-detail.action.server";
import { loadBookingDetailPage } from "~/features/booking-detail/booking-detail.loader.server";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    return loadBookingDetailPage({
        db: context.cloudflare.env.DB,
        request,
        bookingIdParam: params.id,
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
    useUrlToast();
    return <BookingDetailPageView booking={booking} />;
}
