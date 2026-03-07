import { Link } from "react-router";

import Breadcrumbs from "~/components/public/Breadcrumbs";
import Footer from "~/components/public/Footer";
import Header from "~/components/public/Header";

import type { BookingConfirmationDetailData } from "./booking-confirmation-detail.loader.server";

const money = (value: number) => `฿${Math.round(value || 0).toLocaleString()}`;

export default function BookingConfirmationDetailPageView(
  data: BookingConfirmationDetailData,
) {
  const carLabel = `${data.brandName || "Car"} ${data.modelName || ""}`.trim();
  const clientLabel =
    `${data.clientName || ""} ${data.clientSurname || ""}`.trim() || "Client";

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Breadcrumbs items={data.breadcrumbs} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <h1 className="text-2xl font-semibold text-gray-900">Booking confirmed</h1>
          <p className="mt-2 text-sm text-gray-700">
            Your request has been submitted successfully. A booking, contract,
            calendar entries, and payment records were created automatically.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Booking summary</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
            <p>
              <span className="text-gray-500">Booking ID:</span> #{data.bookingId || "-"}
            </p>
            <p>
              <span className="text-gray-500">Contract ID:</span> #{data.contractId}
            </p>
            <p>
              <span className="text-gray-500">Client:</span> {clientLabel}
            </p>
            <p>
              <span className="text-gray-500">Phone:</span> {data.clientPhone || "-"}
            </p>
            <p>
              <span className="text-gray-500">Car:</span> {carLabel}
            </p>
            <p>
              <span className="text-gray-500">Plate:</span> {data.licensePlate || "-"}
            </p>
            <p>
              <span className="text-gray-500">Start:</span>{" "}
              {new Date(data.startDate).toLocaleString()}
            </p>
            <p>
              <span className="text-gray-500">End:</span>{" "}
              {new Date(data.endDate).toLocaleString()}
            </p>
            <p>
              <span className="text-gray-500">Trip total:</span> {money(data.totalAmount)}{" "}
              {data.totalCurrency || "THB"}
            </p>
            <p>
              <span className="text-gray-500">Deposit:</span>{" "}
              {money(data.depositAmount || 0)} THB
            </p>
            <p>
              <span className="text-gray-500">Payments created:</span> {data.totalPayments}
            </p>
            <p>
              <span className="text-gray-500">Pending payments:</span>{" "}
              {data.pendingPayments}
            </p>
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
