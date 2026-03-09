import DataTable, { type Column } from "~/components/dashboard/data-table/DataTable";
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
  const columns: Column<SeasonMatrixItem>[] = [
    {
      key: "seasonName",
      label: "Season",
      render: (season) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900 tracking-tight">{season.seasonName}</span>
          <span className="text-[11px] font-medium text-gray-400 mt-0.5 tabular-nums">
            {String(season.startMonth).padStart(2, "0")}/{String(season.startDay).padStart(2, "0")} - {String(season.endMonth).padStart(2, "0")}/{String(season.endDay).padStart(2, "0")}
          </span>
        </div>
      ),
      className: "min-w-[13rem]",
    },
    ...durations.map<Column<SeasonMatrixItem>>((duration) => ({
      key: `duration-${duration.id}`,
      label: duration.rangeName,
      render: (season) => {
        const avgDays = getAverageDays(duration);
        const { dailyPrice, totalPrice } = calculateSeasonalPrice(
          pricePerDay,
          season.priceMultiplier,
          avgDays,
          duration.priceMultiplier
        );

        return (
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-baseline gap-0.5">
              <span className="text-[10px] font-bold text-gray-400">{symbol}</span>
              <span className="text-base font-black text-gray-900 tabular-nums">
                {Math.round(dailyPrice).toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] font-bold text-gray-400">Per day</span>
            <div className="mt-2 pt-2 border-t border-gray-100 w-full flex flex-col items-start">
              <div className="flex items-baseline gap-0.5">
                <span className="text-[10px] font-bold text-gray-400">{symbol}</span>
                <span className="text-sm font-bold text-gray-700 tabular-nums">
                  {Math.round(totalPrice).toLocaleString()}
                </span>
              </div>
              <span className="text-[10px] font-medium text-gray-400">
                for {avgDays} days
              </span>
            </div>
          </div>
        );
      },
      className: "min-w-[10rem]",
    })),
  ];

  return (
    <div className="overflow-hidden">
      <DataTable data={seasons} columns={columns} pagination={false} />
      <p className="mt-3 text-[10px] text-gray-400 font-medium px-1 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Prices are calculated based on average duration in each range
      </p>
    </div>
  );
}
