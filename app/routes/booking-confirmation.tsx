import { useLoaderData } from "react-router";
import type { Route } from "./+types/booking-confirmation";
import BookingConfirmationPageView from "~/features/booking-confirmation/BookingConfirmationPageView";
import { loadBookingConfirmationPage } from "~/features/booking-confirmation/booking-confirmation.loader.server";

export function meta() {
  return [
    { title: "Booking Confirmation | Phuket Ride" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  return loadBookingConfirmationPage({
    db: context.cloudflare.env.DB,
    request,
  });
}

export default function BookingConfirmationGenericPage() {
  const data = useLoaderData<typeof loader>();
  return <BookingConfirmationPageView {...data} />;
}
