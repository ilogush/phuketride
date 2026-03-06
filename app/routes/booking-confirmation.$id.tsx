import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/booking-confirmation.$id";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";
import Breadcrumbs from "~/components/public/Breadcrumbs";

const money = (value: number) => `฿${Math.round(value || 0).toLocaleString()}`;

export function meta({ data }: Route.MetaArgs) {
  const title = data?.contractId ? `Booking Confirmation #${data.contractId} | Phuket Ride` : "Booking Confirmation | Phuket Ride";
  return [
    { title },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const contractId = Number(params.id || 0);
  const bookingIdFromQuery = Number(new URL(request.url).searchParams.get("bookingId") || 0) || null;
  if (!contractId) {
    throw new Response("Invalid contract id", { status: 400 });
  }

  const contract = await context.cloudflare.env.DB
    .prepare(`
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
    `)
    .bind(contractId)
    .first() as {
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
  } | null;

  if (!contract) {
    throw new Response("Confirmation not found", { status: 404 });
  }

  const paymentStats = await context.cloudflare.env.DB
    .prepare(`
      SELECT
        COUNT(*) AS totalPayments,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingPayments
      FROM payments
      WHERE contract_id = ?
    `)
    .bind(contractId)
    .first() as { totalPayments?: number | string; pendingPayments?: number | string } | null;

  const breadcrumbs = [
    { label: "Home", to: "/" },
    { label: "Booking confirmation" },
  ];

  return {
    ...contract,
    bookingId: bookingIdFromQuery,
    totalPayments: Number(paymentStats?.totalPayments || 0),
    pendingPayments: Number(paymentStats?.pendingPayments || 0),
    breadcrumbs,
    canonicalUrl: request.url,
  };
}

export default function BookingConfirmationPage() {
  const data = useLoaderData<typeof loader>();
  const carLabel = `${data.brandName || "Car"} ${data.modelName || ""}`.trim();
  const clientLabel = `${data.clientName || ""} ${data.clientSurname || ""}`.trim() || "Client";

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Breadcrumbs items={data.breadcrumbs} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <h1 className="text-2xl font-semibold text-gray-900">Booking confirmed</h1>
          <p className="mt-2 text-sm text-gray-700">
            Your request has been submitted successfully. A booking, contract, calendar entries, and payment records were created automatically.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Booking summary</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
            <p><span className="text-gray-500">Booking ID:</span> #{data.bookingId || "-"}</p>
            <p><span className="text-gray-500">Contract ID:</span> #{data.contractId}</p>
            <p><span className="text-gray-500">Client:</span> {clientLabel}</p>
            <p><span className="text-gray-500">Phone:</span> {data.clientPhone || "-"}</p>
            <p><span className="text-gray-500">Car:</span> {carLabel}</p>
            <p><span className="text-gray-500">Plate:</span> {data.licensePlate || "-"}</p>
            <p><span className="text-gray-500">Start:</span> {new Date(data.startDate).toLocaleString()}</p>
            <p><span className="text-gray-500">End:</span> {new Date(data.endDate).toLocaleString()}</p>
            <p><span className="text-gray-500">Trip total:</span> {money(data.totalAmount)} {data.totalCurrency || "THB"}</p>
            <p><span className="text-gray-500">Deposit:</span> {money(data.depositAmount || 0)} THB</p>
            <p><span className="text-gray-500">Payments created:</span> {data.totalPayments}</p>
            <p><span className="text-gray-500">Pending payments:</span> {data.pendingPayments}</p>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex items-center rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            Go to Home
          </Link>
          {data.bookingId ? (
            <Link
              to={`/bookings/${data.bookingId}`}
              className="inline-flex items-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Open Booking (Dashboard)
            </Link>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
