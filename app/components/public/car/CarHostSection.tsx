import { StarIcon } from "@heroicons/react/24/solid";
import type { CarFeatureItem } from "~/components/public/car/types";

interface CarHostSectionProps {
  title: string;
  year: number | null;
  hostName: string;
  hostTrips: number;
  hostJoinedAt: string | null;
  hostAvatarUrl: string | null;
  features: CarFeatureItem[];
  specifications: string[];
}

export default function CarHostSection({
  title,
  year,
  hostName,
  hostTrips,
  hostJoinedAt,
  hostAvatarUrl,
  features,
  specifications,
}: CarHostSectionProps) {
  const grouped = features.reduce<Record<string, string[]>>((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item.name);
    return acc;
  }, {});

  return (
    <section className="rounded-2xl border border-gray-200 p-4 space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          {hostAvatarUrl ? (
            <img
              src={hostAvatarUrl}
              alt={hostName}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 text-gray-800 flex items-center justify-center text-xl font-semibold">
              {hostName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute -bottom-2 left-2 bg-white rounded-full px-2 py-1 border border-gray-200 text-sm font-medium text-gray-800 flex items-center gap-1">
            5.0 <StarIcon className="w-4 h-4 text-indigo-600" />
          </div>
        </div>
        <div>
          <p className="text-xl font-semibold text-gray-800">{hostName}</p>
          <p className="text-sm text-gray-500">
            {hostTrips} trips
            {hostJoinedAt ? ` • Joined ${hostJoinedAt}` : ""}
          </p>
        </div>
      </div>

      {Object.keys(grouped).length > 0 || specifications.length > 0 ? (
        <div className="pt-4 border-t border-gray-200 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
            <span className="text-xl text-gray-500">{year ?? ""}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-gray-800">
            <div>
              <p className="font-semibold text-sm mb-1">Specifications</p>
              <div className="space-y-1">
                {specifications.map((value) => (
                  <p key={`spec-${value}`} className="text-sm">{value}</p>
                ))}
              </div>
            </div>

            {Object.entries(grouped).map(([category, values]) => (
              <div key={category}>
                <p className="font-semibold text-sm mb-1">{category}</p>
                <div className="space-y-1">
                  {values.map((value) => (
                    <p key={`${category}-${value}`} className="text-sm">{value}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
