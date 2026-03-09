import type { Dispatch, SetStateAction } from "react";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { Link } from "react-router";
import AuthTextInput from "~/components/public/AuthTextInput";
import PublicSwitch from "~/components/public/PublicSwitch";

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
            className="inline-flex h-10 items-center justify-center rounded-xl border border-green-600 px-5 text-base font-semibold text-green-600"
          >
            Log in
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <AuthTextInput
            id="clientPhone"
            label="Mobile number"
            name="clientPhone"
            placeholder="Mobile number"
            required
            defaultValue=""
            inputClassName="text-base text-gray-700 focus:border-green-600 focus:ring-green-600"
          />
          <AuthTextInput
            id="clientEmail"
            label="Email"
            type="email"
            name="clientEmail"
            placeholder="Email"
            defaultValue=""
            inputClassName="text-base text-gray-700 focus:border-green-600 focus:ring-green-600"
          />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <AuthTextInput
            id="clientName"
            label="First name on driver’s license"
            name="clientName"
            required
            defaultValue=""
            inputClassName="text-base text-gray-700 focus:border-green-600 focus:ring-green-600"
          />
          <AuthTextInput
            id="clientSurname"
            label="Last name on driver’s license"
            name="clientSurname"
            required
            defaultValue=""
            inputClassName="text-base text-gray-700 focus:border-green-600 focus:ring-green-600"
          />
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
              <PublicSwitch checked={withFullInsurance} onChange={() => setWithFullInsurance((v) => !v)} />
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
            <PublicSwitch checked={withUnlimitedTrips} onChange={() => setWithUnlimitedTrips((v) => !v)} />
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
            <PublicSwitch
              checked={withBabySeat && hasBabySeatOption}
              onChange={() => hasBabySeatOption && setWithBabySeat((v) => !v)}
              disabled={!hasBabySeatOption}
            />
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
            <PublicSwitch
              checked={withIslandTrip && hasIslandTripOption}
              onChange={() => hasIslandTripOption && setWithIslandTrip((v) => !v)}
              disabled={!hasIslandTripOption}
            />
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
            <PublicSwitch
              checked={withKrabiTrip && hasKrabiTripOption}
              onChange={() => hasKrabiTripOption && setWithKrabiTrip((v) => !v)}
              disabled={!hasKrabiTripOption}
            />
          </div>
        </div>
      </section>

      <div className="pt-1">
        <Link
          to={`/cars/${data.carPathSegment}`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 text-base font-medium text-white hover:bg-green-700"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          Back
        </Link>
      </div>
    </div>
  );
}
