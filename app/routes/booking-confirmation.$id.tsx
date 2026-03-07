import { useLoaderData } from "react-router";
import type { Route } from "./+types/booking-confirmation.$id";
import BookingConfirmationDetailPageView from "~/features/booking-confirmation/BookingConfirmationDetailPageView";
import { loadBookingConfirmationDetailPage } from "~/features/booking-confirmation/booking-confirmation-detail.loader.server";

export function meta({ data }: Route.MetaArgs) {
  const title = data?.contractId ? `Booking Confirmation #${data.contractId} | Phuket Ride` : "Booking Confirmation | Phuket Ride";
  return [
    { title },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  return loadBookingConfirmationDetailPage({
    db: context.cloudflare.env.DB,
    contractIdParam: params.id,
    request,
  });
}

export default function BookingConfirmationPage() {
  const data = useLoaderData<typeof loader>();
  return <BookingConfirmationDetailPageView {...data} />;
}
