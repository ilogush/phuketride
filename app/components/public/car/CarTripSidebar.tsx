import { useMemo, useState } from "react";
import Button from "~/components/public/Button";
import Toggle from "~/components/public/Toggle";
import DateRangePicker from "~/components/public/DateRangePicker";
import {
  ArrowRightIcon,
  ChatBubbleBottomCenterTextIcon,
  ChevronDownIcon,
  ClockIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

interface CarTripSidebarProps {
  pickupDistrict: string;
  returnDistricts: string[];
  initialReturnDistrict?: string | null;
  pricePerDay: number | null;
  deposit: number | null;
  minInsurancePrice: number | null;
  maxInsurancePrice: number | null;
  fullInsuranceMinPrice: number | null;
  fullInsuranceMaxPrice: number | null;
}

const money = (value: number) => `฿${Math.round(value).toLocaleString()}`;
const pad = (value: number) => String(value).padStart(2, "0");

interface DateRangeValue {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

const initialRange = (): DateRangeValue => {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + 3);

  const toDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return {
    startDate: toDate(now),
    endDate: toDate(end),
    startTime: "10:00",
    endTime: "10:00",
  };
};

const parseDateTime = (date: string, time: string) => new Date(`${date}T${time}:00`);
const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? 0 : 30;
  const value = `${pad(hour)}:${pad(minute)}`;
  const date = new Date(2026, 0, 1, hour, minute, 0, 0);
  const label = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return { value, label };
});

export default function CarTripSidebar({
  pickupDistrict,
  returnDistricts,
  initialReturnDistrict,
  pricePerDay,
  deposit,
  minInsurancePrice,
  maxInsurancePrice,
  fullInsuranceMinPrice,
  fullInsuranceMaxPrice,
}: CarTripSidebarProps) {
  const [trip, setTrip] = useState<DateRangeValue>(initialRange);
  const [withFullInsurance, setWithFullInsurance] = useState(false);
  const [pickupDistrictValue, setPickupDistrictValue] = useState<string>(pickupDistrict);
  const [returnDistrict, setReturnDistrict] = useState<string>(initialReturnDistrict || returnDistricts[0] || pickupDistrict);

  const fullInsuranceAvailable = Boolean((fullInsuranceMinPrice || 0) > 0 || (fullInsuranceMaxPrice || 0) > 0);
  const fullInsuranceDaily = Number(fullInsuranceMinPrice || fullInsuranceMaxPrice || 0);
  const baseDaily = Number(pricePerDay || 0);
  const effectiveDeposit = withFullInsurance ? 0 : Number(deposit || 0);
  const locationOptions = Array.from(new Set([pickupDistrict, ...returnDistricts].filter((district): district is string => Boolean(district))));

  const { days, baseTotal, insuranceTotal, finalTotal } = useMemo(() => {
    const start = parseDateTime(trip.startDate, trip.startTime);
    const end = parseDateTime(trip.endDate, trip.endTime);
    const diffMs = end.getTime() - start.getTime();
    const rawDays = Number.isFinite(diffMs) ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 1;
    const safeDays = Math.max(1, rawDays);

    const base = safeDays * baseDaily;
    const insurance = withFullInsurance && fullInsuranceAvailable ? safeDays * fullInsuranceDaily : 0;

    return {
      days: safeDays,
      baseTotal: base,
      insuranceTotal: insurance,
      finalTotal: base + insurance,
    };
  }, [trip, baseDaily, withFullInsurance, fullInsuranceAvailable, fullInsuranceDaily]);

  return (
    <aside className="lg:col-span-1">
      <div className="sticky top-4 rounded-2xl border border-gray-200 p-5 space-y-5">
        <div>
          <p className="text-sm text-gray-500">Price per day</p>
          <p className="text-xl font-semibold text-gray-800">{money(baseDaily)}</p>
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-3">
          <h3 className="text-xl font-semibold text-gray-800">Your trip</h3>
          <DateRangePicker
            compact
            value={trip}
            onChange={setTrip}
            compactStartLabel="Trip start"
            compactEndLabel="Trip end"
            compactLabelClassName="text-sm text-gray-500"
            compactDateBorder
            compactCalendarIconClassName="h-5 w-5"
            compactShowChevron
          />
          <div className="grid grid-cols-2 text-left">
            <div className="pr-2">
              <p className="mb-1 text-sm text-gray-500">Start time</p>
              <div className="relative">
                <select
                  value={trip.startTime}
                  onChange={(event) => setTrip((prev) => ({ ...prev, startTime: event.target.value }))}
                  className="w-full appearance-none rounded-xl border border-gray-300 bg-white pl-10 pr-10 py-2 text-base text-gray-800 focus:border-indigo-600 focus:outline-none"
                >
                  {timeOptions.map((time) => (
                    <option key={`start-time-${time.value}`} value={time.value}>{time.label}</option>
                  ))}
                </select>
                <ClockIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
              </div>
            </div>
            <div className="pl-2">
              <p className="mb-1 text-sm text-gray-500">End time</p>
              <div className="relative">
                <select
                  value={trip.endTime}
                  onChange={(event) => setTrip((prev) => ({ ...prev, endTime: event.target.value }))}
                  className="w-full appearance-none rounded-xl border border-gray-300 bg-white pl-10 pr-10 py-2 text-base text-gray-800 focus:border-indigo-600 focus:outline-none"
                >
                  {timeOptions.map((time) => (
                    <option key={`end-time-${time.value}`} value={time.value}>{time.label}</option>
                  ))}
                </select>
                <ClockIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-2">
          <div>
              <h3 className="text-xl font-semibold text-gray-800">Pickup & return location</h3>
              <p className="text-sm text-gray-500">Pickup district</p>
              <div className="relative mt-1">
                <select
                  value={pickupDistrictValue}
                  onChange={(event) => setPickupDistrictValue(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:border-indigo-600 focus:outline-none"
                >
                  {locationOptions.map((district) => (
                    <option key={`pickup-${district}`} value={district}>{district}</option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
              </div>
              <p className="mt-2 text-sm text-gray-500">Return district</p>
              <div className="relative mt-1">
                <select
                  value={returnDistrict}
                  onChange={(event) => setReturnDistrict(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:border-indigo-600 focus:outline-none"
                >
                  {locationOptions.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
              </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-3">
          <h3 className="text-xl font-semibold text-gray-800">Insurance</h3>
          <div className={`space-y-1 ${fullInsuranceAvailable ? "border-b border-gray-200 pb-3" : ""}`}>
            <p className="text-base text-gray-800">Basic protection included</p>
            <p className="text-sm text-gray-500">Damage coverage, theft protection and roadside support.</p>
            {(minInsurancePrice || maxInsurancePrice) ? (
              <p className="text-sm text-gray-500">
                Standard insurance: {minInsurancePrice && maxInsurancePrice
                  ? `${money(Number(minInsurancePrice))} - ${money(Number(maxInsurancePrice))} / day`
                  : money(Number(minInsurancePrice || maxInsurancePrice || 0))}
              </p>
            ) : null}
          </div>

          {fullInsuranceAvailable ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-xl font-semibold text-gray-800">Full insurance</h4>
                <Toggle checked={withFullInsurance} onChange={setWithFullInsurance} label="Full insurance" size="sm" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total: ฿550 / day</p>
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
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-2">
          <h3 className="text-xl font-semibold text-gray-800">Deposit</h3>
          <p className="text-base text-gray-800">{money(effectiveDeposit)}</p>
          <p className="text-sm text-gray-500">
            {withFullInsurance ? "With full insurance, deposit is not required." : "Refundable security deposit paid at pickup."}
          </p>
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Trip ({days} days)</p>
            <p className="text-base text-gray-800">{money(baseTotal)}</p>
          </div>
          {withFullInsurance && fullInsuranceAvailable ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Full insurance</p>
              <p className="text-base text-gray-800">{money(insuranceTotal)}</p>
            </div>
          ) : null}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <p className="text-base font-semibold text-gray-800">Total</p>
            <p className="text-xl font-semibold text-gray-800">{money(finalTotal)}</p>
          </div>
          <p className="text-xs text-gray-500">Before taxes</p>
        </div>

        <Button
          type="button"
          className="w-full inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white px-5 py-3 text-base font-medium hover:bg-indigo-700 gap-2"
        >
          Continue
          <ArrowRightIcon className="w-5 h-5" />
        </Button>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <Button type="button" className="flex-1 inline-flex items-center justify-center rounded-xl border border-indigo-600 text-indigo-600 px-5 py-3 text-base font-medium bg-white hover:bg-indigo-50 gap-2">
              <HeartIcon className="w-5 h-5" />
              Favorites
            </Button>
            <Button type="button" className="flex-1 inline-flex items-center justify-center rounded-xl border border-indigo-600 text-indigo-600 px-5 py-3 text-base font-medium bg-white hover:bg-indigo-50 gap-2">
              <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
              Chat
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
