import type { Dispatch, SetStateAction } from "react";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { Link } from "react-router";

const textInputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base text-gray-700 placeholder:text-gray-400 focus:border-green-600 focus:outline-none";

const money = (value: number) => `฿${Math.round(value).toLocaleString()}`;

type CheckoutViewData = {
  effectiveRentalDays: number;
  tripDays: number;
  babySeatPricePerDay: number;
  islandTripPrice: number;
  krabiTripPrice: number;
  carPathSegment: string;
};

type Props = {
  data: CheckoutViewData;
  hasFullInsurance: boolean;
  fullInsurance: number;
  withFullInsurance: boolean;
  setWithFullInsurance: Dispatch<SetStateAction<boolean>>;
  bookingRate: "non_refundable" | "refundable";
  setBookingRate: Dispatch<SetStateAction<"non_refundable" | "refundable">>;
  refundableSavings: number;
  nonRefundableDisplayedTotal: number;
  refundableDisplayedTotal: number;
  hasBabySeatOption: boolean;
  hasIslandTripOption: boolean;
  hasKrabiTripOption: boolean;
  withUnlimitedTrips: boolean;
  setWithUnlimitedTrips: Dispatch<SetStateAction<boolean>>;
  withBabySeat: boolean;
  setWithBabySeat: Dispatch<SetStateAction<boolean>>;
  withIslandTrip: boolean;
  setWithIslandTrip: Dispatch<SetStateAction<boolean>>;
  withKrabiTrip: boolean;
  setWithKrabiTrip: Dispatch<SetStateAction<boolean>>;
};

export default function PublicCheckoutFormPanel({
  data,
  hasFullInsurance,
  fullInsurance,
  withFullInsurance,
  setWithFullInsurance,
  bookingRate,
  setBookingRate,
  refundableSavings,
  nonRefundableDisplayedTotal,
  refundableDisplayedTotal,
  hasBabySeatOption,
  hasIslandTripOption,
  hasKrabiTripOption,
  withUnlimitedTrips,
  setWithUnlimitedTrips,
  withBabySeat,
  setWithBabySeat,
  withIslandTrip,
  setWithIslandTrip,
  withKrabiTrip,
  setWithKrabiTrip,
}: Props) {
  return (
    <div className="space-y-6">
      <section className="p-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Primary driver</h2>
          <Link
            to="/register"
            className="rounded-xl border border-green-600 px-5 py-2 text-base font-semibold text-green-600"
          >
            Log in
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-900">Mobile number</span>
            <input name="clientPhone" className={textInputClass} placeholder="Mobile number" required defaultValue="" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-900">Email</span>
            <input type="email" name="clientEmail" className={textInputClass} placeholder="Email" defaultValue="" />
          </label>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-900">First name on driver’s license</span>
            <input name="clientName" className={textInputClass} required defaultValue="" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-900">Last name on driver’s license</span>
            <input name="clientSurname" className={textInputClass} required defaultValue="" />
          </label>
        </div>
      </section>

      <div className={`grid gap-4 ${hasFullInsurance ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
        <section className={`rounded-2xl p-4 ${withFullInsurance ? "bg-gray-50" : "bg-green-50"}`}>
          <h2 className="text-xl font-semibold text-gray-800">Standard insurance include</h2>
          {data.effectiveRentalDays > data.tripDays ? (
            <p className="mt-1 text-xs text-gray-600">
              Minimum rental policy: charged for {data.effectiveRentalDays} days.
            </p>
          ) : null}
          <ul className="mt-3 space-y-1 text-sm text-gray-600">
            <li>Damage and theft coverage</li>
            <li>Roadside support assistance</li>
            <li>Standard claim handling</li>
            <li>Basic mileage terms</li>
          </ul>
        </section>
        {hasFullInsurance ? (
          <section className={`rounded-2xl bg-gray-50 p-4 ${withFullInsurance ? "bg-green-50" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-gray-800">Full insurance</h2>
              <button
                type="button"
                role="switch"
                aria-checked={withFullInsurance}
                onClick={() => setWithFullInsurance((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${withFullInsurance ? "bg-green-600" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${withFullInsurance ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-700">{`${money(fullInsurance)} / day`}</p>
            <ul className="mt-3 space-y-1 text-sm text-gray-600">
              <li>Unlimited mileage for long trips</li>
              <li>No deposit while full coverage is active</li>
              <li>Priority support 24/7</li>
              <li>Extended damage protection limits</li>
              <li>Faster replacement process</li>
              <li>Simplified claim paperwork</li>
            </ul>
          </section>
        ) : null}
      </div>

      <section className="rounded-2xl bg-gray-100 p-4 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Booking rate</h2>
        <div className="space-y-4">
          <button type="button" onClick={() => setBookingRate("non_refundable")} className="w-full text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${bookingRate === "non_refundable" ? "border-gray-800 bg-gray-800" : "border-gray-500 bg-white"}`}>
                  {bookingRate === "non_refundable" ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                </span>
                <div>
                  <p className="text-base font-semibold text-gray-900">Non-refundable</p>
                  <p className="mt-1 text-sm text-gray-600">Cancel for free for 24 hours. After that, the trip is non-refundable.</p>
                  <p className="mt-2 text-sm font-medium text-green-700">Save {money(refundableSavings)} compared to refundable rate</p>
                </div>
              </div>
              <p className="text-xl font-semibold text-gray-900">{money(nonRefundableDisplayedTotal)}</p>
            </div>
          </button>

          <div className="my-1 border-t border-gray-300 mb-6" />

          <button type="button" onClick={() => setBookingRate("refundable")} className="w-full text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${bookingRate === "refundable" ? "border-gray-800 bg-gray-800" : "border-gray-500 bg-white"}`}>
                  {bookingRate === "refundable" ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                </span>
                <div>
                  <p className="text-base font-semibold text-gray-900">Refundable</p>
                  <p className="mt-1 text-sm text-gray-600">Flexible cancellation terms before pickup date and time.</p>
                  <p className="mt-2 text-sm text-gray-600">
                    With Refundable rate, rental funds are recalculated in case of early return based on the actual rental period under the applicable terms.
                  </p>
                </div>
              </div>
              <p className="text-xl font-semibold text-gray-900">{money(refundableDisplayedTotal)}</p>
            </div>
          </button>
        </div>
      </section>

      <section className="p-1 space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Extras</h2>
          <p className="mt-1 text-xs text-gray-600">
            Add optional services to match your route and passengers. Selected extras are reflected in the total immediately.
          </p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Unlimited trips</p>
              <p className="text-xs text-gray-600">Remove daily route restrictions for island travel plan changes.</p>
              <p className="text-xs text-green-700">Included for this listing</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={withUnlimitedTrips}
              onClick={() => setWithUnlimitedTrips((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${withUnlimitedTrips ? "bg-green-600" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${withUnlimitedTrips ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        <div className={`border-b border-gray-200 pb-4 ${hasBabySeatOption ? "" : "opacity-60"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Baby seat</p>
              <p className="text-xs text-gray-600">
                {hasBabySeatOption ? `${money(Number(data.babySeatPricePerDay || 0))} / day` : "Not available for this host right now"}
              </p>
              <p className="text-xs text-gray-600">Limited-stock item, confirmed with your booking request.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={withBabySeat && hasBabySeatOption}
              onClick={() => hasBabySeatOption && setWithBabySeat((v) => !v)}
              disabled={!hasBabySeatOption}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${withBabySeat && hasBabySeatOption ? "bg-green-600" : "bg-gray-300"} ${hasBabySeatOption ? "" : "cursor-not-allowed opacity-60"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${withBabySeat && hasBabySeatOption ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        <div className={`border-b border-gray-200 pb-4 ${hasIslandTripOption ? "" : "opacity-60"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Island trip</p>
              <p className="text-xs text-gray-600">
                {hasIslandTripOption ? `${money(Number(data.islandTripPrice || 0))} one-time` : "Not available for this host right now"}
              </p>
              <p className="text-xs text-gray-600">One-time add-on for trips to the islands of Koh Samui and Koh Phangan.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={withIslandTrip && hasIslandTripOption}
              onClick={() => hasIslandTripOption && setWithIslandTrip((v) => !v)}
              disabled={!hasIslandTripOption}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${withIslandTrip && hasIslandTripOption ? "bg-green-600" : "bg-gray-300"} ${hasIslandTripOption ? "" : "cursor-not-allowed opacity-60"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${withIslandTrip && hasIslandTripOption ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        <div className={`border-b border-gray-200 pb-4 ${hasKrabiTripOption ? "" : "opacity-60"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Krabi trip</p>
              <p className="text-xs text-gray-600">
                {hasKrabiTripOption ? `${money(Number(data.krabiTripPrice || 0))} one-time` : "Not available for this host right now"}
              </p>
              <p className="text-xs text-gray-600">One-time add-on for approved Krabi direction routes.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={withKrabiTrip && hasKrabiTripOption}
              onClick={() => hasKrabiTripOption && setWithKrabiTrip((v) => !v)}
              disabled={!hasKrabiTripOption}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${withKrabiTrip && hasKrabiTripOption ? "bg-green-600" : "bg-gray-300"} ${hasKrabiTripOption ? "" : "cursor-not-allowed opacity-60"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${withKrabiTrip && hasKrabiTripOption ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      </section>

      <div className="pt-1">
        <Link
          to={`/cars/${data.carPathSegment}`}
          className="inline-flex items-center justify-center rounded-xl bg-green-600 text-white px-5 py-3 text-base font-medium hover:bg-green-700 gap-2"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          Back
        </Link>
      </div>
    </div>
  );
}
