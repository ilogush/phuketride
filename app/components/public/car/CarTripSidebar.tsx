import { useMemo, useState } from "react";
import { Link } from "react-router";
import Button from "~/components/public/Button";
import DateRangePicker from "~/components/public/DateRangePicker";
import {
  ArrowRightIcon,
  ChatBubbleBottomCenterTextIcon,
  ChevronDownIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

interface CarTripSidebarProps {
  carId: number;
  showPricePerDay?: boolean;
  pickupDistrict: string;
  returnDistricts: string[];
  initialReturnDistrict?: string | null;
  pricePerDay: number | null;
}

const money = (value: number) => `฿${Math.round(value).toLocaleString()}`;

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
export default function CarTripSidebar({
  carId,
  showPricePerDay = true,
  pickupDistrict,
  returnDistricts,
  initialReturnDistrict,
  pricePerDay,
}: CarTripSidebarProps) {
  const [trip, setTrip] = useState<DateRangeValue>(initialRange);
  const [pickupDistrictValue, setPickupDistrictValue] = useState<string>(pickupDistrict);
  const [returnDistrict, setReturnDistrict] = useState<string>(initialReturnDistrict || returnDistricts[0] || pickupDistrict);

  const baseDaily = Number(pricePerDay || 0);
  const locationOptions = Array.from(new Set([pickupDistrict, ...returnDistricts].filter((district): district is string => Boolean(district))));

  const { days, baseTotal, finalTotal } = useMemo(() => {
    const start = parseDateTime(trip.startDate, trip.startTime);
    const end = parseDateTime(trip.endDate, trip.endTime);
    const diffMs = end.getTime() - start.getTime();
    const rawDays = Number.isFinite(diffMs) ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 1;
    const safeDays = Math.max(1, rawDays);

    const base = safeDays * baseDaily;

    return {
      days: safeDays,
      baseTotal: base,
      finalTotal: base,
    };
  }, [trip, baseDaily]);

  return (
    <aside className="lg:col-span-1">
      <div className="sticky top-4 rounded-2xl border border-gray-200 p-4 space-y-5">
        {showPricePerDay ? (
          <div>
            <p className="text-sm text-gray-500">Price per day</p>
            <p className="text-xl font-semibold text-gray-800">{money(baseDaily)}</p>
          </div>
        ) : null}

        <div className={`${showPricePerDay ? "pt-4 border-t border-gray-200" : ""} space-y-3`}>
          <h3 className="text-xl font-semibold text-gray-800">Your trip</h3>
            <DateRangePicker
              compact
              value={trip}
              onChange={setTrip}
              compactStartLabel="Trip start"
              compactEndLabel="Trip end"
              compactLabelClassName="text-sm text-gray-500"
              compactDateBorder
              compactCalendarIconClassName="h-4 w-4"
              compactShowChevron
              compactShowTime
              compactVertical
            />
          </div>

        <div className="pt-4 border-t border-gray-200 space-y-2">
          <div>
              <h3 className="text-xl font-semibold text-gray-800">Pickup & return location</h3>
              <p className="text-sm text-gray-500">Pickup district</p>
              <div className="relative mt-1">
                <select
                  value={pickupDistrictValue}
                  onChange={(event) => setPickupDistrictValue(event.target.value)}
                  className="w-full appearance-none  rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:border-indigo-600 focus:outline-none"
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
                  className="w-full appearance-none  rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:border-indigo-600 focus:outline-none"
                >
                  {locationOptions.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
              </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Trip ({days} days)</p>
            <p className="text-base text-gray-800">{money(baseTotal)}</p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <p className="text-xl font-semibold text-gray-800">Total</p>
            <p className="text-xl font-semibold text-gray-800">{money(finalTotal)}</p>
          </div>
          <p className="text-xs text-gray-500">Before taxes</p>
        </div>

        <Link
          to={`/cars/${carId}/checkout`}
          className="w-full inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white px-5 py-3 text-base font-medium hover:bg-indigo-700 gap-2"
        >
          Continue
          <ArrowRightIcon className="w-5 h-5" />
        </Link>

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
