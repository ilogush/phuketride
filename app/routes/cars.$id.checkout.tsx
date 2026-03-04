import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/cars.$id.checkout";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";
import Breadcrumbs from "~/components/public/Breadcrumbs";
import {
  ChevronLeftIcon,
} from "@heroicons/react/24/solid";
import {
  CalendarDaysIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { buildCarPathSegment, parseCarPathSegment } from "~/lib/car-path";
import { normalizeAssetUrl } from "~/lib/asset-url";

const textInputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base text-gray-700 placeholder:text-gray-400 focus:border-green-600 focus:outline-none";
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

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const d1 = context.cloudflare.env.DB;
  const parsedPath = parseCarPathSegment(params.id);
  const url = new URL(request.url);
  const pickupDistrictId = Number(url.searchParams.get("pickupDistrictId") || 0);
  const returnDistrictId = Number(url.searchParams.get("returnDistrictId") || 0);

  if (!parsedPath) {
    throw new Response("Invalid car path", { status: 400 });
  }

  const row = await d1
    .prepare(
      `
      SELECT
        cc.id AS id,
        cc.license_plate AS licensePlate,
        c.id AS companyId,
        cb.name AS brandName,
        cm.name AS modelName,
        cc.year AS year,
        cc.price_per_day AS pricePerDay,
        cc.min_insurance_price AS minInsurancePrice,
        cc.max_insurance_price AS maxInsurancePrice,
        cc.deposit AS deposit,
        cc.full_insurance_min_price AS fullInsuranceMinPrice,
        cc.full_insurance_max_price AS fullInsuranceMaxPrice,
        cc.photos AS photos,
        c.name AS companyName,
        c.district_id AS companyDistrictId,
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
      WHERE cc.archived_at IS NULL
        AND c.archived_at IS NULL
        AND (
          LOWER(TRIM(COALESCE(cc.license_plate, ''))) = LOWER(TRIM(?))
          OR LOWER(COALESCE(cc.license_plate, '')) LIKE '%' || LOWER(?) || '%'
        )
        AND (
          ? = ''
          OR LOWER(COALESCE(c.name, '')) LIKE LOWER(?) || '%'
        )
      LIMIT 20
      `,
    )
    .bind(
      parsedPath.plateTail,
      parsedPath.plateTail,
      parsedPath.companyHint,
      parsedPath.companyHint,
    )
    .all();

  const result = (row.results ?? []) as Array<Record<string, unknown>>;
  const car = result.find((item) => (
    buildCarPathSegment(
      String(item.companyName || ""),
      String(item.brandName || ""),
      String(item.modelName || ""),
      String(item.licensePlate || ""),
    ) === parsedPath.full
  ));
  if (!car) {
    throw new Response("Car not found", { status: 404 });
  }
  const carId = Number(car.id || 0);

  let photoUrl = "/images/hero-bg.webp";
  if (typeof car.photos === "string" && car.photos) {
    try {
      const parsed = JSON.parse(car.photos);
      const first = Array.isArray(parsed) ? parsed.find((item) => typeof item === "string" && item) : null;
      if (typeof first === "string") {
        photoUrl = normalizeAssetUrl(first, request.url);
      }
    } catch {
      photoUrl = "/images/hero-bg.webp";
    }
  }

  const companyId = Number(car.companyId || 0);
  const companyDistrictId = Number(car.companyDistrictId || 0);
  const districtSettings = companyId > 0
    ? await d1
        .prepare(
          `
          SELECT
            cds.district_id AS districtId,
            cds.is_active AS isActive,
            cds.delivery_price AS deliveryPrice,
            d.name AS districtName
          FROM company_delivery_settings cds
          JOIN districts d ON d.id = cds.district_id
          WHERE cds.company_id = ?
          `
        )
        .bind(companyId)
        .all()
    : { results: [] };
  const deliveryByDistrict = new Map<number, { isActive: boolean; deliveryPrice: number; districtName: string }>();
  for (const row of ((districtSettings.results ?? []) as Array<Record<string, unknown>>)) {
    const districtId = Number(row.districtId || 0);
    if (districtId <= 0) continue;
    deliveryByDistrict.set(districtId, {
      isActive: Boolean(row.isActive),
      deliveryPrice: Number(row.deliveryPrice || 0),
      districtName: String(row.districtName || ""),
    });
  }

  const defaultDistrictId = companyDistrictId > 0 ? companyDistrictId : 0;
  const resolvedPickupDistrictId = pickupDistrictId > 0 ? pickupDistrictId : defaultDistrictId;
  const resolvedReturnDistrictId = returnDistrictId > 0 ? returnDistrictId : resolvedPickupDistrictId;

  const pickupSetting = deliveryByDistrict.get(resolvedPickupDistrictId);
  const returnSetting = deliveryByDistrict.get(resolvedReturnDistrictId);
  const deliveryFee = pickupSetting?.isActive ? Number(pickupSetting.deliveryPrice || 0) : 0;
  const returnFee = returnSetting?.isActive ? Number(returnSetting.deliveryPrice || 0) : 0;

  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() + 5);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 3);

  const tripDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const baseTripCost = Number(car.pricePerDay || 0) * tripDays;
  const insuranceTotal = Number(car.minInsurancePrice || 0);
  const subtotal = baseTripCost + deliveryFee + returnFee + insuranceTotal;
  const salesTax = subtotal * 0.089;
  const tripTotal = subtotal + salesTax;

  return {
    carId,
    carPathSegment: buildCarPathSegment(
      String(car.companyName || ""),
      String(car.brandName || ""),
      String(car.modelName || ""),
      String(car.licensePlate || ""),
    ),
    carName: `${String(car.brandName || "Car")} ${String(car.modelName || "Model")} ${String(car.licensePlate || "").trim() || `#${carId}`}`,
    year: Number(car.year || 0) || 2015,
    rating: Number(car.totalRating || 5).toFixed(1),
    trips: Number(car.trips || 1),
    photoUrl,
    address: String(pickupSetting?.districtName || car.districtName || car.locationName || car.companyName || "Atlanta, GA 30315"),
    returnAddress: String(returnSetting?.districtName || pickupSetting?.districtName || car.districtName || car.locationName || car.companyName || "Atlanta, GA 30315"),
    minInsurancePrice: car.minInsurancePrice ? Number(car.minInsurancePrice) : null,
    maxInsurancePrice: car.maxInsurancePrice ? Number(car.maxInsurancePrice) : null,
    deposit: Number(car.deposit || 0),
    fullInsuranceMinPrice: car.fullInsuranceMinPrice ? Number(car.fullInsuranceMinPrice) : null,
    fullInsuranceMaxPrice: car.fullInsuranceMaxPrice ? Number(car.fullInsuranceMaxPrice) : null,
    pickupAt: start.getTime(),
    returnAt: end.getTime(),
    deliveryFee,
    returnFee,
    extrasTotal: 0,
    insuranceTotal,
    subtotal,
    salesTax,
    includedDistance: 750,
    tripTotal,
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
  returnAddress,
  deliveryFee,
  returnFee,
  extrasTotal,
  insuranceTotal,
  depositTotal,
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
  returnAddress: string;
  deliveryFee: number;
  returnFee: number;
  extrasTotal: number;
  insuranceTotal: number;
  depositTotal: number;
  subtotal: number;
  salesTax: number;
  includedDistance: number;
  tripTotal: number;
}) {
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
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Return fee</span>
              <span>${returnFee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Extras</span>
              <span>${extrasTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Insurance</span>
              <span>${insuranceTotal.toFixed(2)}</span>
            </div>
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
            <p className="text-xl font-semibold text-gray-900">${tripTotal.toFixed(2)}</p>
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
          type="button"
          className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-base font-semibold text-white hover:bg-green-700"
        >
          Submit request
        </button>
      </div>
    </aside>
  );
}

export default function CheckoutPage() {
  const data = useLoaderData<typeof loader>();
  const [withFullInsurance, setWithFullInsurance] = useState(false);
  const standardInsurance = Number(data.minInsurancePrice || data.maxInsurancePrice || 0);
  const fullInsurance = Number(data.fullInsuranceMinPrice || data.fullInsuranceMaxPrice || 0);
  const hasFullInsurance = fullInsurance > 0;
  const selectedInsurance = withFullInsurance && hasFullInsurance ? fullInsurance : standardInsurance;
  const effectiveDeposit = withFullInsurance && hasFullInsurance ? 0 : Number(data.deposit || 0);
  const breadcrumbs = [
    { label: "Home", to: "/" },
    { label: "Cars", to: "/cars" },
    { label: data.carName, to: `/cars/${data.carPathSegment}` },
    { label: "Checkout" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Breadcrumbs items={breadcrumbs} />
      <main className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="space-y-6">
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">Primary driver</h2>
                  <button
                    type="button"
                    className="rounded-xl border border-green-600 px-5 py-2 text-base font-semibold text-green-600"
                  >
                    Log in
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">Mobile number</span>
                    <input className={textInputClass} placeholder="Mobile number" />
                  </label>

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
              </section>

              <div className={`grid gap-4 ${hasFullInsurance ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
                <section className={`rounded-2xl border border-gray-200 p-4 ${!withFullInsurance ? "bg-green-100" : "bg-white"}`}>
                  <h2 className="text-xl font-semibold text-gray-800">Standard insurance</h2>
                  <p className="mt-1 text-sm text-gray-700">
                    {data.minInsurancePrice && data.maxInsurancePrice
                      ? `${money(data.minInsurancePrice)} - ${money(data.maxInsurancePrice)} / day`
                      : money(Number(data.minInsurancePrice || data.maxInsurancePrice || 0))}
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    <li>Damage and theft coverage</li>
                    <li>Roadside support assistance</li>
                    <li>Standard claim handling</li>
                    <li>Basic mileage terms</li>
                  </ul>
                </section>

                {hasFullInsurance ? (
                  <section className={`rounded-2xl border border-gray-200 p-4 ${withFullInsurance ? "bg-green-100" : "bg-white"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-xl font-semibold text-gray-800">Full insurance</h2>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={withFullInsurance}
                        onClick={() => setWithFullInsurance((v) => !v)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${withFullInsurance ? "bg-green-600" : "bg-gray-300"}`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${withFullInsurance ? "translate-x-5" : "translate-x-0.5"}`}
                        />
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">
                      {data.fullInsuranceMinPrice && data.fullInsuranceMaxPrice
                        ? `${money(data.fullInsuranceMinPrice)} - ${money(data.fullInsuranceMaxPrice)} / day`
                        : money(Number(data.fullInsuranceMinPrice || data.fullInsuranceMaxPrice || 0))}
                    </p>
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
            returnAddress={data.returnAddress}
            deliveryFee={data.deliveryFee}
            returnFee={data.returnFee}
            extrasTotal={data.extrasTotal}
            insuranceTotal={selectedInsurance}
            depositTotal={effectiveDeposit}
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
