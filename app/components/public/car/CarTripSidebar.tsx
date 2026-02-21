import { useMemo, useState } from "react";
import Button from "~/components/public/Button";
import Toggle from "~/components/public/Toggle";
import DateRangePicker, { type DateRangeValue } from "~/components/public/DateRangePicker";
import {
  CalendarDaysIcon,
  ChatBubbleBottomCenterTextIcon,
  Cog6ToothIcon,
  HandThumbUpIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface CarTripSidebarProps {
  officeLocation: string;
  pricePerDay: number | null;
  minInsurancePrice: number | null;
  maxInsurancePrice: number | null;
  fullInsuranceMinPrice: number | null;
  fullInsuranceMaxPrice: number | null;
}

const money = (value: number) => `฿${Math.round(value).toLocaleString()}`;

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

export default function CarTripSidebar({
  officeLocation,
  pricePerDay,
  minInsurancePrice,
  maxInsurancePrice,
  fullInsuranceMinPrice,
  fullInsuranceMaxPrice,
}: CarTripSidebarProps) {
  const [trip, setTrip] = useState<DateRangeValue>(initialRange);
  const [withFullInsurance, setWithFullInsurance] = useState(false);

  const fullInsuranceAvailable = Boolean((fullInsuranceMinPrice || 0) > 0 || (fullInsuranceMaxPrice || 0) > 0);
  const fullInsuranceDaily = Number(fullInsuranceMinPrice || fullInsuranceMaxPrice || 0);
  const baseDaily = Number(pricePerDay || 0);

  const { days, baseTotal, insuranceTotal, finalTotal } = useMemo(() => {
    const start = new Date(`${trip.startDate}T${trip.startTime}:00`);
    const end = new Date(`${trip.endDate}T${trip.endTime}:00`);
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
          <p className="text-2xl font-semibold text-gray-800">{money(baseDaily)}</p>
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-3">
          <h3 className="text-3xl font-semibold text-gray-800">Your trip</h3>
          <DateRangePicker compact value={trip} onChange={setTrip} />
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-2xl font-semibold text-gray-800">Pickup & return location</h3>
              <p className="text-xl text-gray-800">{officeLocation}</p>
              <p className="text-base text-gray-500">About airport pickups</p>
            </div>
            <Button type="button" className="w-12 h-12 rounded-2xl border border-gray-300 text-gray-800 bg-white">
              <PencilSquareIcon className="w-6 h-6" />
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-3">
          <h3 className="text-2xl font-semibold text-gray-800">Insurance</h3>
          <div className="flex items-start gap-2">
            <ShieldCheckIcon className="w-6 h-6 mt-1 text-gray-800" />
            <div className="space-y-1">
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
          </div>

          {fullInsuranceAvailable ? (
            <div className="rounded-2xl border border-gray-200 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-gray-800">Full insurance</p>
                  <p className="text-sm text-gray-500">
                    {fullInsuranceMinPrice && fullInsuranceMaxPrice
                      ? `${money(Number(fullInsuranceMinPrice))} - ${money(Number(fullInsuranceMaxPrice))} / day`
                      : `${money(fullInsuranceDaily)} / day`}
                  </p>
                </div>
                <Toggle checked={withFullInsurance} onChange={setWithFullInsurance} label="Full insurance" />
              </div>
            </div>
          ) : null}
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
            <p className="text-2xl font-semibold text-gray-800">{money(finalTotal)}</p>
          </div>
          <p className="text-xs text-gray-500">Before taxes</p>
        </div>

        <Button
          type="button"
          className="w-full rounded-xl bg-indigo-600 text-white px-5 py-3 text-base font-medium hover:bg-indigo-700"
        >
          Continue
        </Button>

        <div className="pt-4 border-t border-gray-200 space-y-3">
          <h3 className="text-lg font-semibold text-gray-800">Cancellation policy</h3>
          <div className="flex items-start gap-2">
            <HandThumbUpIcon className="w-6 h-6 mt-1 text-gray-800" />
            <div>
              <p className="text-sm text-gray-800">Free cancellation</p>
              <p className="text-sm text-gray-500">Full refund within 24 hours of booking.</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <Button type="button" className="w-full rounded-xl border border-indigo-600 text-indigo-600 px-5 py-3 text-base font-medium bg-white hover:bg-indigo-50">
            Add to favorites
          </Button>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button type="button" className="w-12 h-12 rounded-full border border-indigo-600 text-indigo-600 bg-white hover:bg-indigo-50">
            <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
          </Button>
          <Button type="button" className="w-12 h-12 rounded-full border border-indigo-600 text-indigo-600 bg-white hover:bg-indigo-50">
            <Cog6ToothIcon className="w-5 h-5" />
          </Button>
          <Button type="button" className="w-12 h-12 rounded-full border border-indigo-600 text-indigo-600 bg-white hover:bg-indigo-50">
            <CalendarDaysIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
