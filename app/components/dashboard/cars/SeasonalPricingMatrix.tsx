import { calculateSeasonalPrice, getAverageDays } from "~/lib/pricing";
import { getCurrencySymbol } from "~/lib/formatters";

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
  currencyCode?: string;
}

export default function SeasonalPricingMatrix({ 
  pricePerDay, 
  seasons, 
  durations,
  currencyCode = "THB"
}: SeasonalPricingMatrixProps) {
  const symbol = getCurrencySymbol(currencyCode);

  return (
    <div className="overflow-hidden">
      <div className="border border-gray-100 rounded-[2rem] overflow-hidden bg-white shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="min-w-full divide-y divide-gray-50 bg-transparent">
            <thead>
              <tr className="bg-gray-50/30">
                <th scope="col" className="pl-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest sticky left-0 bg-gray-50/30 backdrop-blur-sm z-10">
                  <span>Season</span>
                </th>
                {durations.map((duration) => (
                  <th
                    key={duration.id}
                    scope="col"
                    className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[120px]"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-900">{duration.rangeName.split(" ")[0]}</span>
                      <span className="text-[10px] lowercase text-gray-400 font-medium">
                        {duration.rangeName.split(" ").slice(1).join(" ")}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {seasons.map((season) => (
                <tr key={season.id} className="group hover:bg-gray-50/50 transition-colors duration-200">
                  <td className="pl-6 py-4 text-sm text-gray-900 whitespace-nowrap sticky left-0 bg-white group-hover:bg-gray-50/50 z-10">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 tracking-tight">{season.seasonName}</span>
                      <span className="text-[11px] font-medium text-gray-400 mt-0.5 tabular-nums">
                        {String(season.startMonth).padStart(2, "0")}/{String(season.startDay).padStart(2, "0")} — {String(season.endMonth).padStart(2, "0")}/{String(season.endDay).padStart(2, "0")}
                      </span>
                      <div className="mt-1.5 inline-flex items-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          season.priceMultiplier > 1 
                            ? "bg-amber-50 text-amber-600" 
                            : "bg-emerald-50 text-emerald-600"
                        }`}>
                          {season.discountLabel || `${season.priceMultiplier > 1 ? "+" : ""}${Math.round((season.priceMultiplier - 1) * 100)}%`}
                        </span>
                      </div>
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
                        className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap"
                      >
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-[10px] font-bold text-gray-400">{symbol}</span>
                            <span className="text-base font-black text-gray-900 tabular-nums">
                              {Math.round(dailyPrice).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Per Day</span>
                          
                          <div className="mt-2 pt-2 border-t border-gray-100 w-full flex flex-col items-start">
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-[10px] font-bold text-gray-400">{symbol}</span>
                              <span className="text-sm font-bold text-gray-700 tabular-nums">
                                {Math.round(totalPrice).toLocaleString()}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-gray-400 lowercase">
                              for {avgDays} days
                            </span>
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
      <p className="mt-3 text-[10px] text-gray-400 font-medium px-1 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Prices are calculated based on average duration in each range
      </p>
    </div>
  );
}
