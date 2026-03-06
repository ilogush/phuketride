import { calculateSeasonalPrice, getAverageDays } from "~/lib/pricing";

interface SeasonMatrixItem {
  id: number;
  seasonName: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  priceMultiplier: number;
  discountLabel?: string | null;
}

interface DurationMatrixItem {
  id: number;
  rangeName: string;
  minDays: number;
  maxDays: number | null;
  priceMultiplier: number;
  discountLabel: string | null;
}

interface SeasonalPricingMatrixProps {
  pricePerDay: number;
  seasons: SeasonMatrixItem[];
  durations: DurationMatrixItem[];
}

export default function SeasonalPricingMatrix({ pricePerDay, seasons, durations }: SeasonalPricingMatrixProps) {
  return (
    <div className="overflow-hidden">
      <div className="border border-gray-200 rounded-3xl overflow-hidden bg-white">
        <div className="overflow-x-auto sm:mx-0">
          <table className="min-w-full divide-y divide-gray-100 bg-transparent">
            <thead>
              <tr className="bg-gray-50/50">
                <th scope="col" className="pl-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight">
                  <span>Season</span>
                </th>
                {durations.map((duration) => (
                  <th
                    key={duration.id}
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight hidden sm:table-cell"
                  >
                    <div className="flex flex-col leading-tight">
                      <span>{duration.rangeName.split(" ")[0]}</span>
                      <span className="text-[10px] lowercase text-gray-400 font-normal">
                        {duration.rangeName.split(" ").slice(1).join(" ")}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {seasons.map((season) => (
                <tr key={season.id} className="group hover:bg-white transition-all">
                  <td className="pl-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">{season.seasonName}</span>
                      <span className="text-xs text-gray-500 mt-0.5">
                        {String(season.startMonth).padStart(2, "0")}/{String(season.startDay).padStart(2, "0")} - {String(season.endMonth).padStart(2, "0")}/{String(season.endDay).padStart(2, "0")}
                      </span>
                      <span className="text-xs text-gray-500 mt-0.5">
                        {season.discountLabel || `${season.priceMultiplier > 1 ? "+" : ""}${Math.round((season.priceMultiplier - 1) * 100)}%`}
                      </span>
                    </div>
                  </td>
                  {durations.map((duration) => {
                    const avgDays = getAverageDays(duration);
                    const { dailyPrice, totalPrice } = calculateSeasonalPrice(
                      pricePerDay,
                      season.priceMultiplier,
                      avgDays,
                      duration.priceMultiplier
                    );
                    return (
                      <td
                        key={duration.id}
                        className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap hidden sm:table-cell text-left"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-bold text-gray-900">{Math.round(dailyPrice)}฿</span>
                          <span className="text-xs text-gray-500">per day</span>
                          <div className="mt-1 pt-1 border-t border-gray-200 w-full text-left">
                            <span className="font-semibold text-gray-900">{Math.round(totalPrice)}฿</span>
                            <span className="text-xs text-gray-500 block">for {avgDays} days</span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
