import { Link } from "react-router";
import type { Route } from "./+types/booking-confirmation";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";
import Breadcrumbs from "~/components/public/Breadcrumbs";

const money = (value: number) => `฿${Math.round(value || 0).toLocaleString()}`;

export function meta() {
  return [
    { title: "Booking Confirmation | Phuket Ride" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "ok";
  const message = url.searchParams.get("message") || "Your booking request has been received.";
  let contractId = Number(url.searchParams.get("contractId") || 0) || null;
  let bookingId = Number(url.searchParams.get("bookingId") || 0) || null;

  if (!contractId) {
    const latestContract = await context.cloudflare.env.DB
      .prepare("SELECT id FROM contracts ORDER BY created_at DESC LIMIT 1")
      .first() as { id: number } | null;
    contractId = latestContract?.id || null;
  }
  if (!bookingId) {
    const latestBooking = await context.cloudflare.env.DB
      .prepare("SELECT id FROM bookings ORDER BY created_at DESC LIMIT 1")
      .first() as { id: number } | null;
    bookingId = latestBooking?.id || null;
  }

  let bookingSummary: {
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
  } | null = null;

  if (contractId) {
    const contract = await context.cloudflare.env.DB
      .prepare(`
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
      `)
      .bind(contractId)
      .first() as {
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
    } | null;

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
        clientLabel: `${contract.clientName || ""} ${contract.clientSurname || ""}`.trim() || "Client",
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

export default function BookingConfirmationGenericPage({ loaderData }: Route.ComponentProps) {
  const isError = loaderData.status === "error";
  const summary = loaderData.bookingSummary;
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Breadcrumbs items={loaderData.breadcrumbs} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="min-h-[220px]">
          <h1 className="text-2xl font-semibold text-gray-900">
            {isError ? "Booking request received" : "Booking confirmed"}
          </h1>
          <p className="mt-2 text-sm text-gray-700">{loaderData.message}</p>
          <div className="mt-4 rounded-xl bg-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-900">Booking details</h2>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
              <p><span className="text-gray-500">Booking ID:</span> #{summary?.bookingId || "-"}</p>
              <p><span className="text-gray-500">Contract ID:</span> #{summary?.contractId || "-"}</p>
              <p><span className="text-gray-500">Car:</span> {summary?.carLabel || "-"}</p>
              <p><span className="text-gray-500">Plate:</span> {summary?.licensePlate || "-"}</p>
              <p><span className="text-gray-500">Rental period start:</span> {summary?.startDate ? new Date(summary.startDate).toLocaleString() : "-"}</p>
              <p><span className="text-gray-500">Rental period end:</span> {summary?.endDate ? new Date(summary.endDate).toLocaleString() : "-"}</p>
              <p><span className="text-gray-500">Trip total:</span> {summary ? `${money(summary.totalAmount)} ${summary.totalCurrency || "THB"}` : "-"}</p>
              <p><span className="text-gray-500">Deposit:</span> {summary ? `${money(summary.depositAmount || 0)} THB` : "-"}</p>
            </div>
          </div>
        </section>
        <div className="mt-4 flex gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-green-600 text-white px-5 py-3 text-base font-medium hover:bg-green-700 gap-2"
          >
            <ChevronLeftIcon className="h-5 w-5" />
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
