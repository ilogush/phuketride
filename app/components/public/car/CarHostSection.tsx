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
  const uniqueFeatureNames: string[] = [];
  const seenFeatures = new Set<string>();
  for (const item of featureNames) {
    const key = item.toLowerCase();
    if (!seenFeatures.has(key)) {
      seenFeatures.add(key);
      uniqueFeatureNames.push(item);
    }
  }

  const displayHostName = ownerName || companyName;

  return (
    <section className="space-y-8 border-t border-gray-200 pt-8">
      <h3 className="text-xl font-semibold text-gray-800">Hosted by</h3>
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
          <p className="mt-1 text-base text-gray-600">
            All-Star Hosts like {displayHostName} are top-rated and experienced hosts on Phuket Ride.
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            {ownerName && ownerName.trim().toLowerCase() !== companyName.trim().toLowerCase() ? (
              <p className="text-xl font-semibold text-gray-800 whitespace-nowrap">{companyName}</p>
            ) : <span />}
            <Link
              to={`/company/${companySlug}`}
              className="text-sm text-green-700 underline hover:text-green-800 transition-colors"
            >
              View all user cars
            </Link>
          </div>
        </div>
      </div>

      {specifications.length || uniqueFeatureNames.length ? (
        <div className="space-y-6 border-t border-b border-gray-200 pt-8 pb-8">
          <h4 className="text-xl font-semibold text-gray-800">Vehicle features</h4>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 text-gray-900">
            <div className="space-y-2">
              {specifications.map((value) => (
                <p key={`spec-${value}`} className="text-base">{value}</p>
              ))}
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                {uniqueFeatureNames.map((value) => (
                  <p key={`feature-${value}`} className="text-base">{value}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
