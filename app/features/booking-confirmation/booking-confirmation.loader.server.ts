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

type BookingConfirmationRow = {
  contractId: number;
  startDate: string;
  endDate: string;
  totalAmount: number;
  totalCurrency: string | null;
  depositAmount: number | null;
  licensePlate: string | null;
  brandName: string | null;
  modelName: string | null;
  clientName: string | null;
  clientSurname: string | null;
};

export async function loadBookingConfirmationPage(args: {
  db: D1Database;
  request: Request;
}): Promise<BookingConfirmationLoaderData> {
  const { db, request } = args;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "ok";
  const message =
    url.searchParams.get("message") || "Your booking request has been received.";
  let contractId = Number(url.searchParams.get("contractId") || 0) || null;
  let bookingId = Number(url.searchParams.get("bookingId") || 0) || null;

  if (!contractId) {
    const latestContract = (await db
      .prepare("SELECT id FROM contracts ORDER BY created_at DESC LIMIT 1")
      .first()) as { id: number } | null;
    contractId = latestContract?.id || null;
  }

  if (!bookingId) {
    const latestBooking = (await db
      .prepare("SELECT id FROM bookings ORDER BY created_at DESC LIMIT 1")
      .first()) as { id: number } | null;
    bookingId = latestBooking?.id || null;
  }

  let bookingSummary: BookingConfirmationSummary | null = null;

  if (contractId) {
    const contract = (await db
      .prepare(
        `
        SELECT
          c.id AS contractId,
          c.start_date AS startDate,
          c.end_date AS endDate,
          c.total_amount AS totalAmount,
          c.total_currency AS totalCurrency,
          c.deposit_amount AS depositAmount,
          cc.license_plate AS licensePlate,
          cb.name AS brandName,
          cm.name AS modelName,
          u.name AS clientName,
          u.surname AS clientSurname
        FROM contracts c
        JOIN company_cars cc ON cc.id = c.company_car_id
        LEFT JOIN car_templates ct ON ct.id = cc.template_id
        LEFT JOIN car_brands cb ON cb.id = ct.brand_id
        LEFT JOIN car_models cm ON cm.id = ct.model_id
        LEFT JOIN users u ON u.id = c.client_id
        WHERE c.id = ?
        LIMIT 1
        `,
      )
      .bind(contractId)
      .first()) as BookingConfirmationRow | null;

    if (contract) {
      bookingSummary = {
        contractId: contract.contractId,
        bookingId,
        startDate: contract.startDate,
        endDate: contract.endDate,
        totalAmount: Number(contract.totalAmount || 0),
        totalCurrency: contract.totalCurrency,
        depositAmount: contract.depositAmount,
        carLabel: `${contract.brandName || "Car"} ${contract.modelName || ""}`.trim(),
        licensePlate: contract.licensePlate,
        clientLabel:
          `${contract.clientName || ""} ${contract.clientSurname || ""}`.trim() ||
          "Client",
      };
    }
  }

  return {
    status,
    message,
    bookingSummary,
    breadcrumbs: [
      { label: "Home", to: "/" },
      { label: "Booking confirmation" },
    ],
  };
}
