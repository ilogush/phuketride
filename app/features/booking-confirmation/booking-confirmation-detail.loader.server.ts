export interface BookingConfirmationDetailData {
  contractId: number;
  startDate: string;
  endDate: string;
  totalAmount: number;
  totalCurrency: string | null;
  depositAmount: number | null;
  status: string;
  createdAt: string;
  licensePlate: string | null;
  year: number | null;
  brandName: string | null;
  modelName: string | null;
  clientName: string | null;
  clientSurname: string | null;
  clientPhone: string | null;
  bookingId: number | null;
  totalPayments: number;
  pendingPayments: number;
  breadcrumbs: Array<{
    label: string;
    to?: string;
  }>;
  canonicalUrl: string;
}

type BookingConfirmationContractRow = Omit<
  BookingConfirmationDetailData,
  "bookingId" | "totalPayments" | "pendingPayments" | "breadcrumbs" | "canonicalUrl"
>;

export async function loadBookingConfirmationDetailPage(args: {
  db: D1Database;
  contractIdParam: string | undefined;
  request: Request;
}): Promise<BookingConfirmationDetailData> {
  const { db, contractIdParam, request } = args;
  const contractId = Number(contractIdParam || 0);
  const bookingIdFromQuery =
    Number(new URL(request.url).searchParams.get("bookingId") || 0) || null;

  if (!contractId) {
    throw new Response("Invalid contract id", { status: 400 });
  }

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
        c.status,
        c.created_at AS createdAt,
        cc.license_plate AS licensePlate,
        cc.year AS year,
        cb.name AS brandName,
        cm.name AS modelName,
        u.name AS clientName,
        u.surname AS clientSurname,
        u.phone AS clientPhone
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
    .first()) as BookingConfirmationContractRow | null;

  if (!contract) {
    throw new Response("Confirmation not found", { status: 404 });
  }

  const paymentStats = (await db
    .prepare(
      `
      SELECT
        COUNT(*) AS totalPayments,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingPayments
      FROM payments
      WHERE contract_id = ?
      `,
    )
    .bind(contractId)
    .first()) as { totalPayments?: number | string; pendingPayments?: number | string } | null;

  return {
    ...contract,
    bookingId: bookingIdFromQuery,
    totalPayments: Number(paymentStats?.totalPayments || 0),
    pendingPayments: Number(paymentStats?.pendingPayments || 0),
    breadcrumbs: [
      { label: "Home", to: "/" },
      { label: "Booking confirmation" },
    ],
    canonicalUrl: request.url,
  };
}
