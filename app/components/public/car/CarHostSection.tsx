import { StarIcon } from "@heroicons/react/24/solid";
import { Link } from "react-router";
import type { CarFeatureItem } from "~/components/public/car/types";

interface CarHostSectionProps {
  companyName: string;
  ownerName: string | null;
  companySlug: string;
  hostTrips: number;
  hostJoinedAt: string | null;
  hostAvatarUrl: string | null;
  hostRating: number;
  features: CarFeatureItem[];
  specifications: string[];
}

export default function CarHostSection({
  companyName,
  ownerName,
  companySlug,
  hostTrips,
  hostJoinedAt,
  hostAvatarUrl,
  hostRating,
  features,
  specifications,
}: CarHostSectionProps) {
  const featureNames = features.map((item) => item.name.trim()).filter(Boolean);
  const merged = [...specifications, ...featureNames];
  const uniqueItems: string[] = [];
  const seen = new Set<string>();
  for (const item of merged) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(item);
    }
  }
  const chunkSize = Math.ceil(uniqueItems.length / 3);
  const columns = [
    uniqueItems.slice(0, chunkSize),
    uniqueItems.slice(chunkSize, chunkSize * 2),
    uniqueItems.slice(chunkSize * 2),
  ] as [string[], string[], string[]];

  const displayHostName = ownerName || companyName;

  return (
    <section className="space-y-5 bg-gray-50 p-4 rounded-2xl">
      <div className="flex items-center gap-4">
        <div className="relative">
          {hostAvatarUrl ? (
            <img
              src={hostAvatarUrl}
              alt={displayHostName}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 text-gray-800 flex items-center justify-center text-xl font-semibold">
              {displayHostName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute -bottom-2 left-2 bg-white rounded-full px-2 py-1 border border-gray-200 text-sm font-medium text-gray-800 flex items-center gap-1">
            {hostRating.toFixed(1)} <StarIcon className="w-4 h-4 text-green-600" />
          </div>
        </div>
        <div>
          <p className="text-xl font-semibold text-gray-800">{displayHostName}</p>
          <p className="text-sm text-gray-500">
            {hostTrips} trips
            {hostJoinedAt ? ` • Joined ${hostJoinedAt}` : ""}
          </p>
          <Link
            to={`/company/${companySlug}`}
            className="mt-2 inline-flex items-center rounded-lg border border-green-600 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
          >
            View all user cars
          </Link>
        </div>
      </div>

      {uniqueItems.length > 0 ? (
        <div className="pt-4 border-t border-gray-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-gray-800">
            {columns.map((items, columnIndex) => (
              <div key={`col-${columnIndex}`}>
              <div className="space-y-1">
                {items.map((value) => (
                  <p key={`spec-${value}`} className="text-sm">{value}</p>
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
