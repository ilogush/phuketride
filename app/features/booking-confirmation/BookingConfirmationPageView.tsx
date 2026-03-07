import { Link } from "react-router";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";

import Breadcrumbs from "~/components/public/Breadcrumbs";
import Footer from "~/components/public/Footer";
import Header from "~/components/public/Header";

import type { BookingConfirmationLoaderData } from "./booking-confirmation.loader.server";

const money = (value: number) => `฿${Math.round(value || 0).toLocaleString()}`;

export default function BookingConfirmationPageView({
  status,
  message,
  bookingSummary,
  breadcrumbs,
}: BookingConfirmationLoaderData) {
  const isError = status === "error";

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Breadcrumbs items={breadcrumbs} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="min-h-[220px]">
          <h1 className="text-2xl font-semibold text-gray-900">
            {isError ? "Booking request received" : "Booking confirmed"}
          </h1>
          <p className="mt-2 text-sm text-gray-700">{message}</p>
          <div className="mt-4 rounded-xl bg-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-900">Booking details</h2>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
              <p>
                <span className="text-gray-500">Booking ID:</span> #
                {bookingSummary?.bookingId || "-"}
              </p>
              <p>
                <span className="text-gray-500">Contract ID:</span> #
                {bookingSummary?.contractId || "-"}
              </p>
              <p>
                <span className="text-gray-500">Client:</span>{" "}
                {bookingSummary?.clientLabel || "-"}
              </p>
              <p>
                <span className="text-gray-500">Car:</span>{" "}
                {bookingSummary?.carLabel || "-"}
              </p>
              <p>
                <span className="text-gray-500">Plate:</span>{" "}
                {bookingSummary?.licensePlate || "-"}
              </p>
              <p>
                <span className="text-gray-500">Rental period start:</span>{" "}
                {bookingSummary?.startDate
                  ? new Date(bookingSummary.startDate).toLocaleString()
                  : "-"}
              </p>
              <p>
                <span className="text-gray-500">Rental period end:</span>{" "}
                {bookingSummary?.endDate
                  ? new Date(bookingSummary.endDate).toLocaleString()
                  : "-"}
              </p>
              <p>
                <span className="text-gray-500">Trip total:</span>{" "}
                {bookingSummary
                  ? `${money(bookingSummary.totalAmount)} ${
                      bookingSummary.totalCurrency || "THB"
                    }`
                  : "-"}
              </p>
              <p>
                <span className="text-gray-500">Deposit:</span>{" "}
                {bookingSummary
                  ? `${money(bookingSummary.depositAmount || 0)} THB`
                  : "-"}
              </p>
            </div>
          </div>
        </section>
        <div className="mt-4 flex gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-base font-medium text-white hover:bg-green-700"
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
