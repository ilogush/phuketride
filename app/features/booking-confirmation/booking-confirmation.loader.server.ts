export interface BookingConfirmationSummary {
  contractId: number;
  bookingId: number | null;
  startDate: string;
  endDate: string;
  totalAmount: number;
  totalCurrency: string | null;
  depositAmount: number | null;
  carLabel: string;
  licensePlate: string | null;
  clientLabel: string;
}

export interface BookingConfirmationLoaderData {
  status: string;
  message: string;
  bookingSummary: BookingConfirmationSummary | null;
  breadcrumbs: Array<{
    label: string;
    to?: string;
  }>;
}

export async function loadBookingConfirmationPage(args: {
  db: D1Database;
  request: Request;
}): Promise<BookingConfirmationLoaderData> {
  const { request } = args;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "ok";
  const message =
    url.searchParams.get("message") || "Your booking request has been received.";

  return {
    status,
    message,
    bookingSummary: null,
    breadcrumbs: [
      { label: "Home", to: "/" },
      { label: "Booking confirmation" },
    ],
  };
}
