import { redirect } from "react-router";
import type { Route } from "./+types/booking-confirmation.$id";

export function meta() {
  const title = "Booking Confirmation | Phuket Ride";
  return [
    { title },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  void context;
  void params;
  void request;
  throw redirect("/booking-confirmation");
}

export default function BookingConfirmationPage() {
  return null;
}
