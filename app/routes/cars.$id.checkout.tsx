import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/cars.$id.checkout";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  InformationCircleIcon,
  LockClosedIcon,
  MapPinIcon,
  PlusCircleIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

const textInputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-700 placeholder:text-gray-400 focus:border-indigo-600 focus:outline-none";

const selectClass =
  "w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-700 focus:border-indigo-600 focus:outline-none";
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

export async function loader({ context, params }: Route.LoaderArgs) {
  const d1 = context.cloudflare.env.DB;
  const carId = Number(params.id);

  if (!Number.isFinite(carId) || carId <= 0) {
    throw new Response("Invalid car id", { status: 400 });
  }

  const row = await d1
    .prepare(
      `
      SELECT
        cc.id AS id,
        cb.name AS brandName,
        cm.name AS modelName,
        cc.year AS year,
        cc.min_insurance_price AS minInsurancePrice,
        cc.max_insurance_price AS maxInsurancePrice,
        cc.deposit AS deposit,
        cc.full_insurance_min_price AS fullInsuranceMinPrice,
        cc.full_insurance_max_price AS fullInsuranceMaxPrice,
        cc.photos AS photos,
        c.name AS companyName,
        l.name AS locationName,
        d.name AS districtName,
        (SELECT count(*) FROM contracts ctr WHERE ctr.company_car_id = cc.id) AS trips,
        (SELECT total_rating FROM car_rating_metrics m WHERE m.company_car_id = cc.id LIMIT 1) AS totalRating
      FROM company_cars cc
      LEFT JOIN car_templates ct ON cc.template_id = ct.id
      LEFT JOIN car_brands cb ON ct.brand_id = cb.id
      LEFT JOIN car_models cm ON ct.model_id = cm.id
      INNER JOIN companies c ON cc.company_id = c.id
      LEFT JOIN locations l ON c.location_id = l.id
      LEFT JOIN districts d ON c.district_id = d.id
      WHERE cc.id = ?
        AND cc.archived_at IS NULL
        AND c.archived_at IS NULL
      LIMIT 1
      `,
    )
    .bind(carId)
    .all();

  const result = (row.results ?? []) as Array<Record<string, unknown>>;
  if (!result.length) {
    throw new Response("Car not found", { status: 404 });
  }

  const car = result[0];

  let photoUrl = "/images/hero-bg.webp";
  if (typeof car.photos === "string" && car.photos) {
    try {
      const parsed = JSON.parse(car.photos);
      const first = Array.isArray(parsed) ? parsed.find((item) => typeof item === "string" && item) : null;
      if (typeof first === "string") {
        photoUrl = first;
      }
    } catch {
      photoUrl = "/images/hero-bg.webp";
    }
  }

  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() + 5);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 3);

  return {
    carId,
    carName: `${String(car.brandName || "Car")} ${String(car.modelName || `#${carId}`)}`,
    year: Number(car.year || 0) || 2015,
    rating: Number(car.totalRating || 5).toFixed(1),
    trips: Number(car.trips || 1),
    photoUrl,
    address: String(car.districtName || car.locationName || car.companyName || "Atlanta, GA 30315"),
    minInsurancePrice: car.minInsurancePrice ? Number(car.minInsurancePrice) : null,
    maxInsurancePrice: car.maxInsurancePrice ? Number(car.maxInsurancePrice) : null,
    deposit: Number(car.deposit || 0),
    fullInsuranceMinPrice: car.fullInsuranceMinPrice ? Number(car.fullInsuranceMinPrice) : null,
    fullInsuranceMaxPrice: car.fullInsuranceMaxPrice ? Number(car.fullInsuranceMaxPrice) : null,
    pickupAt: start.getTime(),
    returnAt: end.getTime(),
    subtotal: 186.7,
    salesTax: 16.62,
    includedDistance: 750,
    tripTotal: 203.32,
  };
}

function SummaryCard({
  carName,
  photoUrl,
  year,
  rating,
  trips,
  pickupAt,
  returnAt,
  address,
  subtotal,
  salesTax,
  includedDistance,
  tripTotal,
}: {
  carName: string;
  photoUrl: string;
  year: number;
  rating: string;
  trips: number;
  pickupAt: number;
  returnAt: number;
  address: string;
  subtotal: number;
  salesTax: number;
  includedDistance: number;
  tripTotal: number;
}) {
  return (
    <aside className="rounded-2xl border border-gray-200 bg-white p-5 lg:sticky lg:top-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{carName}</h2>
          <p className="mt-1 text-base text-gray-800">
            {year} · {rating}
            <span className="text-indigo-600">★</span> ({trips} trip)
          </p>
        </div>
        <img src={photoUrl} alt={carName} className="h-20 w-40 rounded-md object-cover" />
      </div>

      <div className="mt-6 space-y-2 text-base text-gray-800">
        <div className="flex items-start gap-3">
          <CalendarDaysIcon className="mt-0.5 h-6 w-6 text-gray-800" />
          <div>
            <p>{formatTripDate(pickupAt)}</p>
            <p>{formatTripDate(returnAt)}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPinIcon className="mt-0.5 h-6 w-6 text-gray-800" />
          <p>{address}</p>
        </div>
      </div>

      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="space-y-4 text-base">
          <div className="flex items-center justify-between">
            <button type="button" className="underline decoration-1 underline-offset-2">
              Subtotal
            </button>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <button type="button" className="underline decoration-1 underline-offset-2">
              Sales tax
            </button>
            <span>${salesTax.toFixed(2)}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p>Distance included</p>
              <p className="text-sm text-gray-600">
                $0.27 / mile fee will be charged for miles driven over this allotment.
              </p>
            </div>
            <span>{includedDistance} miles</span>
          </div>
        </div>
      </div>

      <div className="mt-6 border-y border-gray-200 py-6">
        <div className="flex items-center justify-between">
          <p className="text-xl font-semibold text-gray-900">Trip total</p>
          <p className="text-xl font-semibold text-gray-900">${tripTotal.toFixed(2)}</p>
        </div>
      </div>

      <button type="button" className="mt-6 text-base underline decoration-1 underline-offset-2">
        Promo code
      </button>
    </aside>
  );
}

export default function CheckoutPage() {
  const data = useLoaderData<typeof loader>();
  const [bookingRate, setBookingRate] = useState("non-refundable");
  const [payWhen, setPayWhen] = useState("pay-now");
  const [withFullInsurance, setWithFullInsurance] = useState(false);
  const fullInsuranceDaily = Number(data.fullInsuranceMinPrice || data.fullInsuranceMaxPrice || 0);
  const hasFullInsurance = fullInsuranceDaily > 0;
  const effectiveDeposit = withFullInsurance ? 0 : Number(data.deposit || 0);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <h1 className="text-xl font-semibold text-gray-800">Checkout</h1>

            <div className="mt-6 space-y-6">
              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">Primary driver</h2>
                  <button
                    type="button"
                    className="rounded-xl border border-gray-300 px-5 py-2 text-base font-semibold text-gray-700"
                  >
                    Log in
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_2fr]">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">Country</span>
                    <div className="relative">
                      <select className={selectClass} defaultValue="US +1">
                        <option>US +1</option>
                        <option>TH +66</option>
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">Mobile number</span>
                    <input className={textInputClass} placeholder="Mobile number" />
                  </label>
                </div>

                <p className="mt-4 max-w-2xl text-base leading-7 text-gray-800">
                  By providing a phone number, you consent to receive automated text messages with trip or account
                  updates.
                </p>

                <div className="mt-6">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">Email</span>
                    <input className={textInputClass} placeholder="Email" />
                  </label>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">First name on driver’s license</span>
                    <input className={textInputClass} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">Last name on driver’s license</span>
                    <input className={textInputClass} />
                  </label>
                </div>

                <p className="mt-3 text-base text-gray-600">You can add a preferred name through your Account later.</p>

                <div className="mt-6">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">Age</span>
                    <div className="relative">
                      <select className={selectClass} defaultValue="">
                        <option value="" disabled>
                          Select your age
                        </option>
                        <option>18-24</option>
                        <option>25-34</option>
                        <option>35-44</option>
                        <option>45+</option>
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
                    </div>
                  </label>
                </div>

                <div className="mt-6 flex gap-4 rounded-xl bg-sky-100 px-5 py-4">
                  <InformationCircleIcon className="h-6 w-6 shrink-0 text-blue-600" />
                  <p className="text-base leading-7 text-gray-800">
                    After booking, you’ll need to submit more information to avoid cancellation and fees.
                  </p>
                </div>

                <p className="mt-6 text-base leading-8 text-gray-900">
                  You can add additional drivers to your trip for free after booking.
                </p>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-gray-800">Protection</h2>
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-6 py-5">
                  <div className="space-y-3">
                    <div className={`space-y-1 ${hasFullInsurance ? "border-b border-gray-200 pb-3" : ""}`}>
                      <p className="text-base text-gray-800">Basic protection included</p>
                      <p className="text-sm text-gray-500">Damage coverage, theft protection and roadside support.</p>
                      {(data.minInsurancePrice || data.maxInsurancePrice) ? (
                        <p className="text-sm text-gray-500">
                          Standard insurance: {data.minInsurancePrice && data.maxInsurancePrice
                            ? `${money(Number(data.minInsurancePrice))} - ${money(Number(data.maxInsurancePrice))} / day`
                            : money(Number(data.minInsurancePrice || data.maxInsurancePrice || 0))}
                        </p>
                      ) : null}
                    </div>

                    {hasFullInsurance ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-xl font-semibold text-gray-800">Full insurance</h4>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={withFullInsurance}
                            onClick={() => setWithFullInsurance((v) => !v)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${withFullInsurance ? "bg-indigo-600" : "bg-gray-300"}`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${withFullInsurance ? "translate-x-5" : "translate-x-0.5"}`}
                            />
                          </button>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total: {money(fullInsuranceDaily)} / day</p>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">No deposit</p>
                            <p className={`text-sm ${withFullInsurance ? "text-gray-800" : "text-gray-500"}`}>No security deposit is required with full insurance, so you pay only the rental and selected add-ons.</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">Free Krabi trip</p>
                            <p className={`text-sm ${withFullInsurance ? "text-gray-800" : "text-gray-500"}`}>Krabi trip surcharge is fully waived, including route approval for standard travel conditions.</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">Unlimited mileage</p>
                            <p className={`text-sm ${withFullInsurance ? "text-gray-800" : "text-gray-500"}`}>Drive without daily mileage caps, ideal for long day trips and multi-stop routes.</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">Priority 24/7 support</p>
                            <p className={`text-sm ${withFullInsurance ? "text-gray-800" : "text-gray-500"}`}>Your requests are handled first by support, with faster response for incidents and travel changes.</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">Extended damage protection</p>
                            <p className={`text-sm ${withFullInsurance ? "text-gray-800" : "text-gray-500"}`}>Higher coverage limits reduce your financial responsibility for accidental exterior and body damage.</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">Roadside assistance included</p>
                            <p className={`text-sm ${withFullInsurance ? "text-gray-800" : "text-gray-500"}`}>24/7 roadside help is included for common issues such as battery, tire, and lockout incidents.</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">Faster replacement process</p>
                            <p className={`text-sm ${withFullInsurance ? "text-gray-800" : "text-gray-500"}`}>If the car becomes unavailable after a covered incident, replacement handling is prioritized.</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">Reduced paperwork</p>
                            <p className={`text-sm ${withFullInsurance ? "text-gray-800" : "text-gray-500"}`}>Claim and incident processing is simplified with fewer steps and pre-filled support data.</p>
                          </div>
                        </div>
                        <div className="pt-2">
                          <p className="text-sm font-semibold text-gray-800">Free cancellation</p>
                          <p className="text-sm text-gray-500">Full refund within 24 hours of booking.</p>
                        </div>
                      </div>
                    ) : null}

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-gray-800">Deposit</h3>
                        <p className="text-base font-semibold text-gray-800">{money(effectiveDeposit)}</p>
                      </div>
                      <p className="text-sm text-gray-500">
                        {withFullInsurance ? "With full insurance, deposit is not required." : "Refundable security deposit paid at pickup."}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-gray-800">Extras</h2>
                <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-5">
                  <div className="flex items-start gap-4">
                    <PlusCircleIcon className="h-7 w-7 text-gray-700" />
                    <div>
                      <p className="text-base font-semibold text-gray-900">Extras</p>
                      <p className="text-base text-gray-800">Choose: Child safety seat, Cooler, Unlimited mileage</p>
                    </div>
                  </div>
                  <button type="button" className="text-base font-semibold text-indigo-600">
                    Add
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-gray-800">Booking rate</h2>
                <div className="mt-6 rounded-2xl border border-gray-200 bg-[#ececef] px-6 py-5">
                  <label className="flex cursor-pointer items-start gap-4">
                    <input
                      type="radio"
                      name="booking-rate"
                      className="mt-1 h-5 w-5 accent-gray-700"
                      checked={bookingRate === "non-refundable"}
                      onChange={() => setBookingRate("non-refundable")}
                    />
                    <div className="w-full">
                      <div className="flex items-center justify-between">
                        <p className="text-lg text-gray-900">Non-refundable</p>
                        <p className="text-lg font-semibold text-gray-900">$203.32</p>
                      </div>
                      <p className="mt-2 text-base text-gray-700">
                        Cancel for free for 24 hours. After that, the trip is non-refundable.
                      </p>
                      <div className="mt-2 flex items-center justify-between text-base">
                        <p className="flex items-center gap-2 text-emerald-700">
                          <TagIcon className="h-5 w-5" />
                          Save $22, limited-time offer
                        </p>
                        <button type="button" className="underline decoration-1 underline-offset-2">
                          Learn more
                        </button>
                      </div>
                    </div>
                  </label>

                  <div className="my-5 border-t border-gray-200" />

                  <label className="flex cursor-pointer items-start gap-4">
                    <input
                      type="radio"
                      name="booking-rate"
                      className="mt-1 h-5 w-5 accent-gray-700"
                      checked={bookingRate === "refundable"}
                      onChange={() => setBookingRate("refundable")}
                    />
                    <div className="w-full">
                      <div className="flex items-center justify-between">
                        <p className="text-lg text-gray-900">Refundable</p>
                        <p className="text-lg font-semibold text-gray-900">$225.32</p>
                      </div>
                      <p className="mt-2 text-base text-gray-700">
                        Cancel for free before Mar 26. Flexible payment options available, with $0 due now.
                      </p>
                    </div>
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-gray-800">Choose when to pay</h2>
                <div className="mt-6 rounded-2xl border border-gray-200 bg-[#ececef] px-6 py-5">
                  <label className="flex cursor-pointer items-start gap-4">
                    <input
                      type="radio"
                      name="pay-when"
                      className="mt-1 h-5 w-5 accent-gray-700"
                      checked={payWhen === "pay-now"}
                      onChange={() => setPayWhen("pay-now")}
                    />
                    <p className="text-lg text-gray-900">Pay now</p>
                  </label>

                  <div className="my-5 border-t border-gray-200" />

                  <label className="flex cursor-pointer items-start gap-4">
                    <input
                      type="radio"
                      name="pay-when"
                      className="mt-1 h-5 w-5 accent-gray-700"
                      checked={payWhen === "pay-over-time"}
                      onChange={() => setPayWhen("pay-over-time")}
                    />
                    <div>
                      <p className="text-lg text-gray-900">Pay over time</p>
                      <p className="text-base text-gray-700">You’ll choose a payment provider before you book your trip.</p>
                    </div>
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-gray-800">Payment method</h2>
                <p className="mt-4 flex items-center gap-2 text-base text-gray-900">
                  <LockClosedIcon className="h-5 w-5" />
                  Your information will be stored securely.
                </p>

                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">Card number</span>
                    <div className="relative">
                      <input className={`${textInputClass} pr-56`} placeholder="1234 1234 1234 1234" />
                      <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 gap-2">
                        <span className="rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white">VISA</span>
                        <span className="rounded bg-orange-500 px-2 py-1 text-xs font-semibold text-white">MC</span>
                        <span className="rounded bg-cyan-600 px-2 py-1 text-xs font-semibold text-white">AMEX</span>
                        <span className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">JCB</span>
                      </div>
                    </div>
                  </label>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-gray-900">Expiration date</span>
                      <input className={textInputClass} placeholder="MM / YY" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-gray-900">Security code</span>
                      <input className={textInputClass} placeholder="CVC" />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">Country</span>
                    <div className="relative">
                      <select className={selectClass} defaultValue="Thailand">
                        <option>Thailand</option>
                        <option>United States</option>
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
                    </div>
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-gray-800">Agreements</h2>
                <label className="mt-4 flex items-start gap-3 text-base text-gray-900">
                  <input type="checkbox" className="mt-1 h-5 w-5 rounded border-gray-400" />
                  <span>Send me promotions and announcements via email</span>
                </label>

                <label className="mt-6 flex items-start gap-3 text-base text-gray-900">
                  <input type="checkbox" className="mt-1 h-5 w-5 rounded border-gray-400" />
                  <span>
                    I agree to pay the total shown and to the <button type="button" className="text-indigo-600 underline">Turo terms of service</button>,
                    <button type="button" className="text-indigo-600 underline"> cancellation policy</button> and I acknowledge the <button type="button" className="text-indigo-600 underline">privacy policy</button>
                  </span>
                </label>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-semibold text-gray-800">Complete booking</h2>
                <button
                  type="button"
                  className="mt-4 w-full rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white hover:bg-indigo-700"
                >
                  Book trip
                </button>

                <div className="mt-5">
                  <Link
                    to={`/cars/${data.carId}`}
                    className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                  >
                    <span>←</span>
                    Back to car page
                  </Link>
                </div>
              </section>
            </div>
          </section>

        <SummaryCard
          carName={data.carName}
          photoUrl={data.photoUrl}
          year={data.year}
          rating={data.rating}
          trips={data.trips}
          pickupAt={data.pickupAt}
          returnAt={data.returnAt}
          address={data.address}
          subtotal={data.subtotal}
          salesTax={data.salesTax}
          includedDistance={data.includedDistance}
          tripTotal={data.tripTotal}
        />
      </div>
      </main>
      <Footer />
    </div>
  );
}
