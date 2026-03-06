import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import Button from "~/components/public/Button";
import DateRangePicker from "~/components/public/DateRangePicker";
import {
  ArrowRightIcon,
  ChatBubbleBottomCenterTextIcon,
  ChevronDownIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { calculateBaseTripTotal } from "~/lib/pricing";
import { isNonWorkingDateTime } from "~/lib/after-hours";

interface CarTripSidebarProps {
  carId: number;
  carPathSegment?: string;
  showPricePerDay?: boolean;
  pickupDistrict: string;
  returnDistricts: Array<{ id: number; name: string; isActive?: boolean; deliveryPrice?: number }>;
  initialReturnDistrictId?: number | null;
  pricePerDay: number | null;
  hostPhone?: string | null;
  hostEmail?: string | null;
  hostTelegram?: string | null;
  deliveryFeeAfterHours?: number | null;
  weeklySchedule?: string | null;
  holidays?: string | null;
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
  carPathSegment,
  showPricePerDay = true,
  pickupDistrict,
  returnDistricts,
  initialReturnDistrictId,
  pricePerDay,
  hostPhone,
  hostEmail,
  hostTelegram,
  deliveryFeeAfterHours,
  weeklySchedule,
  holidays,
}: CarTripSidebarProps) {
  const [trip, setTrip] = useState<DateRangeValue>(initialRange);
  const [isFavorite, setIsFavorite] = useState(false);
  const activeDistricts = returnDistricts.filter((d) => d.isActive);
  const districtOptions = activeDistricts.length ? activeDistricts : returnDistricts;
  const initialDistrictId = initialReturnDistrictId && districtOptions.some((d) => d.id === initialReturnDistrictId)
    ? initialReturnDistrictId
    : (districtOptions[0]?.id ?? 0);
  const [pickupDistrictId, setPickupDistrictId] = useState<number>(initialDistrictId);
  const [returnDistrictId, setReturnDistrictId] = useState<number>(initialDistrictId);

  const baseDaily = Number(pricePerDay || 0);
  const pickupDistrictLabel = districtOptions.find((d) => d.id === pickupDistrictId)?.name || pickupDistrict;
  const returnDistrictLabel = districtOptions.find((d) => d.id === returnDistrictId)?.name || pickupDistrict;
  const pickupFee = Number(districtOptions.find((d) => d.id === pickupDistrictId)?.deliveryPrice || 0);
  const returnFee = Number(districtOptions.find((d) => d.id === returnDistrictId)?.deliveryPrice || 0);
  const afterHoursFee = Number(deliveryFeeAfterHours || 0);
  const favoriteKey = `favorite-car:${carPathSegment || carId}`;
  const cleanTelegram = String(hostTelegram || "").trim().replace(/^@/, "");
  const chatHref = cleanTelegram
    ? `https://t.me/${cleanTelegram}`
    : hostPhone
      ? `tel:${hostPhone}`
      : `mailto:${hostEmail || "host+test@phuketride.com"}`;

  const { days, baseTotal, pickupAfterHoursFee, returnAfterHoursFee, finalTotal } = useMemo(() => {
    const start = parseDateTime(trip.startDate, trip.startTime);
    const end = parseDateTime(trip.endDate, trip.endTime);
    const { days: safeDays, total: base } = calculateBaseTripTotal(baseDaily, start, end);
    const pickupNonWorking = afterHoursFee > 0 && isNonWorkingDateTime({
      date: start,
      weeklyScheduleRaw: weeklySchedule,
      holidaysRaw: holidays,
    });
    const returnNonWorking = afterHoursFee > 0 && isNonWorkingDateTime({
      date: end,
      weeklyScheduleRaw: weeklySchedule,
      holidaysRaw: holidays,
    });
    const pickupExtra = pickupNonWorking ? afterHoursFee : 0;
    const returnExtra = returnNonWorking ? afterHoursFee : 0;

    return {
      days: safeDays,
      baseTotal: base,
      pickupAfterHoursFee: pickupExtra,
      returnAfterHoursFee: returnExtra,
      finalTotal: base + pickupFee + returnFee + pickupExtra + returnExtra,
    };
  }, [trip, baseDaily, pickupFee, returnFee, afterHoursFee, weeklySchedule, holidays]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(favoriteKey);
    setIsFavorite(stored === "1");
  }, [favoriteKey]);

  const toggleFavorite = () => {
    const next = !isFavorite;
    setIsFavorite(next);
    if (typeof window === "undefined") return;
    if (next) {
      window.localStorage.setItem(favoriteKey, "1");
    } else {
      window.localStorage.removeItem(favoriteKey);
    }
  };

  const checkoutSearch = new URLSearchParams({
    pickupDistrictId: String(pickupDistrictId),
    returnDistrictId: String(returnDistrictId),
    startDate: trip.startDate,
    endDate: trip.endDate,
    startTime: trip.startTime,
    endTime: trip.endTime,
  }).toString();

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
                value={pickupDistrictId}
                onChange={(event) => setPickupDistrictId(Number(event.target.value))}
                className="w-full appearance-none  rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:border-green-600 focus:outline-none"
              >
                {districtOptions.map((district) => (
                  <option key={`pickup-${district.id}`} value={district.id}>{district.name}</option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
            </div>
            <p className="mt-2 text-sm text-gray-500">Return district</p>
            <div className="relative mt-1">
              <select
                value={returnDistrictId}
                onChange={(event) => setReturnDistrictId(Number(event.target.value))}
                className="w-full appearance-none  rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:border-green-600 focus:outline-none"
              >
                {districtOptions.map((district) => (
                  <option key={district.id} value={district.id}>{district.name}</option>
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
          {pickupFee > 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Pickup ({pickupDistrictLabel})</p>
              <p className="text-base text-gray-800">{money(pickupFee)}</p>
            </div>
          ) : null}
          {returnFee > 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Return ({returnDistrictLabel})</p>
              <p className="text-base text-gray-800">{money(returnFee)}</p>
            </div>
          ) : null}
          {afterHoursFee > 0 && pickupAfterHoursFee > 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Pickup after-hours extra</p>
              <p className="text-base text-gray-800">{money(pickupAfterHoursFee)}</p>
            </div>
          ) : null}
          {afterHoursFee > 0 && returnAfterHoursFee > 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Return after-hours extra</p>
              <p className="text-base text-gray-800">{money(returnAfterHoursFee)}</p>
            </div>
          ) : null}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <p className="text-xl font-semibold text-gray-800">Total</p>
            <p className="text-xl font-semibold text-gray-800">{money(finalTotal)}</p>
          </div>
          <p className="text-xs text-gray-500">Before taxes</p>
        </div>

        <Link
          to={`/cars/${carPathSegment || carId}/checkout?${checkoutSearch}`}
          className="w-full inline-flex items-center justify-center rounded-xl bg-green-600 text-white px-5 py-3 text-base font-medium hover:bg-green-700 gap-2"
        >
          Continue
          <ArrowRightIcon className="w-5 h-5" />
        </Link>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <Button type="button" onClick={toggleFavorite} className="flex-1 inline-flex items-center justify-center rounded-xl border border-green-600 text-green-600 px-5 py-3 text-base font-medium bg-white hover:bg-green-50 gap-2">
              {isFavorite ? <HeartSolidIcon className="w-5 h-5" /> : <HeartIcon className="w-5 h-5" />}
              Favorites
            </Button>
            <a
              href={chatHref}
              target={chatHref.startsWith("http") ? "_blank" : undefined}
              rel={chatHref.startsWith("http") ? "noreferrer" : undefined}
              className="flex-1 inline-flex items-center justify-center rounded-xl border border-green-600 text-green-600 px-5 py-3 text-base font-medium bg-white hover:bg-green-50 gap-2"
            >
              <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
              Chat
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
