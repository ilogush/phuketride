import { CalendarDaysIcon, MapPinIcon } from "@heroicons/react/24/outline";

const money = (value: number) => `฿${Math.round(value).toLocaleString()}`;

const monthDay = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const formatTripDate = (value: unknown) => {
  const date = new Date(Number(value || Date.now()));
  if (Number.isNaN(date.getTime())) {
    return "Fri, Mar 27 at 10:00";
  }
  return `${monthDay.format(date)} at ${timeFormat.format(date)}`;
};

export interface CheckoutSummaryCardProps {
  carName: string;
  photoUrl: string;
  year: number;
  rating: string;
  trips: number;
  pickupAt: number;
  returnAt: number;
  address: string;
  returnAddress: string;
  deliveryFee: number;
  returnFee: number;
  extrasTotal: number;
  pickupAfterHoursFee: number;
  returnAfterHoursFee: number;
  withUnlimitedTrips: boolean;
  babySeatExtra: number;
  islandTripExtra: number;
  krabiTripExtra: number;
  insuranceTotal: number;
  depositTotal: number;
  subtotal: number;
  salesTax: number;
  includedDistance: number;
  tripTotal: number;
  submitting?: boolean;
}

export default function CheckoutSummaryCard({
  carName,
  photoUrl,
  year,
  rating,
  trips,
  pickupAt,
  returnAt,
  address,
  returnAddress,
  deliveryFee,
  returnFee,
  extrasTotal,
  pickupAfterHoursFee,
  returnAfterHoursFee,
  withUnlimitedTrips,
  babySeatExtra,
  islandTripExtra,
  krabiTripExtra,
  insuranceTotal,
  depositTotal,
  subtotal,
  salesTax,
  includedDistance,
  tripTotal,
  submitting = false,
}: CheckoutSummaryCardProps) {
  const renderTripDate = (value: number) => {
    const raw = formatTripDate(value);
    const [datePart, timePart] = raw.split(" at ");
    if (!timePart) return <>{raw}</>;
    const commaIndex = datePart.indexOf(",");
    const weekday = commaIndex > -1 ? datePart.slice(0, commaIndex) : "";
    const dateWithoutWeekday = commaIndex > -1 ? datePart.slice(commaIndex + 1).trim() : datePart;
    return (
      <>
        {weekday ? <span className="text-gray-500">{weekday}</span> : null}
        {weekday ? ", " : ""}
        {dateWithoutWeekday} <span className="text-gray-500">at</span> {timePart}
      </>
    );
  };

  return (
    <aside className="overflow-hidden rounded-2xl border border-gray-200 bg-white lg:sticky lg:top-4">
      <div>
        <img src={photoUrl} alt={carName} className="h-48 w-full object-cover" />
      </div>
      <div className="p-4">
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-semibold text-gray-800">{carName}</h2>
          <p className="mt-1 text-base text-gray-800">
            {year} · {rating}
            <span className="text-green-600">★</span> ({trips} trip{trips === 1 ? "" : "s"})
          </p>
        </div>

        <div className="mt-6 space-y-2 text-base text-gray-800">
          <div className="flex items-start gap-3">
            <CalendarDaysIcon className="mt-0.5 h-4 w-4 text-gray-800" />
            <div>
              <p>{renderTripDate(pickupAt)}</p>
              <p>{renderTripDate(returnAt)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPinIcon className="mt-0.5 h-4 w-4 text-gray-800" />
            <div>
              <p><span className="text-gray-500">Pickup:</span> {address}</p>
              <p><span className="text-gray-500">Return:</span> {returnAddress}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="space-y-4 text-base">
            <div className="flex items-center justify-between">
              <span>Delivery fee</span>
              <span>{money(deliveryFee)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Return fee</span>
              <span>{money(returnFee)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Extras</span>
              <span>{money(extrasTotal)}</span>
            </div>
            <div className="pl-3 text-sm text-gray-600 space-y-1">
              {pickupAfterHoursFee > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Pickup after-hours extra</span>
                  <span>{money(pickupAfterHoursFee)}</span>
                </div>
              ) : null}
              {returnAfterHoursFee > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Return after-hours extra</span>
                  <span>{money(returnAfterHoursFee)}</span>
                </div>
              ) : null}
              {babySeatExtra > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Baby seat</span>
                  <span>{money(babySeatExtra)}</span>
                </div>
              ) : null}
              {withUnlimitedTrips ? (
                <div className="flex items-center justify-between">
                  <span>Unlimited trips</span>
                  <span>Included</span>
                </div>
              ) : null}
              {islandTripExtra > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Island trip</span>
                  <span>{money(islandTripExtra)}</span>
                </div>
              ) : null}
              {krabiTripExtra > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Krabi trip</span>
                  <span>{money(krabiTripExtra)}</span>
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-between">
              <span>Insurance</span>
              <span>{money(insuranceTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <button type="button" className="underline decoration-1 underline-offset-2">
                Subtotal
              </button>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <button type="button" className="underline decoration-1 underline-offset-2">
                Sales tax
              </button>
              <span>{money(salesTax)}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p>Distance included</p>
                <p className="text-sm text-gray-600">
                  Additional distance is charged by host tariff beyond this daily allowance.
                </p>
              </div>
              <span>{includedDistance} km</span>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-6">
          <h3 className="text-xl font-semibold text-gray-900">Promo code</h3>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter code"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-green-600 focus:outline-none"
            />
            <button
              type="button"
              className="rounded-xl border border-green-600 px-3 py-2 text-sm font-semibold text-green-600 hover:bg-green-50"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="mt-6 border-y border-gray-200 py-6">
          <div className="flex items-center justify-between">
            <p className="text-xl font-semibold text-gray-900">Trip total</p>
            <p className="text-xl font-semibold text-gray-900">{money(tripTotal)}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-700">
          Payment is made directly to the vehicle owner at pickup.
        </p>

        <div className="mt-4 flex items-center justify-between text-base text-gray-900">
          <p className="font-semibold">Deposit</p>
          <p className="font-semibold">{money(depositTotal)}</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-base font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
        >
          {submitting ? "Submitting..." : "Submit request"}
        </button>
      </div>
    </aside>
  );
}
